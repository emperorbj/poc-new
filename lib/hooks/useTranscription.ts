// lib/hooks/useTranscription.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { transcriptionService } from '@/lib/api/transcription';
import { TranscriptionResult, TranscriptionMessage } from '@/types';

export function useTranscription() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([]);
  const [currentInterim, setCurrentInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [currentTranscriptId, setCurrentTranscriptId] = useState<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Int16Array[]>([]);
  const bufferFlushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunkCountRef = useRef(0);
  const droppedChunksRef = useRef(0);

  const connectWebSocket = useCallback(() => {
    transcriptionService.connect({
      onConnected: () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setError(null);
      },
      onDisconnected: () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
      },
      onTranscription: (message: TranscriptionMessage) => {
        handleTranscription(message);
      },
      onError: (errorMsg: string) => {
        console.error('❌ WebSocket error:', errorMsg);
        setError(errorMsg);
      },
    });
  }, []);

  const handleTranscription = (message: TranscriptionMessage) => {
    // Log the complete message object from websocket
    console.log('📨 Full WebSocket Transcription Message:', {
      type: message.type,
      transcript: message.transcript,
      is_final: message.is_final,
      confidence: message.confidence,
      speaker_tag: message.speaker_tag,
      transcript_id: message.transcript_id, // Log transcript_id specifically
      message: message.message,
      fullMessage: message, // Complete message object
    });

    // Store transcript_id from ANY message (not just final ones)
    // The backend might send it in interim messages too
    if (message.transcript_id) {
      setCurrentTranscriptId(message.transcript_id);
      console.log('📋 Transcript ID received:', message.transcript_id);
    } else {
      console.log('⚠️ No transcript_id in message - backend may not be sending it yet');
    }

    if (!message.transcript) return;

    if (message.is_final) {

      const newTranscription: TranscriptionResult = {
        id: Date.now().toString() + Math.random(),
        text: message.transcript,
        isFinal: true,
        confidence: message.confidence,
        speakerTag: message.speaker_tag,
        timestamp: new Date(),
        transcriptId: message.transcript_id,
      };

      setTranscriptions((prev) => {
        const updated = [...prev, newTranscription];
        // Log the complete accumulated transcription
        const fullTranscription = updated.map((t) => t.text).join(' ');
        console.log('📝 Final transcription added:', {
          newText: message.transcript,
          fullTranscription: fullTranscription,
          totalTranscriptions: updated.length,
          allTranscriptions: updated,
        });
        return updated;
      });
      setCurrentInterim('');
    } else {
      setCurrentInterim(message.transcript);
      console.log('💬 Interim transcription:', {
        text: message.transcript,
        confidence: message.confidence,
        speaker_tag: message.speaker_tag,
      });
    }
  };

  const startRecording = async () => {
    try {
      setError(null);

      // If already recording, don't start again
      if (isRecording) {
        console.log('⚠️ Already recording, ignoring start request');
        return;
      }

      // Connect WebSocket if not connected
      if (!isConnected && !transcriptionService.isConnected()) {
        console.log('🔌 Connecting WebSocket...');
        connectWebSocket();

        // Wait for connection with longer timeout
        let attempts = 0;
        const maxAttempts = 20; // Increased from 10 to 20 (10 seconds total)
        while (!transcriptionService.isConnected() && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
          // Log progress every 2 seconds
          if (attempts % 4 === 0) {
            console.log(`⏳ Still connecting... (${attempts * 0.5}s)`);
          }
        }
      }

      // Check WebSocket connection status
      if (!transcriptionService.isConnected()) {
        // If WebSocket was closed, try to reconnect
        console.log('🔄 WebSocket not connected, attempting to reconnect...');
        connectWebSocket();
        
        // Wait for reconnection
        let attempts = 0;
        const maxAttempts = 10;
        while (!transcriptionService.isConnected() && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }

        if (!transcriptionService.isConnected()) {
          const errorMsg = 'Failed to connect to transcription service. Please check your internet connection and try again.';
          console.error('❌', errorMsg);
          setError(errorMsg);
          setIsConnected(false);
          return;
        }
      }

      console.log('✅ WebSocket is connected, proceeding with microphone access...');

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone access is not available in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
      }

      // Clean up any existing audio resources before starting new ones
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
        } catch (err) {
          console.warn('⚠️ Error closing existing AudioContext:', err);
        }
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log('✅ Microphone access granted');

      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      streamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

      // Create audio processor using AudioWorklet
      const audioWorkletCode = `
        class AudioProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input.length > 0) {
              const channelData = input[0];
              const int16Data = new Int16Array(channelData.length);
              for (let i = 0; i < channelData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
              }
              this.port.postMessage(int16Data.buffer);
            }
            return true;
          }
        }
        registerProcessor('audio-processor', AudioProcessor);
      `;

      await audioContextRef.current.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob([audioWorkletCode], { type: 'application/javascript' })
        )
      );

      processorNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        'audio-processor'
      );

      // Buffer audio chunks and send in batches to avoid losing data
      // Target: ~20ms chunks (320 samples at 16kHz = 20ms)
      const TARGET_CHUNK_SIZE = 320 * 2; // 320 samples * 2 bytes per Int16 = 640 bytes
      const FLUSH_INTERVAL_MS = 20; // Flush buffer every 20ms
      
      // Function to flush buffered audio
      const flushAudioBuffer = () => {
        if (audioBufferRef.current.length === 0 || !transcriptionService.isConnected()) {
          return;
        }

        // Combine all buffered chunks into one
        const totalSamples = audioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
        if (totalSamples === 0) {
          audioBufferRef.current = [];
          return;
        }

        const combinedBuffer = new Int16Array(totalSamples);
        let offset = 0;
        
        for (const chunk of audioBufferRef.current) {
          combinedBuffer.set(chunk, offset);
          offset += chunk.length;
        }

        // Send the combined buffer
        transcriptionService.sendAudio(combinedBuffer.buffer);
        
        // Clear the buffer
        audioBufferRef.current = [];
      };
      
      processorNodeRef.current.port.onmessage = (event) => {
        if (!transcriptionService.isConnected()) {
          droppedChunksRef.current++;
          return;
        }

        const audioData = new Int16Array(event.data);
        audioBufferRef.current.push(audioData);
        audioChunkCountRef.current++;

        // Send immediately if buffer is large enough
        const totalSamples = audioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
        const totalBytes = totalSamples * 2; // 2 bytes per Int16 sample

        if (totalBytes >= TARGET_CHUNK_SIZE) {
          flushAudioBuffer();
        }
      };

      // Periodic flush to ensure no audio is lost even with small chunks
      bufferFlushIntervalRef.current = setInterval(() => {
        if (audioBufferRef.current.length > 0 && transcriptionService.isConnected()) {
          flushAudioBuffer();
        }
      }, FLUSH_INTERVAL_MS);

      streamSourceRef.current.connect(processorNodeRef.current);
      processorNodeRef.current.connect(audioContextRef.current.destination);

      setIsRecording(true);
      console.log('✅ Recording started');
    } catch (err) {
      console.error('❌ Error starting recording:', err);
      let errorMessage = 'Failed to start recording';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
        } else {
          errorMessage = err.message || 'Failed to start recording';
        }
      }
      
      setError(errorMessage);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('⏹️ Stopping recording...');

      // Clear flush interval
      if (bufferFlushIntervalRef.current) {
        clearInterval(bufferFlushIntervalRef.current);
        bufferFlushIntervalRef.current = null;
      }

      // Flush any remaining audio in buffer before stopping
      if (audioBufferRef.current.length > 0 && transcriptionService.isConnected()) {
        const totalSamples = audioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
        const combinedBuffer = new Int16Array(totalSamples);
        let offset = 0;
        
        for (const chunk of audioBufferRef.current) {
          combinedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        transcriptionService.sendAudio(combinedBuffer.buffer);
        audioBufferRef.current = [];
        console.log('📤 Flushed remaining audio buffer before stopping');
      }

      // Log statistics
      console.log('📊 Audio statistics:', {
        chunksProcessed: audioChunkCountRef.current,
        droppedChunks: droppedChunksRef.current,
      });

      // Disconnect audio processing nodes first
      if (processorNodeRef.current) {
        try {
          processorNodeRef.current.disconnect();
        } catch (err) {
          console.warn('⚠️ Error disconnecting processor node:', err);
        }
        processorNodeRef.current = null;
      }

      if (streamSourceRef.current) {
        try {
          streamSourceRef.current.disconnect();
        } catch (err) {
          console.warn('⚠️ Error disconnecting stream source:', err);
        }
        streamSourceRef.current = null;
      }

      // Stop media stream tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log('🛑 Stopped media track:', track.kind);
        });
        mediaStreamRef.current = null;
      }

      // Close AudioContext (async operation)
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
            console.log('✅ AudioContext closed');
          }
        } catch (err) {
          console.warn('⚠️ Error closing AudioContext:', err);
        }
        audioContextRef.current = null;
      }

      // Reset counters
      audioChunkCountRef.current = 0;
      droppedChunksRef.current = 0;
      audioBufferRef.current = [];

      setIsRecording(false);
      console.log('✅ Recording stopped (WebSocket remains connected for smooth restart)');
    } catch (err) {
      console.error('❌ Error stopping recording:', err);
      setIsRecording(false);
    }
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
    setCurrentInterim('');
    setSummary(null);
    setCurrentTranscriptId(null);
    setSummaryError(null);
  };

  const fetchSummary = async (transcriptId?: number, accessToken?: string) => {
    const idToUse = transcriptId || currentTranscriptId;
    
    if (!idToUse) {
      setSummaryError('No transcript ID available. Please ensure transcription is complete.');
      return;
    }

    try {
      setIsLoadingSummary(true);
      setSummaryError(null);
      console.log('📤 Fetching summary for transcript_id:', idToUse);
      
      const summaryData = await transcriptionService.getSummary(idToUse, accessToken);
      
      // Store the summary data (can be string or structured object)
      setSummary(summaryData);
      console.log('✅ Summary received:', summaryData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch summary';
      console.error('❌ Error fetching summary:', err);
      setSummaryError(errorMessage);
      setSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      transcriptionService.disconnect();
    };
  }, []);

  return {
    isConnected,
    isRecording,
    transcriptions,
    currentInterim,
    error,
    summary,
    isLoadingSummary,
    summaryError,
    currentTranscriptId,
    startRecording,
    stopRecording,
    clearTranscriptions,
    fetchSummary,
  };
}
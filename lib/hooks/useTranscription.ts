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

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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
      message: message.message,
      fullMessage: message, // Complete message object
    });

    if (!message.transcript) return;

    if (message.is_final) {
      const newTranscription: TranscriptionResult = {
        id: Date.now().toString() + Math.random(),
        text: message.transcript,
        isFinal: true,
        confidence: message.confidence,
        speakerTag: message.speaker_tag,
        timestamp: new Date(),
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

      if (!transcriptionService.isConnected()) {
        const errorMsg = 'Failed to connect to transcription service. Please check your internet connection and try again.';
        console.error('❌', errorMsg);
        setError(errorMsg);
        setIsConnected(false);
        return;
      }

      console.log('✅ WebSocket is connected, proceeding with microphone access...');

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone access is not available in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
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

      processorNodeRef.current.port.onmessage = (event) => {
        if (transcriptionService.isConnected()) {
          transcriptionService.sendAudio(event.data);
        }
      };

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

  const stopRecording = () => {
    try {
      console.log('⏹️ Stopping recording...');

      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
        processorNodeRef.current = null;
      }
      if (streamSourceRef.current) {
        streamSourceRef.current.disconnect();
        streamSourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      setIsRecording(false);
      console.log('✅ Recording stopped');
    } catch (err) {
      console.error('❌ Error stopping recording:', err);
    }
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
    setCurrentInterim('');
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
    startRecording,
    stopRecording,
    clearTranscriptions,
  };
}
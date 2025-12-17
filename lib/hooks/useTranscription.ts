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

      setTranscriptions((prev) => [...prev, newTranscription]);
      setCurrentInterim('');
      console.log('📝 Final transcription:', message.transcript);
    } else {
      setCurrentInterim(message.transcript);
      console.log('💬 Interim transcription:', message.transcript);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);

      // Connect WebSocket if not connected
      if (!isConnected && !transcriptionService.isConnected()) {
        console.log('🔌 Connecting WebSocket...');
        connectWebSocket();

        // Wait for connection
        let attempts = 0;
        const maxAttempts = 10;
        while (!transcriptionService.isConnected() && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }
      }

      if (!transcriptionService.isConnected()) {
        setError('Failed to connect to transcription service');
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
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
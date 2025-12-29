// lib/hooks/useTranscription.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { transcriptionService } from '@/lib/api/transcription';
import { TranscriptionResult, TranscriptionMessage, DiarizedUtterance } from '@/types';

// Helper function to extract clean transcript from interim messages
// Removes [SPEAKER1] or [SPEAKER_X]: prefixes and deduplicates incremental lines
// Handles both [SPEAKER1] and [SPEAKER_1]: formats
function extractCleanTranscript(transcript: string): string {
  if (!transcript) return '';
  
  // Split by newlines and get unique lines (keeping last occurrence of each unique content)
  const lines = transcript.split('\n').filter(line => line.trim());
  const seen = new Set<string>();
  const uniqueLines: string[] = [];
  
  // Process in reverse to keep the final version of each line
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Remove [SPEAKER1] or [SPEAKER_X]: prefix (handles both formats)
    // Pattern: [SPEAKER1] or [SPEAKER_1]: followed by optional colon and space
    const cleanLine = line.replace(/^\[SPEAKER_?\d+\]:?\s*/, '');
    
    // Use a simple key to deduplicate (just the text without speaker tag)
    if (!seen.has(cleanLine)) {
      seen.add(cleanLine);
      uniqueLines.unshift(cleanLine); // Add to beginning to maintain order
    }
  }
  
  // Join unique lines, but only keep the final complete sentences
  // Filter out incomplete lines that are prefixes of later lines
  const finalLines: string[] = [];
  for (let i = 0; i < uniqueLines.length; i++) {
    const current = uniqueLines[i];
    // Check if this line is a prefix of a later line
    const isPrefix = uniqueLines.slice(i + 1).some(later => later.startsWith(current));
    if (!isPrefix) {
      finalLines.push(current);
    }
  }
  
  return finalLines.join(' ').trim() || uniqueLines.join(' ').trim();
}

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
  
  // Simplified state matching Transcribe.tsx pattern
  const [liveTranscript, setLiveTranscript] = useState(''); // Streaming transcript (plain text, accumulated by BE)
  const [diarizedUtterances, setDiarizedUtterances] = useState<DiarizedUtterance[]>([]); // Final diarized transcript (structured)

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Helper function to map speaker tag to label
  const getSpeakerLabel = (speaker: string | number | undefined): string => {
    if (!speaker) return 'Speaker';
    const speakerStr = String(speaker).toUpperCase();
    if (speakerStr === 'A' || speakerStr === '1') return 'Doctor';
    if (speakerStr === 'B' || speakerStr === '2') return 'Patient';
    return `Speaker ${speaker}`;
  };

  const handleTranscription = (message: TranscriptionMessage) => {
    // Log the complete message object from websocket
    console.log('📨 Full WebSocket Transcription Message:', {
      type: message.type,
      transcript: message.transcript,
      is_final: message.is_final,
      confidence: message.confidence,
      speaker_tag: message.speaker_tag,
      transcript_id: message.transcript_id,
      message: message.message,
      hasUtterances: !!message.utterances,
      utterancesCount: message.utterances?.length || 0,
      fullMessage: message,
    });

    // Store transcript_id from ANY message
    if (message.transcript_id) {
      setCurrentTranscriptId(message.transcript_id);
      console.log('📋 Transcript ID received:', message.transcript_id);
    }

    // Handle status messages
    // if (message.type === 'status') {
    //   console.log('📊 Status message:', message.message);
    //   return;
    // }

    /**
     * STREAMING - Matching Transcribe.tsx pattern
     * Backend sends the FULL transcript every time.
     * We render ONLY finalized content (when is_final is true).
     */
    if (message.type === 'interim' && message.is_final) {
      console.log('💬 Streaming transcript (interim + is_final):', {
        transcript: message.transcript?.substring(0, 100) + '...',
        length: message.transcript?.length || 0,
      });
      setLiveTranscript(message.transcript || '');
      setCurrentInterim(message.transcript || ''); // Also set for backward compatibility
      return;
    }

    /**
     * FINAL DIARIZED TRANSCRIPT - Matching Transcribe.tsx pattern
     * This REPLACES streaming transcript entirely.
     */
    if (message.type === 'diarized_transcript') {
      console.log('🎯 Processing diarized transcript with', message.utterances?.length || 0, 'utterances');
      
      if (message.utterances && message.utterances.length > 0) {
        // Replace utterances (like Transcribe.tsx)
        setDiarizedUtterances(message.utterances);
        setLiveTranscript(''); // streaming phase ends here
        
        // Also convert to TranscriptionResult format for backward compatibility
        message.utterances.forEach((utterance) => {
          const newTranscription: TranscriptionResult = {
            id: Date.now().toString() + Math.random(),
            text: utterance.text,
            isFinal: true,
            confidence: utterance.confidence || message.confidence,
            speakerTag: utterance.speaker === 'A' ? 1 : utterance.speaker === 'B' ? 2 : undefined,
            speaker: utterance.speaker,
            timestamp: new Date(),
            transcriptId: message.transcript_id,
          };
          setTranscriptions((prev) => {
            // Check if this utterance already exists (avoid duplicates)
            const exists = prev.some(t => 
              t.text === utterance.text && 
              t.speaker === utterance.speaker &&
              Math.abs(t.timestamp.getTime() - newTranscription.timestamp.getTime()) < 1000
            );
            if (exists) return prev;
            return [...prev, newTranscription];
          });
        });
      }
      return;
    }

    /**
     * SUMMARY - Matching Transcribe.tsx pattern
     */
    if (message.type === 'summary') {
      console.log('📄 Summary received via WebSocket');
      const summaryData = typeof message.summary === 'string'
        ? JSON.parse(message.summary)
        : message.summary;
      setSummary(summaryData);
      setIsLoadingSummary(false);
      return;
    }

    // Handle error messages
    if (message.type === 'error') {
      console.error('❌ Server error:', message.message);
      setError(message.message || 'Unknown server error');
      return;
    }

    // Handle other interim messages (non-final) - show as live transcript during recording
    if (message.type === 'interim' && !message.is_final && isRecording) {
      console.log('💬 Interim update (non-final, during recording):', {
        transcript: message.transcript?.substring(0, 100) + '...',
      });
      setLiveTranscript(message.transcript || '');
      setCurrentInterim(message.transcript || '');
      return;
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setSummary(null);
      setSummaryError(null);
      setIsLoadingSummary(false);

      // If already recording, don't start again
      if (isRecording) {
        console.log('⚠️ Already recording, ignoring start request');
        return;
      }

      // Create WebSocket inside startRecording (like demo.html)
      console.log('🔌 Creating WebSocket connection...');
      
      // Wait for WebSocket connection before proceeding
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

        transcriptionService.setRecordingState(true);
        transcriptionService.connect({
          onConnected: () => {
            console.log('✅ WebSocket connected');
            setIsConnected(true);
            setError(null);
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve();
            }
          },
          onDisconnected: () => {
            console.log('🔌 WebSocket disconnected');
            setIsConnected(false);
          },
          onInterim: (transcript: string) => {
            // Handle interim messages (like demo.html - replaces text)
            console.log('💬 onInterim callback called:', {
              transcript: transcript.substring(0, 100) + '...',
              length: transcript.length,
            });
            setLiveTranscript(transcript);
            setCurrentInterim(transcript);
            console.log('✅ Updated live transcript state via onInterim callback');
          },
          onSummary: (summaryData: any) => {
            // Handle summary received via WebSocket (like demo.html)
            console.log('✅ Summary received via WebSocket:', summaryData);
            setSummary(summaryData);
            setIsLoadingSummary(false);
            setIsConnected(false); // WebSocket closes after summary
          },
          onTranscription: (message: TranscriptionMessage) => {
            handleTranscription(message);
          },
          onError: (errorMsg: string) => {
            console.error('❌ WebSocket error:', errorMsg);
            setError(errorMsg);
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              reject(new Error(errorMsg));
            }
          },
        });
      });

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

      // Request microphone access (exactly like demo.html - simple { audio: true })
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      console.log('✅ Microphone access granted');
      const audioTrack = stream.getAudioTracks()[0];
      const trackSettings = audioTrack?.getSettings();
      console.log('🎤 Audio track settings:', {
        channelCount: trackSettings?.channelCount,
        sampleRate: trackSettings?.sampleRate,
        echoCancellation: trackSettings?.echoCancellation,
        noiseSuppression: trackSettings?.noiseSuppression,
        autoGainControl: trackSettings?.autoGainControl,
      });
      console.log('✅ Expected: channelCount=1 (mono), sampleRate=16000 (16kHz)');

      mediaStreamRef.current = stream;
      // Ensure AudioContext is exactly 16kHz for PCM16, mono
      audioContextRef.current = new AudioContext({ 
        sampleRate: 16000,
        // Ensure we're working with the correct sample rate
      });
      
      console.log('🎚️ AudioContext created:', {
        sampleRate: audioContextRef.current.sampleRate,
        state: audioContextRef.current.state,
        expectedSampleRate: 16000,
        sampleRateMatch: audioContextRef.current.sampleRate === 16000,
      });
      console.log('✅ Audio format: PCM16, mono, 16kHz');
      
      streamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

      // Use ScriptProcessor exactly like demo.html (4096 buffer size)
      // This matches the demo.html implementation that works
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      // Helper function to convert Float32 to Int16 PCM (exactly like demo.html)
      const convertTo16Bit = (buffer: Float32Array): ArrayBuffer => {
        let l = buffer.length;
        let buf = new Int16Array(l);
        while (l--) {
          buf[l] = Math.max(-1, Math.min(1, buffer[l])) * 0x7FFF;
        }
        return buf.buffer;
      };

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const left = e.inputBuffer.getChannelData(0);
        const pcm16 = convertTo16Bit(left);
        if (transcriptionService.isConnected()) {
          transcriptionService.sendAudio(pcm16);
        }
      };

      processorNodeRef.current = processor;
      
      console.log('🎤 ScriptProcessor created (4096 buffer, matching demo.html)');

      if (streamSourceRef.current && processorNodeRef.current && audioContextRef.current) {
        streamSourceRef.current.connect(processorNodeRef.current);
        processorNodeRef.current.connect(audioContextRef.current.destination);
        console.log('✅ Audio pipeline connected (matching demo.html setup)');
      }

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

      // Stop audio processing first
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
        });
        mediaStreamRef.current = null;
      }

      // Close AudioContext
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
          }
        } catch (err) {
          console.warn('⚠️ Error closing AudioContext:', err);
        }
        audioContextRef.current = null;
      }

      setIsRecording(false);

      // Send end_session signal to trigger summary generation (like demo.html)
      if (transcriptionService.isConnected()) {
        transcriptionService.setRecordingState(false);
        transcriptionService.sendEndSession();
        setIsLoadingSummary(true);
        setSummaryError(null);
        console.log('📤 Sent end_session signal, waiting for summary...');
      } else {
        console.warn('⚠️ WebSocket not connected, cannot send end_session signal');
      }

      console.log('✅ Recording stopped');
    } catch (err) {
      console.error('❌ Error stopping recording:', err);
      setIsRecording(false);
    }
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
    setCurrentInterim('');
    setLiveTranscript('');
    setDiarizedUtterances([]);
    setSummary(null);
    setCurrentTranscriptId(null);
    setSummaryError(null);
    setIsLoadingSummary(false);
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
    currentInterim: liveTranscript || currentInterim, // Use liveTranscript (matching Transcribe.tsx pattern)
    liveTranscript, // Expose liveTranscript directly (matching Transcribe.tsx)
    diarizedUtterances, // Structured diarized utterances (matching Transcribe.tsx)
    error,
    summary,
    isLoadingSummary,
    summaryError,
    currentTranscriptId,
    startRecording,
    stopRecording,
    clearTranscriptions,
  };
}
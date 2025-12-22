// lib/api/transcription.ts

import { WS_ENDPOINTS, API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import { TranscriptionMessage } from '@/types';

export interface TranscriptionCallbacks {
  onTranscription: (message: TranscriptionMessage) => void;
  onInterim?: (transcript: string) => void;
  onSummary?: (summary: any) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
}

class TranscriptionService {
  private ws: WebSocket | null = null;
  private callbacks: TranscriptionCallbacks | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isIntentionalDisconnect = false;
  private audioChunkCount = 0;

  connect(callbacks: TranscriptionCallbacks, wsUrl?: string): void {
    this.callbacks = callbacks;
    this.isIntentionalDisconnect = false;
    this.connectWebSocket(wsUrl);
  }

  private connectWebSocket(wsUrl?: string): void {
    try {
      if (typeof WebSocket === 'undefined') {
        const errorMsg = 'WebSocket is not available in this environment';
        console.error('❌', errorMsg);
        this.callbacks?.onError(errorMsg);
        return;
      }

      // Use provided URL or fall back to relative URL (like demo.html)
      const url = wsUrl || this.getRelativeWebSocketUrl();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔌 WebSocket Connection Setup');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔗 WebSocket URL:', url);
      console.log('✅ Expected URL: wss://meera-bot-v2.onrender.com/api/v1/transcription/ws/transcribe');
      console.log('✅ URL Match:', url === 'wss://meera-bot-v2.onrender.com/api/v1/transcription/ws/transcribe');
      console.log('🌐 Current origin:', typeof window !== 'undefined' ? window.location.origin : 'SSR');

      // Create WebSocket connection (simple like demo.html)
      // The demo.html works, so we'll match its simplicity
      this.ws = new WebSocket(url);
      console.log('✅ WebSocket object created, waiting for connection...');

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        console.log('🔍 WebSocket details:', {
          readyState: this.ws?.readyState,
          url: this.ws?.url,
          protocol: this.ws?.protocol,
        });
        this.reconnectAttempts = 0;
        this.callbacks?.onConnected();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📥 WebSocket RESPONSE RECEIVED');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📦 Raw message info:', {
            dataType: typeof event.data,
            isArrayBuffer: event.data instanceof ArrayBuffer,
            isBlob: event.data instanceof Blob,
            isString: typeof event.data === 'string',
            dataLength: event.data instanceof ArrayBuffer ? event.data.byteLength : 
                       event.data instanceof Blob ? event.data.size :
                       typeof event.data === 'string' ? event.data.length : 'unknown',
            readyState: this.ws?.readyState,
          });

          let data: string;
          if (typeof event.data === 'string') {
            data = event.data;
            console.log('📝 Full string response:', data);
            console.log('📝 Response length:', data.length, 'characters');
            try {
              const parsed = JSON.parse(data);
              console.log('✅ Parsed JSON response:', parsed);
              console.log('📋 Response type:', parsed.type);
              if (parsed.transcript) {
                console.log('💬 Transcript:', parsed.transcript.substring(0, 200) + (parsed.transcript.length > 200 ? '...' : ''));
              }
              if (parsed.summary) {
                console.log('📄 Summary received:', parsed.summary);
              }
            } catch (parseError) {
              console.warn('⚠️ Response is not valid JSON:', parseError);
            }
            this.handleMessage(data);
          } else if (event.data instanceof ArrayBuffer) {
            console.log('📦 Received ArrayBuffer, decoding to string...');
            const decoder = new TextDecoder();
            data = decoder.decode(event.data);
            console.log('📝 Decoded ArrayBuffer response:', data);
            console.log('📝 Response length:', data.length, 'characters');
            try {
              const parsed = JSON.parse(data);
              console.log('✅ Parsed JSON response:', parsed);
            } catch (parseError) {
              console.warn('⚠️ Response is not valid JSON:', parseError);
            }
            this.handleMessage(data);
          } else if (event.data instanceof Blob) {
            console.log('📦 Received Blob, reading as text...');
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                console.log('📝 Blob converted to string response:', reader.result);
                console.log('📝 Response length:', reader.result.length, 'characters');
                try {
                  const parsed = JSON.parse(reader.result);
                  console.log('✅ Parsed JSON response:', parsed);
                } catch (parseError) {
                  console.warn('⚠️ Response is not valid JSON:', parseError);
                }
                this.handleMessage(reader.result);
              } else {
                console.error('❌ Blob reader result is not a string:', typeof reader.result);
              }
            };
            reader.onerror = (err) => {
              console.error('❌ Error reading Blob:', err);
            };
            reader.readAsText(event.data);
            return;
          } else {
            console.warn('⚠️ Unknown message type:', typeof event.data, event.data);
            return;
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } catch (error) {
          console.error('❌ Error processing WebSocket response:', error);
          console.error('Error details:', {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            eventData: event.data,
            eventDataType: typeof event.data,
          });
          this.callbacks?.onError('Failed to process transcription message');
        }
      };

      this.ws.onerror = (error: Event) => {
        const readyState = this.ws?.readyState;
        const readyStateText = readyState === WebSocket.CONNECTING ? 'CONNECTING' :
                              readyState === WebSocket.OPEN ? 'OPEN' :
                              readyState === WebSocket.CLOSING ? 'CLOSING' :
                              readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN';
        
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ WebSocket ERROR');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Error details:', {
          readyState,
          readyStateText,
          error,
          errorType: error.type,
          target: error.target,
          url: this.ws?.url,
        });
        
        // Try to get more error info from the WebSocket
        if (this.ws) {
          console.error('WebSocket state:', {
            url: this.ws.url,
            readyState: this.ws.readyState,
            protocol: this.ws.protocol,
            extensions: this.ws.extensions,
          });
        }
        
        if (readyState === WebSocket.CONNECTING || readyState === WebSocket.CLOSED) {
          console.error('❌ WebSocket connection failed - cannot connect to server');
          console.error('💡 Possible causes:');
          console.error('   1. Server is down or not responding');
          console.error('   2. CORS/Origin restrictions on WebSocket');
          console.error('   3. Network/firewall blocking WebSocket connection');
          console.error('   4. Invalid WebSocket URL');
          this.callbacks?.onError('Failed to connect to transcription service. Please check your network connection and try again.');
        } else {
          // For other errors, just log but don't stop transcription
          // The backend may send error messages via onmessage instead
          console.warn('⚠️ WebSocket error (state:', readyStateText, ') - continuing anyway');
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        const closeInfo = {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
        };

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔌 WebSocket CLOSED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Close details:', closeInfo);
        
        // WebSocket close codes reference
        const closeCodeMeanings: Record<number, string> = {
          1000: 'Normal Closure',
          1001: 'Going Away',
          1002: 'Protocol Error',
          1003: 'Unsupported Data',
          1006: 'Abnormal Closure (no close frame received)',
          1007: 'Invalid Data',
          1008: 'Policy Violation',
          1009: 'Message Too Big',
          1010: 'Mandatory Extension',
          1011: 'Internal Server Error',
          1012: 'Service Restart',
          1013: 'Try Again Later',
          1014: 'Bad Gateway',
          1015: 'TLS Handshake Failed',
        };
        
        const codeMeaning = closeCodeMeanings[event.code] || 'Unknown';
        console.log('Close code meaning:', codeMeaning);
        
        if (event.code === 1006) {
          console.warn('⚠️ WebSocket closed abnormally (1006) - Connection lost without proper close handshake');
          console.warn('💡 This usually means:');
          console.warn('   - Network connection was interrupted');
          console.warn('   - Server crashed or closed connection unexpectedly');
          console.warn('   - Firewall/proxy blocking the connection');
          console.warn('   - Server is not accepting WebSocket connections from this origin');
          console.warn('   - Server might be checking Origin header and rejecting localhost:3000');
          if (typeof window !== 'undefined') {
            console.warn('   - Current origin:', window.location.origin);
            console.warn('   - Server might only accept connections from meera-bot-v2.onrender.com');
          }
        } else if (!event.wasClean) {
          console.warn('⚠️ WebSocket closed uncleanly');
        } else {
          console.log('✅ WebSocket closed cleanly');
        }

        this.callbacks?.onDisconnected();

        if (
          !this.isIntentionalDisconnect &&
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.reconnectAttempts++;
          const delay = 2000 * this.reconnectAttempts;
          console.log(
            `🔄 Reconnecting in ${delay}ms... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
          );

          this.reconnectTimeout = setTimeout(() => {
            this.connectWebSocket();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          const errorMsg = `Failed to reconnect after ${this.maxReconnectAttempts} attempts`;
          console.error('❌', errorMsg);
          this.callbacks?.onError(errorMsg);
        }
      };
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create WebSocket connection';
      this.callbacks?.onError(errorMessage);
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: TranscriptionMessage = JSON.parse(data);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 Processing WebSocket Response');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📨 Message details:', {
        type: message.type,
        hasTranscript: !!message.transcript,
        transcriptLength: message.transcript?.length || 0,
        is_final: message.is_final,
        hasSummary: !!message.summary,
        transcript_id: message.transcript_id,
        confidence: message.confidence,
        speaker_tag: message.speaker_tag,
      });
      console.log('📋 Full message object:', JSON.stringify(message, null, 2));
      if (message.transcript) {
        console.log('💬 Transcript content:', message.transcript);
      }
      if (message.summary) {
        console.log('📄 Summary content:', typeof message.summary === 'string' ? message.summary : JSON.stringify(message.summary, null, 2));
      }

      if (message.type === 'interim') {
        // Handle interim transcription (like demo.html)
        console.log('🔵 Processing as type: interim');
        const transcript = message.transcript || '';
        console.log('📝 Calling onInterim with transcript:', transcript.substring(0, 100) + '...');
        this.callbacks?.onInterim?.(transcript);
        // Also call onTranscription for backward compatibility
        this.callbacks?.onTranscription(message);
      } else if (message.type === 'summary') {
        // Handle summary (like demo.html)
        console.log('✅ Summary received via WebSocket');
        // Parse summary if it's a string (like demo.html does)
        let summaryData = message.summary;
        if (typeof summaryData === 'string') {
          try {
            summaryData = JSON.parse(summaryData);
            console.log('✅ Parsed summary from string:', summaryData);
          } catch (e) {
            console.warn('⚠️ Summary is string but not valid JSON, using as-is');
          }
        }
        this.callbacks?.onSummary?.(summaryData);
        // Close WebSocket after receiving summary (like demo.html)
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.close(1000, 'Summary received');
        }
      } else if (message.type === 'transcription') {
        // Handle transcription messages (can be interim or final based on is_final flag)
        console.log('🔵 Processing as type: transcription', {
          is_final: message.is_final,
          hasTranscript: !!message.transcript,
        });
        this.callbacks?.onTranscription(message);
      } else if (message.type === 'error') {
        const errorMessage = message.message || 'Unknown server error';
        console.error('❌ Server error:', errorMessage);
        
        // Check if it's the detected_language error - we can continue despite this
        if (errorMessage.includes('detected_language')) {
          console.warn('⚠️ detected_language error detected - continuing transcription anyway');
          // Don't call onError for this specific error, just log it
          // This allows transcription to continue
          return;
        }
        
        this.callbacks?.onError(errorMessage);
      } else {
        console.warn('⚠️ Unknown message type:', message.type);
        console.log('📋 Unknown message full object:', message);
      }
      console.log('✅ Message processing complete');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ Error parsing WebSocket response:', error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Raw message data:', data);
      console.error('❌ Raw message data (first 500 chars):', data.substring(0, 500));
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.callbacks?.onError('Failed to parse transcription message');
    }
  }

  private getRelativeWebSocketUrl(): string {
    // Use the deployed backend URL (meera-bot-v2.onrender.com)
    // The demo.html uses window.location.host because it's served from the same server
    // But our Next.js app is separate, so we use the external backend URL
    console.log('🔗 Using deployed WebSocket URL:', WS_ENDPOINTS.TRANSCRIPTION);
    return WS_ENDPOINTS.TRANSCRIPTION;
  }

  sendAudio(audioBuffer: ArrayBuffer): void {
    if (!this.ws) {
      console.warn('⚠️ WebSocket not initialized, cannot send audio');
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not open (state:', this.ws.readyState, '), cannot send audio');
      return;
    }

    // Track audio chunks for logging
    this.audioChunkCount++;
    
    // Log every 50th chunk to track that audio is being sent
    if (this.audioChunkCount % 50 === 0) {
      const int16View = new Int16Array(audioBuffer);
      console.log('🎤 Sending PCM16 audio chunk:', {
        chunkNumber: this.audioChunkCount,
        bufferSize: audioBuffer.byteLength,
        sampleCount: int16View.length,
        format: 'PCM16, mono, 16kHz',
        firstFewSamples: Array.from(int16View.slice(0, 5)), // First 5 samples for verification
        isConnected: this.isConnected(),
        readyState: this.ws?.readyState,
      });
    }

    try {
      // Send PCM16 buffer immediately like demo.html (no buffering)
      // Format: PCM16 (Int16Array), mono, 16kHz
      this.ws.send(audioBuffer);
    } catch (error) {
      console.error('❌ Error sending audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send audio data';
      // Don't call onError for send failures - just log it
      // This prevents the error from stopping transcription
      console.warn('⚠️ Audio send failed but continuing:', errorMessage);
    }
  }

  sendEndSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not open, cannot send end_session signal');
      return;
    }

    try {
      console.log('📤 Sending end_session signal to trigger summary generation');
      this.ws.send(JSON.stringify({ type: 'end_session' }));
    } catch (error) {
      console.error('❌ Error sending end_session signal:', error);
    }
  }

  disconnect(): void {
    this.isIntentionalDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      try {
        if (
          this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING
        ) {
          this.ws.close(1000, 'Client disconnecting');
        }
      } catch (error) {
        console.warn('⚠️ Error closing WebSocket:', error);
      }
      this.ws = null;
    }

    this.callbacks = null;
    this.reconnectAttempts = 0;
    console.log('🔌 Disconnected from WebSocket');
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getReadyState(): number | null {
    return this.ws?.readyState ?? null;
  }

  async getSummary(transcriptId: number, accessToken?: string): Promise<any> {
    try {
      // Validate transcriptId
      if (!transcriptId || isNaN(transcriptId) || transcriptId <= 0) {
        throw new Error('Invalid transcript ID. Must be a positive number.');
      }

      // Use Next.js API route for client-side requests
      const isClient = typeof window !== 'undefined';
      const url = isClient
        ? `/api/transcription/summary/${transcriptId}`
        : `${API_BASE_URL}${API_ENDPOINTS.TRANSCRIPTION_SUMMARY}/${transcriptId}`;
      
      console.log('📤 Fetching summary for transcript_id:', transcriptId, 'URL:', url);

      const headers: HeadersInit = {
        Accept: 'application/json',
      };

      // Add authorization if token is provided (only for client-side)
      if (accessToken && isClient) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!response.ok) {
        let error: any;
        try {
          error = await response.json();
        } catch {
          const text = await response.text();
          error = { detail: `Failed to fetch summary: ${response.statusText}`, rawResponse: text };
        }

        console.error('❌ Summary API error response:', {
          status: response.status,
          statusText: response.statusText,
          error,
          url,
        });

        if (response.status === 404) {
          throw new Error('Summary not found for this transcription');
        }
        if (response.status === 400) {
          // Check if it's the "Transcript ID is required" error from our API route
          const errorMessage = error.detail || error.message || 'Invalid request';
          throw new Error(errorMessage);
        }
        if (response.status === 422) {
          throw new Error(error.detail?.[0]?.msg || error.detail || 'Invalid transcript ID');
        }
        throw new Error(error.detail || error.message || `Failed to fetch summary: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Summary fetched successfully:', data);
      
      // Return the data as-is - it should match SessionSummary structure
      return data;
    } catch (error) {
      console.error('❌ Error fetching summary:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch summary');
    }
  }
}

export const transcriptionService = new TranscriptionService();
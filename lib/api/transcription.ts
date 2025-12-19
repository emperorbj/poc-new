// lib/api/transcription.ts

import { WS_ENDPOINTS, API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import { TranscriptionMessage } from '@/types';

export interface TranscriptionCallbacks {
  onTranscription: (message: TranscriptionMessage) => void;
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

  connect(callbacks: TranscriptionCallbacks): void {
    this.callbacks = callbacks;
    this.isIntentionalDisconnect = false;
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    try {
      if (typeof WebSocket === 'undefined') {
        const errorMsg = 'WebSocket is not available in this environment';
        console.error('❌', errorMsg);
        this.callbacks?.onError(errorMsg);
        return;
      }

      const wsUrl = WS_ENDPOINTS.TRANSCRIPTION;
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.callbacks?.onConnected();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          console.log('📥 Received WebSocket message');

          let data: string;
          if (typeof event.data === 'string') {
            data = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder();
            data = decoder.decode(event.data);
          } else if (event.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                this.handleMessage(reader.result);
              }
            };
            reader.onerror = (err) => {
              console.error('❌ Error reading Blob:', err);
            };
            reader.readAsText(event.data);
            return;
          } else {
            console.warn('⚠️ Unknown message type:', typeof event.data);
            return;
          }

          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          this.callbacks?.onError('Failed to process transcription message');
        }
      };

      this.ws.onerror = (error: Event) => {
        const readyState = this.ws?.readyState;
        if (readyState === WebSocket.CONNECTING) {
          console.error('❌ WebSocket connection failed');
          this.callbacks?.onError('Failed to connect to transcription service');
        } else {
          // For other errors, just log but don't stop transcription
          // The backend may send error messages via onmessage instead
          console.warn('⚠️ WebSocket error (state:', readyState, ') - continuing anyway');
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        const closeInfo = {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
        };

        if (event.code === 1006) {
          console.warn('⚠️ WebSocket closed abnormally (1006):', closeInfo.reason);
        } else {
          console.log('🔌 WebSocket closed:', closeInfo);
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
      console.log('📨 Received message:', message);

      if (message.type === 'transcription') {
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
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      console.error('Raw message data:', data);
      this.callbacks?.onError('Failed to parse transcription message');
    }
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

    try {
      // Reduce logging frequency to avoid performance issues
      // Only log every 10th chunk or if chunk is unusually large/small
      const shouldLog = Math.random() < 0.1 || audioBuffer.byteLength > 5000 || audioBuffer.byteLength < 100;
      
      if (shouldLog) {
        console.log('📤 Sending audio chunk:', {
          size: audioBuffer.byteLength,
          samples: audioBuffer.byteLength / 2, // Int16 = 2 bytes per sample
          duration_ms: (audioBuffer.byteLength / 2) / 16, // 16kHz = 16000 samples per second
          readyState: this.ws.readyState,
        });
      }

      this.ws.send(audioBuffer);
      
      if (shouldLog) {
        console.log('✅ Audio chunk sent successfully');
      }
    } catch (error) {
      console.error('❌ Error sending audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send audio data';
      // Don't call onError for send failures - just log it
      // This prevents the error from stopping transcription
      console.warn('⚠️ Audio send failed but continuing:', errorMessage);
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
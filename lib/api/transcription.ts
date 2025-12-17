// lib/api/transcription.ts

import { WS_ENDPOINTS } from '@/lib/constants';
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
          console.warn('⚠️ WebSocket error (state:', readyState, ')');
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
        console.error('❌ Server error:', message.message);
        this.callbacks?.onError(message.message || 'Unknown server error');
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
      console.log('📤 Sending audio chunk:', {
        size: audioBuffer.byteLength,
        readyState: this.ws.readyState,
      });

      this.ws.send(audioBuffer);
      console.log('✅ Audio chunk sent successfully');
    } catch (error) {
      console.error('❌ Error sending audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send audio data';
      this.callbacks?.onError(errorMessage);
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
}

export const transcriptionService = new TranscriptionService();
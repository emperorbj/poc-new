// app/consultation/[id]/transcription/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { useTranscription } from '@/lib/hooks/useTranscription';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Square, Loader2, AlertCircle, Info, Trash2, Clock } from 'lucide-react';

export default function TranscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;
  const [notes, setNotes] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentConsultation = useStore((state) => state.currentConsultation);
  const updateConsultation = useStore((state) => state.updateConsultation);

  const {
    isConnected,
    isRecording,
    transcriptions,
    currentInterim,
    error,
    startRecording,
    stopRecording,
    clearTranscriptions,
  } = useTranscription();

  // Auto-scroll to bottom when new transcriptions arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [transcriptions, currentInterim]);

  // Track recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClear = () => {
    if (showClearConfirm) {
      clearTranscriptions();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  const getWordCount = () => {
    const allText = [...transcriptions.map((t) => t.text), currentInterim]
      .filter(Boolean)
      .join(' ');
    return allText.split(/\s+/).filter((word) => word.length > 0).length;
  };

  if (!currentConsultation) {
    router.back();
    return null;
  }

  const handleStartRecording = () => {
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleFinish = () => {
    if (isRecording) {
      alert('Please stop the recording before finishing.');
      return;
    }

    if (transcriptions.length === 0 && !notes.trim()) {
      const proceed = confirm('No transcription or notes recorded. Do you want to continue anyway?');
      if (!proceed) return;
    }

    const fullTranscription = transcriptions.map((t) => t.text).join(' ');
    const transcriptionWithNotes = fullTranscription + (notes ? `\n\nNotes: ${notes}` : '');

    updateConsultation(currentConsultation.id, {
      transcription: transcriptionWithNotes,
    });

    router.push(`/consultation/${consultationId}/summary`);
  };

  const getStatusText = () => {
    if (error) return '⚠️ Error';
    if (isRecording) return '🔴 Recording & Transcribing...';
    if (isConnected) return '🟢 Connected';
    return '⚪ Ready';
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-500';
    if (isRecording) return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-400';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-6 pt-12">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{currentConsultation.patient.name}</h1>
          <Badge className={`${getStatusColor()} text-white`}>
            {getStatusText()}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Connection Info */}
        {!isConnected && !isRecording && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p>Tap &quot;Start Live Transcription&quot; to begin recording.</p>
                <p className="text-xs opacity-90">
                  💡 Tips: Ensure you&apos;re in a quiet environment and speak clearly for best results.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        {isConnected && !isRecording && transcriptions.length === 0 && (
          <Alert className="bg-green-50 border-green-200">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Ready to record. Click &quot;Start Live Transcription&quot; when ready.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Transcription Error</p>
                <p className="text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Reload Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Recording Controls */}
        <Card className="p-4">
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              disabled={isRecording}
              className="w-full bg-indigo-300 hover:bg-secondary/90"
            >
              <Mic className="mr-2" size={20} />
              Start Live Transcription
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <div className="relative">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                </div>
                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-lg font-bold text-red-600">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                  <span className="text-sm text-red-600 font-medium">Recording in progress</span>
                </div>
              </div>
              <Button
                onClick={handleStopRecording}
                variant="destructive"
                className="w-full"
              >
                <Square className="mr-2" size={20} />
                Stop Recording
              </Button>
            </div>
          )}
        </Card>

        {/* Live Transcription Display */}
        {(transcriptions.length > 0 || currentInterim || isRecording) && (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-lg font-semibold">Live Transcription</h2>
                {(transcriptions.length > 0 || currentInterim) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {getWordCount()} words • {transcriptions.length} final segments
                  </p>
                )}
              </div>
              {transcriptions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className={showClearConfirm ? 'text-red-600' : 'text-primary'}
                >
                  <Trash2 className="mr-1" size={16} />
                  {showClearConfirm ? 'Confirm Clear' : 'Clear'}
                </Button>
              )}
            </div>

            <ScrollArea ref={scrollAreaRef} className="h-64 border rounded-lg p-3 bg-gray-50">
              {/* Final Transcriptions */}
              {transcriptions.map((t) => (
                <div key={t.id} className="mb-3 p-3 bg-green-50 rounded-lg border-l-4 border-secondary">
                  {t.speakerTag && (
                    <p className="text-xs font-semibold text-primary mb-1">
                      Speaker {t.speakerTag}:
                    </p>
                  )}
                  <p className="text-sm text-gray-800">{t.text}</p>
                  {t.confidence && (
                    <p className="text-xs text-gray-500 mt-1">
                      {(t.confidence * 100).toFixed(0)}% confidence
                    </p>
                  )}
                </div>
              ))}

              {/* Interim Transcription */}
              {currentInterim && (
                <div className="mb-3 p-3 bg-gray-100 rounded-lg border-l-4 border-gray-400">
                  <p className="text-sm text-gray-600 italic">{currentInterim}</p>
                </div>
              )}

              {/* Listening Indicator */}
              {isRecording && !currentInterim && transcriptions.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="animate-spin text-primary" size={20} />
                  <span className="text-sm text-gray-600 italic">Listening...</span>
                </div>
              )}
            </ScrollArea>
          </Card>
        )}

        {/* Notes Section */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Additional Notes</h2>
          <Textarea
            placeholder="Add any additional notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isRecording}
            rows={6}
            className="resize-none"
          />
        </Card>

        {/* Finish Button */}
        <div className="space-y-2">
          {transcriptions.length > 0 && (
            <div className="text-center text-sm text-gray-600">
              {transcriptions.length} transcription{transcriptions.length !== 1 ? 's' : ''} recorded
            </div>
          )}
          <Button
            onClick={handleFinish}
            disabled={isRecording}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isRecording ? 'Stop Recording First' : 'Continue to Summary'}
          </Button>
        </div>
      </div>
    </div>
  );
}
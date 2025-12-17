// app/consultation/[id]/transcription/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { useTranscription } from '@/lib/hooks/useTranscription';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Square, Loader2, AlertCircle, Info } from 'lucide-react';

export default function TranscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;
  const [notes, setNotes] = useState('');
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
              Tap &quot;Start Live Transcription&quot; to begin recording. Make sure you&apos;re in a quiet
              environment for best results.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Recording Controls */}
        <Card className="p-4">
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              disabled={isRecording}
              className="w-full bg-secondary hover:bg-secondary/90"
            >
              <Mic className="mr-2" size={20} />
              Start Live Transcription
            </Button>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handleStopRecording}
                variant="destructive"
                className="w-full"
              >
                <Square className="mr-2" size={20} />
                Stop Recording
              </Button>

              <div className="flex items-center justify-center gap-2 text-gray-600">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Recording...</span>
              </div>
            </div>
          )}
        </Card>

        {/* Live Transcription Display */}
        {(transcriptions.length > 0 || currentInterim) && (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Live Transcription</h2>
              {transcriptions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearTranscriptions}
                  className="text-primary"
                >
                  Clear
                </Button>
              )}
            </div>

            <ScrollArea className="h-64 border rounded-lg p-3 bg-gray-50">
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
        <Button
          onClick={handleFinish}
          disabled={isRecording}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isRecording ? 'Stop Recording First' : 'Continue to Summary'}
        </Button>
      </div>
    </div>
  );
}
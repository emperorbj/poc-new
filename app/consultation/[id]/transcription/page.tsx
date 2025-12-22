// app/consultation/[id]/transcription/page.ts
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Mic, 
  Square, 
  Loader2, 
  AlertCircle, 
  Info, 
  Trash2, 
  Clock, 
  FileText,
  Radio,
  Lightbulb,
  Circle
} from 'lucide-react';

export default function TranscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;
  const [notes, setNotes] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [aggregatedTranscript, setAggregatedTranscript] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentConsultation = useStore((state) => state.currentConsultation);
  const updateConsultation = useStore((state) => state.updateConsultation);

  const {
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
  } = useTranscription();

  // Log state changes for debugging
  useEffect(() => {
    console.log('🎨 UI State Update:', {
      isRecording,
      isConnected,
      currentInterim: currentInterim ? currentInterim.substring(0, 50) + '...' : null,
      currentInterimLength: currentInterim?.length || 0,
      transcriptionsCount: transcriptions.length,
      hasError: !!error,
    });
  }, [isRecording, isConnected, currentInterim, transcriptions.length, error]);

  // Auto-scroll to bottom when new transcriptions arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [transcriptions, currentInterim]);

  // Auto-scroll the full transcript area during recording
  useEffect(() => {
    if (isRecording && transcriptScrollRef.current) {
      const scrollContainer = transcriptScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [transcriptions, currentInterim, isRecording]);

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
    // Only count words from final transcriptions
    const allText = transcriptions.map((t) => t.text).join(' ');
    return allText.split(/\s+/).filter((word) => word.length > 0).length;
  };

  if (!currentConsultation) {
    router.back();
    return null;
  }

  const handleStartRecording = () => {
    startRecording();
  };

  // Extract meaningful sentences from interim transcript (like YouTube)
  // includeSpeakers: if true, keeps [SPEAKER_X]: tags, if false removes them
  const extractMeaningfulText = (interim: string, includeSpeakers: boolean = false): string => {
    if (!interim) return '';
    
    const lines = interim.split('\n').filter(line => line.trim());
    const seen = new Set<string>();
    const uniqueLines: string[] = [];
    
    // Process in reverse to keep final versions
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (includeSpeakers) {
        // Keep speaker tags
        if (!seen.has(line)) {
          seen.add(line);
          uniqueLines.unshift(line);
        }
      } else {
        // Remove speaker tags
        const cleanLine = line.replace(/^\[SPEAKER_\d+\]:\s*/, '').trim();
        if (cleanLine && !seen.has(cleanLine)) {
          seen.add(cleanLine);
          uniqueLines.unshift(cleanLine);
        }
      }
    }
    
    // Filter out incomplete lines that are prefixes of later lines
    const finalLines: string[] = [];
    for (let i = 0; i < uniqueLines.length; i++) {
      const current = includeSpeakers ? uniqueLines[i] : uniqueLines[i].replace(/^\[SPEAKER_\d+\]:\s*/, '');
      const checkAgainst = includeSpeakers ? uniqueLines : uniqueLines.map(l => l.replace(/^\[SPEAKER_\d+\]:\s*/, ''));
      const isPrefix = checkAgainst.slice(i + 1).some(later => later.startsWith(current));
      if (!isPrefix) {
        finalLines.push(uniqueLines[i]);
      }
    }
    
    return includeSpeakers 
      ? finalLines.join('\n').trim()
      : finalLines.join(' ').trim();
  };

  // Get the latest line from interim - simple, just show the most recent
  const getLatestInterimLine = (interim: string): { text: string; speaker: string | null } | null => {
    if (!interim || !interim.trim()) return null;
    
    const lines = interim.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;
    
    // Just get the latest line - simple!
    const latestLine = lines[lines.length - 1];
    
    // Extract speaker and text
    const speakerMatch = latestLine.match(/^\[SPEAKER_(\d+)\]:\s*(.+)$/);
    if (speakerMatch) {
      const speakerNum = speakerMatch[1];
      const cleanText = speakerMatch[2].trim();
      if (cleanText) {
        return { text: cleanText, speaker: `Speaker ${speakerNum}` };
      }
    } else {
      // No speaker tag
      const cleanText = latestLine.replace(/^\[SPEAKER_\d+\]:\s*/, '').trim();
      if (cleanText) {
        return { text: cleanText, speaker: null };
      }
    }
    
    return null;
  };

  const handleStopRecording = () => {
    stopRecording();
    // No need to show dialog - transcript is already visible in scroll area
  };

  // Get aggregated transcript for display (updates in real-time during recording)
  // Includes speaker tags for better readability
  const getAggregatedTranscript = (includeSpeakers: boolean = true): string => {
    const allFinalTexts = transcriptions.map(t => {
      if (includeSpeakers && t.speakerTag) {
        return `[SPEAKER_${t.speakerTag}]: ${t.text}`;
      }
      return t.text;
    }).join('\n\n');
    
    // For interim, show with speaker tags if available
    let interimText = '';
    if (currentInterim) {
      if (includeSpeakers) {
        // Keep speaker tags in interim text
        interimText = extractMeaningfulText(currentInterim, true);
      } else {
        interimText = extractMeaningfulText(currentInterim, false);
      }
    }
    
    const fullTranscript = [allFinalTexts, interimText]
      .filter(Boolean)
      .join('\n\n')
      .trim();
    
    return fullTranscript;
  };


  const handleFinish = () => {
    if (isRecording) {
      alert('Please stop the recording before finishing.');
      return;
    }

    // Check if there's any content to save
    // Only use final transcriptions
    const hasFinalTranscriptions = transcriptions.length > 0;
    const hasNotes = notes.trim().length > 0;
    const hasSummary = summary && (typeof summary === 'string' ? summary.trim().length > 0 : Object.keys(summary).length > 0);
    const hasContent = hasFinalTranscriptions || hasNotes || hasSummary;

    if (!hasContent) {
      const proceed = confirm('No transcription, notes, or summary recorded. Do you want to continue anyway?');
      if (!proceed) return;
    }

    // Build the transcription text from final transcriptions only
    let fullTranscription = transcriptions.map((t) => t.text).join(' ');
    
    console.log('📝 Building transcription for save:', {
      finalTranscriptionsCount: transcriptions.length,
      finalTranscriptions: transcriptions.map(t => t.text),
      hasSummary: !!summary,
      hasNotes: !!notes.trim(),
    });
    
    let transcriptionWithNotes = fullTranscription;
    
    // Add summary if available (handle both string and object formats)
    if (summary) {
      const summaryText = typeof summary === 'string' 
        ? summary 
        : JSON.stringify(summary);
      if (summaryText.trim()) {
        transcriptionWithNotes += (transcriptionWithNotes ? '\n\n' : '') + `Summary:\n${summaryText}`;
      }
    }
    
    // Add notes if available
    if (notes.trim()) {
      transcriptionWithNotes += (transcriptionWithNotes ? '\n\n' : '') + `Notes: ${notes}`;
    }

    let finalTranscriptionText = transcriptionWithNotes || 'No transcription recorded';
    
    // Include transcript_id in the transcription text for reference
    if (currentTranscriptId) {
      finalTranscriptionText += `\n\n[transcript_id: ${currentTranscriptId}]`;
      console.log('📋 Including transcript_id in saved transcription:', currentTranscriptId);
    } else {
      console.warn('⚠️ No transcript_id available - summary API call may fail. Backend may not be sending transcript_id yet.');
    }
    
    console.log('💾 Saving transcription:', {
      length: finalTranscriptionText.length,
      preview: finalTranscriptionText.substring(0, 200),
      consultationId: currentConsultation.id,
      transcriptId: currentTranscriptId,
    });

    updateConsultation(currentConsultation.id, {
      transcription: finalTranscriptionText,
    });

    // Navigate to summary page - it will handle fetching the summary
    // Pass transcript_id via URL params so summary page can fetch it
    router.push(`/consultation/${consultationId}/summary${currentTranscriptId ? `?transcript_id=${currentTranscriptId}` : ''}`);
  };

  const getStatusText = () => {
    if (error) return <><AlertCircle className="inline w-4 h-4 mr-1" /> Error</>;
    if (isRecording) return <><Radio className="inline w-4 h-4 mr-1 animate-pulse" /> Recording & Transcribing...</>;
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
                <p className="flex items-center gap-1 text-xs opacity-90">
                  <Lightbulb className="w-3 h-3" />
                  Tips: Ensure you&apos;re in a quiet environment and speak clearly for best results.
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
            <div className="flex items-center justify-center gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <div className="relative">
                <Circle className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
                <Circle className="absolute inset-0 w-4 h-4 text-red-500 fill-red-500 animate-ping opacity-75" />
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
          )}
        </Card>

        {/* Floating Stop Button - Bottom Right Corner */}
        {isRecording && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={handleStopRecording}
              variant="destructive"
              size="lg"
              className="rounded-full shadow-2xl h-16 w-16 p-0 hover:scale-110 transition-transform"
            >
              <Square className="h-6 w-6" />
            </Button>
          </div>
        )}

        {/* Live Transcription - Simple blue container showing latest interim message */}
        {isRecording && (() => {
          if (!currentInterim || !currentInterim.trim()) return null;
          
          const result = getLatestInterimLine(currentInterim);
          if (!result || !result.text) return null;
          
          return (
            <Card className="p-6 bg-blue-50 border-2 border-blue-300 shadow-md mb-4">
              {result.speaker && (
                <div className="mb-3">
                  <Badge variant="outline" className="bg-blue-200 text-blue-800 border-blue-400 font-semibold">
                    {result.speaker}
                  </Badge>
                </div>
              )}
              <div className="bg-white rounded-lg p-4">
                <p className="text-lg text-gray-900 leading-relaxed font-medium">
                  {result.text}
                </p>
              </div>
            </Card>
          );
        })()}

        {/* Full Transcription Scroll Area - Shows aggregated transcript during recording */}
        {isRecording && (() => {
          const fullTranscript = getAggregatedTranscript(true); // Include speaker tags
          if (!fullTranscript.trim()) return null;
          
          return (
            <Card className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Full Transcription
                </h2>
                <Badge variant="outline" className="bg-blue-100 text-blue-700">
                  Live
                </Badge>
              </div>
              <ScrollArea ref={transcriptScrollRef} className="h-[500px] border rounded-lg p-4 bg-gray-50">
                <div className="prose prose-sm max-w-none">
                  <pre className="text-gray-800 leading-relaxed whitespace-pre-wrap font-sans text-sm">
                    {fullTranscript}
                  </pre>
                </div>
              </ScrollArea>
            </Card>
          );
        })()}

        {/* Summary Section - Shows when summary is received via WebSocket (like demo.html) */}
        {(summary || isLoadingSummary) && (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Clinical Summary
              </h2>
              {summary && !isRecording && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fullTranscript = getAggregatedTranscript(true);
                    setAggregatedTranscript(fullTranscript);
                    setShowTranscriptDialog(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Full Transcription
                </Button>
              )}
            </div>
            
            {summaryError && (
              <Alert variant="destructive" className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{summaryError}</AlertDescription>
              </Alert>
            )}
            
            {isLoadingSummary && !summary ? (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold italic">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating final clinical summary...</span>
                </div>
              </div>
            ) : summary ? (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                {typeof summary === 'string' ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{summary}</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(summary).map(([key, value]: [string, any]) => {
                      if (!Array.isArray(value) || value.length === 0) return null;
                      return (
                        <div key={key} className="mb-4 text-left">
                          <h3 className="font-bold capitalize text-blue-800 text-sm mb-1">{key}</h3>
                          <ul className="list-disc ml-5 space-y-1">
                            {value.map((item: string, idx: number) => (
                              <li key={idx} className="text-slate-700 text-sm">{item}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
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

        {/* Aggregated Transcript Dialog */}
        <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Complete Transcription
              </DialogTitle>
              <DialogDescription>
                Full transcript of the consultation
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-4">
              <div className="prose prose-sm max-w-none">
                <pre className="text-gray-800 leading-relaxed whitespace-pre-wrap font-sans text-sm">
                  {aggregatedTranscript || getAggregatedTranscript(true) || 'No transcription available.'}
                </pre>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowTranscriptDialog(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  const textToCopy = aggregatedTranscript || getAggregatedTranscript(true) || '';
                  navigator.clipboard.writeText(textToCopy);
                  // You could add a toast notification here
                }}
              >
                Copy Transcript
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
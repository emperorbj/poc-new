// app/consultation/[id]/summary/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SessionSummary } from '@/types';
import { transcriptionService } from '@/lib/api/transcription';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SessionSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;
  const currentConsultation = useStore((state) => state.currentConsultation);
  const accessToken = useStore((state) => state.accessToken);
  
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentConsultation) {
    router.back();
    return null;
  }

  const identifiers = `Name: ${currentConsultation.patient.name}\nAge/Sex: ${currentConsultation.patient.age}/${currentConsultation.patient.sex}\nAadhar: ${currentConsultation.patient.aadharId}`;

  // Default summary structure
  const getDefaultSummary = (): SessionSummary => ({
    identifiers,
    history: ['No transcription recorded'],
    examination: ['Examination details to be added'],
    diagnosis: ['Diagnosis to be determined'],
    treatment: ['Treatment plan to be determined'],
    nextSteps: ['Follow-up as needed'],
  });

  // Fetch summary from API
  const fetchSummaryFromAPI = async (transcriptId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('📤 Fetching structured summary for transcript_id:', transcriptId);
      
      const apiResponse = await transcriptionService.getSummary(transcriptId, accessToken || undefined);
      
      console.log('✅ Summary received from API:', apiResponse);
      
      // Parse the nested response structure
      // Response format: { summary: { raw_output: "```json\n{...}\n```" }, transcript: {...} }
      let parsedSummary: SessionSummary | null = null;
      
      if (apiResponse && typeof apiResponse === 'object') {
        // Check if response has the nested structure
        if (apiResponse.summary && apiResponse.summary.raw_output) {
          try {
            // Extract JSON from markdown code block
            const rawOutput = apiResponse.summary.raw_output;
            // Remove markdown code block markers (```json\n and \n```)
            const jsonString = rawOutput
              .replace(/^```json\s*/i, '')
              .replace(/```\s*$/, '')
              .trim();
            
            console.log('📝 Extracted JSON string:', jsonString.substring(0, 200));
            
            // Parse the JSON
            const summaryData = JSON.parse(jsonString);
            
            console.log('✅ Parsed summary data:', summaryData);
            
            // Map to SessionSummary structure (case-insensitive field matching)
            parsedSummary = {
              identifiers,
              history: Array.isArray(summaryData.History) ? summaryData.History : 
                      Array.isArray(summaryData.history) ? summaryData.history : [],
              examination: Array.isArray(summaryData.Examination) ? summaryData.Examination :
                          Array.isArray(summaryData.examination) ? summaryData.examination : [],
              diagnosis: Array.isArray(summaryData.Diagnosis) ? summaryData.Diagnosis :
                        Array.isArray(summaryData.diagnosis) ? summaryData.diagnosis : [],
              treatment: Array.isArray(summaryData.Treatment) ? summaryData.Treatment :
                        Array.isArray(summaryData.treatment) ? summaryData.treatment : [],
              nextSteps: Array.isArray(summaryData['Next Steps']) ? summaryData['Next Steps'] :
                        Array.isArray(summaryData.nextSteps) ? summaryData.nextSteps :
                        Array.isArray(summaryData['NextSteps']) ? summaryData['NextSteps'] : [],
            };
            
            setSummary(parsedSummary);
          } catch (parseError) {
            console.error('❌ Error parsing summary JSON:', parseError);
            throw new Error('Failed to parse summary JSON from API response');
          }
        } else if (apiResponse.history || apiResponse.examination) {
          // Direct SessionSummary structure
          parsedSummary = {
            identifiers: apiResponse.identifiers || identifiers,
            history: Array.isArray(apiResponse.history) ? apiResponse.history : [],
            examination: Array.isArray(apiResponse.examination) ? apiResponse.examination : [],
            diagnosis: Array.isArray(apiResponse.diagnosis) ? apiResponse.diagnosis : [],
            treatment: Array.isArray(apiResponse.treatment) ? apiResponse.treatment : [],
            nextSteps: Array.isArray(apiResponse.nextSteps) ? apiResponse.nextSteps : [],
          };
          setSummary(parsedSummary);
        } else {
          throw new Error('Unexpected API response format');
        }
      } else {
        throw new Error('Invalid API response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch summary';
      console.error('❌ Error fetching summary:', err);
      setError(errorMessage);
      setSummary(getDefaultSummary());
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch summary on page load with hardcoded ID 19 for now
  useEffect(() => {
    // For now, use hardcoded ID 19 as per backend engineer's suggestion
    const HARDCODED_TRANSCRIPT_ID = 19;
    
    // Check URL params for transcript_id (if passed from transcription page)
    const urlParams = new URLSearchParams(window.location.search);
    const transcriptIdFromUrl = urlParams.get('transcript_id');
    
    // Check if consultation has transcript_id stored
    const transcription = currentConsultation.transcription || '';
    const transcriptIdMatch = transcription.match(/transcript[_\s]id[:\s]+(\d+)/i);
    const transcriptIdFromText = transcriptIdMatch ? parseInt(transcriptIdMatch[1]) : null;
    
    // Priority: URL param > Text extraction > Hardcoded ID 19
    const transcriptIdToUse = transcriptIdFromUrl 
      ? parseInt(transcriptIdFromUrl) 
      : (transcriptIdFromText || HARDCODED_TRANSCRIPT_ID);
    
    console.log('🔍 Looking for transcript_id:', {
      fromUrl: transcriptIdFromUrl,
      fromText: transcriptIdFromText,
      hardcoded: HARDCODED_TRANSCRIPT_ID,
      toUse: transcriptIdToUse,
    });
    
    // Automatically fetch summary when page loads
    if (transcriptIdToUse && !isNaN(transcriptIdToUse)) {
      console.log('✅ Fetching summary automatically on page load with transcript_id:', transcriptIdToUse);
      fetchSummaryFromAPI(transcriptIdToUse);
    } else {
      // Initialize with default summary if no valid ID found
      if (!summary) {
        console.log('⚠️ No valid transcript_id found - using default summary');
        setSummary(getDefaultSummary());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount


  const displaySummary = summary || getDefaultSummary();

  const NumberedListSection = ({ label, items }: { label: string; items: string[] }) => (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-primary">{label}</h3>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <span className="font-semibold text-primary min-w-[24px]">{index + 1}.</span>
          <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-6 pt-12">
        <h1 className="text-2xl font-bold">Session Summary Draft</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-medium text-gray-600">Loading summary from API...</span>
              <span className="text-xs text-gray-500">Please wait while we fetch your consultation summary</span>
            </div>
          </Card>
        ) : (
          <>
            {/* Identifiers */}
            <Card className="p-4">
              <h3 className="text-base font-semibold text-primary mb-2">Identifiers</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {displaySummary.identifiers}
              </p>
            </Card>

            {/* History */}
            <Card className="p-4">
              <NumberedListSection label="History" items={displaySummary.history} />
            </Card>

            {/* Examination */}
            <Card className="p-4">
              <NumberedListSection label="Examination" items={displaySummary.examination} />
            </Card>

            {/* Diagnosis */}
            <Card className="p-4">
              <NumberedListSection label="Diagnosis" items={displaySummary.diagnosis} />
            </Card>

            {/* Treatment */}
            <Card className="p-4">
              <NumberedListSection label="Treatment" items={displaySummary.treatment} />
            </Card>

            {/* Next Steps */}
            <Card className="p-4">
              <NumberedListSection label="Next Steps" items={displaySummary.nextSteps} />
            </Card>
          </>
        )}

        {/* Review Button */}
        <Button
          onClick={() => router.push(`/consultation/${consultationId}/review-summary`)}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Review Draft
        </Button>
      </div>
    </div>
  );
}
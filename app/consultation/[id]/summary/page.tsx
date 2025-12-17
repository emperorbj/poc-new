// app/consultation/[id]/summary/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SessionSummary } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function SessionSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;
  const currentConsultation = useStore((state) => state.currentConsultation);

  if (!currentConsultation) {
    router.back();
    return null;
  }

  const [summary] = useState<SessionSummary>({
    identifiers: `Name: ${currentConsultation.patient.name}\nAge/Sex: ${currentConsultation.patient.age}/${currentConsultation.patient.sex}\nAadhar: ${currentConsultation.patient.aadharId}`,
    history: [
      'Patient presents with missed menstrual cycles for the past 2 months',
      'No significant past medical history',
      'Last menstrual period was 8 weeks ago',
    ],
    examination: [
      'Vitals stable',
      'Abdominal examination unremarkable',
      'Per speculum examination normal',
    ],
    diagnosis: ['Possible early pregnancy - to be confirmed with ultrasound scan'],
    treatment: ['Folic acid 400 mcg daily prescribed', 'Early pregnancy scan scheduled'],
    nextSteps: [
      'Follow-up appointment in 2 weeks with scan results',
      'Patient advised to maintain prenatal vitamins',
      'Report any concerning symptoms immediately',
    ],
  });

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
        {/* Identifiers */}
        <Card className="p-4">
          <h3 className="text-base font-semibold text-primary mb-2">Identifiers</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {summary.identifiers}
          </p>
        </Card>

        {/* History */}
        <Card className="p-4">
          <NumberedListSection label="History" items={summary.history} />
        </Card>

        {/* Examination */}
        <Card className="p-4">
          <NumberedListSection label="Examination" items={summary.examination} />
        </Card>

        {/* Diagnosis */}
        <Card className="p-4">
          <NumberedListSection label="Diagnosis" items={summary.diagnosis} />
        </Card>

        {/* Treatment */}
        <Card className="p-4">
          <NumberedListSection label="Treatment" items={summary.treatment} />
        </Card>

        {/* Next Steps */}
        <Card className="p-4">
          <NumberedListSection label="Next Steps" items={summary.nextSteps} />
        </Card>

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
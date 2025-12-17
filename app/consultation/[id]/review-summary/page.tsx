// app/consultation/[id]/review-summary/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

export default function ReviewSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;
  const currentConsultation = useStore((state) => state.currentConsultation);

  if (!currentConsultation) {
    router.back();
    return null;
  }

  const [editedSummary, setEditedSummary] = useState({
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
      'Report any concerning symptoms',
    ],
  });

  const EditableTextSection = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (text: string) => void;
  }) => (
    <Card className="p-4">
      <Label className="text-base font-semibold text-primary mb-2 block">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="resize-none"
      />
    </Card>
  );

  const EditableListSection = ({
    label,
    items,
    onChange,
  }: {
    label: string;
    items: string[];
    onChange: (items: string[]) => void;
  }) => (
    <Card className="p-4 space-y-3">
      <Label className="text-base font-semibold text-primary">{label}</Label>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <span className="font-semibold text-primary min-w-[24px] mt-2">
            {index + 1}.
          </span>
          <Textarea
            value={item}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index] = e.target.value;
              onChange(newItems);
            }}
            rows={2}
            className="flex-1 resize-none"
          />
          {items.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newItems = items.filter((_, i) => i !== index);
                onChange(newItems);
              }}
              className="mt-1"
            >
              <X size={16} />
            </Button>
          )}
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, ''])}
        className="w-full border-dashed text-primary hover:text-primary"
      >
        <Plus size={16} className="mr-2" />
        Add Item
      </Button>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-6 pt-12">
        <h1 className="text-2xl font-bold">Review Session Summary</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600">Review and edit the session summary below:</p>

        {/* Identifiers */}
        <EditableTextSection
          label="Identifiers"
          value={editedSummary.identifiers}
          onChange={(text) => setEditedSummary({ ...editedSummary, identifiers: text })}
        />

        {/* History */}
        <EditableListSection
          label="History"
          items={editedSummary.history}
          onChange={(items) => setEditedSummary({ ...editedSummary, history: items })}
        />

        {/* Examination */}
        <EditableListSection
          label="Examination"
          items={editedSummary.examination}
          onChange={(items) => setEditedSummary({ ...editedSummary, examination: items })}
        />

        {/* Diagnosis */}
        <EditableListSection
          label="Diagnosis"
          items={editedSummary.diagnosis}
          onChange={(items) => setEditedSummary({ ...editedSummary, diagnosis: items })}
        />

        {/* Treatment */}
        <EditableListSection
          label="Treatment"
          items={editedSummary.treatment}
          onChange={(items) => setEditedSummary({ ...editedSummary, treatment: items })}
        />

        {/* Next Steps */}
        <EditableListSection
          label="Next Steps"
          items={editedSummary.nextSteps}
          onChange={(items) => setEditedSummary({ ...editedSummary, nextSteps: items })}
        />

        {/* Finalize Button */}
        <Button
          onClick={() => router.push(`/consultation/${consultationId}/prescription`)}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Finalize Summary
        </Button>
      </div>
    </div>
  );
}
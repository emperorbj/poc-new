// app/consultation/[id]/prescription/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, MessageCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ReviewPrescriptionPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;
  const [isReviewed, setIsReviewed] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const currentConsultation = useStore((state) => state.currentConsultation);
  const updateConsultation = useStore((state) => state.updateConsultation);
  const setCurrentConsultation = useStore((state) => state.setCurrentConsultation);

  const [prescription, setPrescription] = useState({
    treatment: [
      {
        name: 'Folic Acid 400 mcg',
        dosage: '1 tablet daily',
        duration: 'Throughout pregnancy',
      },
      {
        name: 'Prenatal Vitamins',
        dosage: '1 tablet daily',
        duration: 'Throughout pregnancy',
      },
    ],
    advice: [
      'Schedule ultrasound scan within 1 week',
      'Return for follow-up in 2 weeks',
    ],
    nextSteps: [
      'Report any bleeding or severe pain immediately',
      'Maintain adequate rest and hydration',
    ],
  });

  if (!currentConsultation) {
    router.back();
    return null;
  }

  const handleMarkReviewed = () => {
    setIsReviewed(true);
    updateConsultation(currentConsultation.id, { prescription, reviewed: true });
  };

  const handleSendWhatsApp = () => {
    updateConsultation(currentConsultation.id, { status: 'Completed' });
    setShowSuccessDialog(true);
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    setCurrentConsultation(null);
    router.push('/consultations');
  };

  const TreatmentSection = ({
    items,
    onChange,
    editable,
  }: {
    items: Array<{ name: string; dosage: string; duration: string }>;
    onChange: (items: any[]) => void;
    editable: boolean;
  }) => (
    <Card className="p-4 space-y-3">
      <Label className="text-base font-semibold text-primary">Treatment</Label>
      {items.map((item, index) => (
        <div key={index} className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-start">
            <span className="font-semibold text-primary">{index + 1}.</span>
            {editable && items.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newItems = items.filter((_, i) => i !== index);
                  onChange(newItems);
                }}
              >
                <X size={16} />
              </Button>
            )}
          </div>
          <div className="space-y-2 ml-6">
            <Input
              value={item.name}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].name = e.target.value;
                onChange(newItems);
              }}
              placeholder="Medication name"
              disabled={!editable}
              className="font-semibold"
            />
            <Input
              value={item.dosage}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].dosage = e.target.value;
                onChange(newItems);
              }}
              placeholder="Dosage"
              disabled={!editable}
            />
            <Input
              value={item.duration}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].duration = e.target.value;
                onChange(newItems);
              }}
              placeholder="Duration"
              disabled={!editable}
            />
          </div>
        </div>
      ))}
      {editable && (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...items, { name: '', dosage: '', duration: '' }])
          }
          className="w-full border-dashed text-primary hover:text-primary"
        >
          <Plus size={16} className="mr-2" />
          Add Medication
        </Button>
      )}
    </Card>
  );

  const ListSection = ({
    label,
    items,
    onChange,
    editable,
  }: {
    label: string;
    items: string[];
    onChange: (items: string[]) => void;
    editable: boolean;
  }) => (
    <Card className="p-4 space-y-3">
      <Label className="text-base font-semibold text-primary">{label}</Label>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <span className="text-primary font-bold mt-3">•</span>
          <Textarea
            value={item}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index] = e.target.value;
              onChange(newItems);
            }}
            disabled={!editable}
            rows={2}
            className="flex-1 resize-none"
          />
          {editable && items.length > 1 && (
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
      {editable && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, ''])}
          className="w-full border-dashed text-primary hover:text-primary"
        >
          <Plus size={16} className="mr-2" />
          Add Item
        </Button>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-6 pt-12">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Prescription Draft</h1>
          {!isReviewed && (
            <Badge variant="destructive" className="bg-red-500">
              Review Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600">
          {isReviewed
            ? 'Prescription reviewed and ready to send'
            : 'Review and edit the prescription below:'}
        </p>

        {/* Treatment Section */}
        <TreatmentSection
          items={prescription.treatment}
          onChange={(items) => setPrescription({ ...prescription, treatment: items })}
          editable={!isReviewed}
        />

        {/* Advice Section */}
        <ListSection
          label="Advice"
          items={prescription.advice}
          onChange={(items) => setPrescription({ ...prescription, advice: items })}
          editable={!isReviewed}
        />

        {/* Next Steps Section */}
        <ListSection
          label="Next Steps"
          items={prescription.nextSteps}
          onChange={(items) => setPrescription({ ...prescription, nextSteps: items })}
          editable={!isReviewed}
        />

        {/* Action Button */}
        {!isReviewed ? (
          <Button
            onClick={handleMarkReviewed}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Mark as Reviewed
          </Button>
        ) : (
          <Button
            onClick={handleSendWhatsApp}
            variant="outline"
            className="w-full border-secondary text-secondary hover:bg-secondary/10"
          >
            <MessageCircle size={20} className="mr-2" />
            Send on WhatsApp
          </Button>
        )}
      </div>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Success!</AlertDialogTitle>
            <AlertDialogDescription>
              Prescription sent to patient via WhatsApp successfully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessClose}>
              Back to Consultations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
// app/consultation/[id]/consent/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function ConsentPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;

  const handleConsent = () => {
    router.push(`/consultation/${consultationId}/transcription`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="max-w-md w-full">
        <Card className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              Patient Consent Required
            </h2>
            <p className="text-gray-600 leading-relaxed">
              I confirm that I have obtained the patient&apos;s verbal consent to record
              and transcribe this interaction for medical documentation.
            </p>
          </div>

          <Button
            onClick={handleConsent}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Consent Obtained
          </Button>
        </Card>
      </div>
    </div>
  );
}
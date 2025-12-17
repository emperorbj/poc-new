// app/(auth)/tenant-setup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore } from '@/lib/store/useStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TenantDetails } from '@/types';
import { EXPERIENCE_OPTIONS } from '@/lib/constants';

export default function TenantSetupPage() {
  const router = useRouter();
  const userRegistration = useStore((state) => state.userRegistration);
  const doctorInfo = useStore((state) => state.doctorInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<TenantDetails>({
    doctorName: userRegistration?.doctorName || doctorInfo?.name || '',
    clinicName: '',
    specialty: userRegistration?.specialty || doctorInfo?.specialty || '',
    medicalRegistrationNumber: '',
    yearsOfExperience: '',
    locationName: '',
  });
  const setTenantDetails = useStore((state) => state.setTenantDetails);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!details.clinicName || !details.medicalRegistrationNumber || !details.yearsOfExperience) {
      setError('Please fill in all required fields (Clinic Name, Registration Number, and Years of Experience)');
      return;
    }

    if (!details.locationName) {
      setError('Please enter your location');
      return;
    }

    try {
      setIsLoading(true);
      console.log('📤 Submitting profile:', details);

      await setTenantDetails(details);

      console.log('✅ Profile setup complete - navigation handled by protected route');
    } catch (error: any) {
      console.error('❌ Profile setup error:', error);
      setError(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Setup Your Profile</h1>
          <p className="text-gray-500">Complete your profile to start using Humaein</p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="doctorName">Doctor Name</Label>
            <Input
              id="doctorName"
              placeholder="Dr. John Doe"
              value={details.doctorName}
              onChange={(e) => setDetails({ ...details, doctorName: e.target.value })}
              disabled={isLoading}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="clinicName">Clinic Name *</Label>
            <Input
              id="clinicName"
              placeholder="e.g., City Health Center"
              value={details.clinicName}
              onChange={(e) => setDetails({ ...details, clinicName: e.target.value })}
              disabled={isLoading}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="specialty">Specialty</Label>
            <Input
              id="specialty"
              placeholder="e.g., Gynecology"
              value={details.specialty}
              onChange={(e) => setDetails({ ...details, specialty: e.target.value })}
              disabled={isLoading}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="medicalRegistrationNumber">Medical Registration Number *</Label>
            <Input
              id="medicalRegistrationNumber"
              placeholder="e.g., MCI-12345"
              value={details.medicalRegistrationNumber}
              onChange={(e) =>
                setDetails({ ...details, medicalRegistrationNumber: e.target.value })
              }
              disabled={isLoading}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
            <Select
              value={details.yearsOfExperience}
              onValueChange={(value) =>
                setDetails({ ...details, yearsOfExperience: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select experience" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="locationName">Location *</Label>
            <Input
              id="locationName"
              placeholder="e.g., Mumbai, Maharashtra"
              value={details.locationName}
              onChange={(e) =>
                setDetails({ ...details, locationName: e.target.value })
              }
              disabled={isLoading}
              className="mt-2"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? 'Completing Profile...' : 'Complete Profile'}
          </Button>
        </form>
      </div>
    </div>
  );
}
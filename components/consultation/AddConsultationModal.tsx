// components/consultation/AddConsultationModal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { Patient } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { COMPLAINTS } from '@/lib/constants';

interface AddConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddConsultationModal({ isOpen, onClose }: AddConsultationModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: 'Female' as 'Male' | 'Female' | 'Other',
    presentingComplaint: '',
    patientType: 'Existing' as 'New' | 'Existing',
    urgency: 'Medium' as 'High' | 'Medium' | 'Low',
    whatsappNumber: '+91',
    aadharId: '',
    country: '',
    state: '',
    city: '',
  });
  const addConsultation = useStore((state) => state.addConsultation);
  const setCurrentConsultation = useStore((state) => state.setCurrentConsultation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.age) {
      alert('Please fill in all required fields');
      return;
    }

    const patient: Patient = {
      id: Date.now().toString(),
      name: formData.name,
      age: parseInt(formData.age),
      sex: formData.sex,
      patientType: formData.patientType,
      presentingComplaint: formData.presentingComplaint || 'General consultation',
      urgency: formData.urgency,
      whatsappNumber: formData.whatsappNumber,
      aadharId: formData.aadharId,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };

    const newConsultation = {
      id: Date.now().toString(),
      patient,
      status: 'Pending' as const,
      reviewed: false,
    };

    addConsultation(patient);
    setCurrentConsultation(newConsultation);

    // Reset form
    setFormData({
      name: '',
      age: '',
      sex: 'Female',
      presentingComplaint: '',
      patientType: 'Existing',
      urgency: 'Medium',
      whatsappNumber: '+91',
      aadharId: '',
      country: '',
      state: '',
      city: '',
    });

    onClose();
    router.push(`/consultation/${newConsultation.id}/consent`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Consultation Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Patient name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sex: value as 'Male' | 'Female' | 'Other' })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="complaint">Complaint *</Label>
              <Select
                value={formData.presentingComplaint}
                onValueChange={(value) =>
                  setFormData({ ...formData, presentingComplaint: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select complaint" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINTS.map((complaint) => (
                    <SelectItem key={complaint} value={complaint}>
                      {complaint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="patientType">Patient Type</Label>
              <Select
                value={formData.patientType}
                onValueChange={(value) =>
                  setFormData({ ...formData, patientType: value as 'New' | 'Existing' })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Existing">Existing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) =>
                  setFormData({ ...formData, urgency: value as 'High' | 'Medium' | 'Low' })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                placeholder="+91 XXXXX XXXXX"
                value={formData.whatsappNumber}
                onChange={(e) =>
                  setFormData({ ...formData, whatsappNumber: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="aadhar">Aadhar ID</Label>
              <Input
                id="aadhar"
                placeholder="XXXX-XXXX-XXXX"
                value={formData.aadharId}
                onChange={(e) => setFormData({ ...formData, aadharId: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Add Consultation
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
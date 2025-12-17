// app/(dashboard)/consultations/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { FilterType, Consultation } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ConsultationCard } from '@/components/consultation/ConsultationCard';
import { AddConsultationModal } from '@/components/consultation/AddConsultationModal';

export default function ConsultationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const consultations = useStore((state) => state.consultations);
  const setCurrentConsultation = useStore((state) => state.setCurrentConsultation);

  const filteredConsultations = consultations.filter((c) => {
    if (filter === 'All') return true;
    return c.status === filter;
  });

  const handleSelectConsultation = (consultation: Consultation) => {
    setCurrentConsultation(consultation);
    router.push(`/consultation/${consultation.id}/consent`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-primary text-white p-6 pt-12">
        <h1 className="text-2xl font-bold">My Consultations</h1>
        <p className="text-sm opacity-90 mt-1">
          Today, {new Date().toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-4 bg-white">
        {(['All', 'Pending', 'Completed'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      <div className="p-4 space-y-3">
        {filteredConsultations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No consultations found</p>
            <p className="text-sm mt-2">Add a new consultation to get started</p>
          </div>
        ) : (
          filteredConsultations.map((consultation) => (
            <ConsultationCard
              key={consultation.id}
              consultation={consultation}
              onPress={() => handleSelectConsultation(consultation)}
            />
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-6 bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
      >
        <Plus size={24} />
        <span className="font-semibold pr-2">Start Consultation</span>
      </button>

      {/* Add Consultation Modal */}
      <AddConsultationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
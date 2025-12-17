// components/consultation/ConsultationCard.tsx

import { Consultation } from '@/types';
import { Badge } from '@/components/ui/badge';

interface ConsultationCardProps {
  consultation: Consultation;
  onPress: () => void;
}

export function ConsultationCard({ consultation, onPress }: ConsultationCardProps) {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      onClick={onPress}
      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">{consultation.patient.time}</p>
          <h3 className="text-lg font-semibold text-gray-800">
            {consultation.patient.name}
          </h3>
        </div>
        <div className="text-2xl text-gray-400">☰</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {consultation.patient.age}/{consultation.patient.sex[0]}
        </Badge>
        <Badge
          variant="outline"
          className={`text-xs ${
            consultation.patient.patientType === 'New'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}
        >
          {consultation.patient.patientType}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {consultation.patient.presentingComplaint}
        </Badge>
        <Badge
          variant="outline"
          className={`text-xs ${getUrgencyColor(consultation.patient.urgency)}`}
        >
          {consultation.patient.urgency}
        </Badge>
      </div>
    </div>
  );
}
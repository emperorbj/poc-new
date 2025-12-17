// types/index.ts

export interface Patient {
    id: string;
    name: string;
    age: number;
    sex: 'Male' | 'Female' | 'Other';
    patientType: 'New' | 'Existing';
    presentingComplaint: string;
    urgency: 'High' | 'Medium' | 'Low';
    whatsappNumber: string;
    aadharId: string;
    country: string;
    state: string;
    city: string;
    time: string;
  }
  
  export interface Prescription {
    treatment: Array<{
      name: string;
      dosage: string;
      duration: string;
    }>;
    advice: string[];
    nextSteps: string[];
  }
  
  export interface SessionSummary {
    identifiers: string;
    history: string[];
    examination: string[];
    diagnosis: string[];
    treatment: string[];
    nextSteps: string[];
  }
  
  export interface Consultation {
    id: string;
    patient: Patient;
    status: 'Pending' | 'Completed';
    transcription?: string;
    sessionSummary?: SessionSummary;
    prescription?: Prescription;
    reviewed: boolean;
  }
  
  export interface TenantDetails {
    locationName: string;
    specialty: string;
    clinicName: string;
    doctorName: string;
    medicalRegistrationNumber: string;
    yearsOfExperience: string;
  }
  
  export interface UserRegistration {
    doctorName: string;
    specialty: string;
    email: string;
    password: string;
  }
  
  export type FilterType = 'All' | 'Pending' | 'Completed';
  
  // API Types
  export interface SignupRequest {
    name: string;
    specialty: string;
    email: string;
    password: string;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface DoctorInfo {
    id: number;
    name: string;
    specialty: string;
    email: string;
    clinic_name?: string | null;
    medical_registration_number?: string | null;
    experience?: number | null;
    location?: string | null;
    created_at: string;
  }
  
  export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: 'bearer';
    doctor: DoctorInfo;
  }
  
  export interface RefreshResponse {
    access_token: string;
    token_type: 'bearer';
  }
  
  export interface UpdateProfileRequest {
    clinic_name?: string;
    medical_registration_number?: string;
    experience?: number;
    location?: string;
  }
  
  // Transcription Types
  export interface TranscriptionMessage {
    type: 'transcription' | 'error';
    transcript?: string;
    is_final?: boolean;
    confidence?: number;
    speaker_tag?: number;
    message?: string;
  }
  
  export interface TranscriptionResult {
    id: string;
    text: string;
    isFinal: boolean;
    confidence?: number;
    speakerTag?: number;
    timestamp: Date;
  }
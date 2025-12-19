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
    role: 'user' | 'admin';
  }
  
  export type FilterType = 'All' | 'Pending' | 'Completed';
  
  // API Types
  export interface SignupRequest {
    name: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface Clinic {
    id?: number;
    name?: string;
    clinic_name?: string;
    [key: string]: any; // Allow for additional clinic properties
  }

  export interface DoctorInfo {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string;
    specialty?: string | null;
    clinic_name?: string | null; // Kept for backward compatibility, will be derived from clinics
    medical_registration_number?: string | null;
    experience?: string | null; // Changed to string to match API response
    location?: string | null;
    clinics?: Clinic[]; // New clinics array
  }
  
  export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: DoctorInfo; // Changed from doctor to user
  }
  
  export interface RefreshResponse {
    access_token: string;
    token_type: 'bearer';
  }
  
  export interface UpdateProfileRequest {
    name?: string;
    specialty?: string;
    medical_registration_number?: string;
    experience?: string;
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
    transcript_id?: number; // ID from backend
  }
  
  export interface TranscriptionResult {
    id: string;
    text: string;
    isFinal: boolean;
    confidence?: number;
    speakerTag?: number;
    timestamp: Date;
    transcriptId?: number; // Backend transcript ID for summary API
  }
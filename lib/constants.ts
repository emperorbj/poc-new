// lib/constants.ts

export const API_BASE_URL = 'https://meera-bot-v2.onrender.com';

export const API_ENDPOINTS = {
  SIGNUP: '/api/v1/auth/signup',
  LOGIN: '/api/v1/auth/login',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH: '/api/v1/auth/refresh',
  PROFILE: '/api/v1/auth/profile',
};

export const WS_ENDPOINTS = {
  TRANSCRIPTION: 'wss://meera-bot-v2.onrender.com/api/v1/transcription/ws/transcribe',
};

export const COLORS = {
  primary: '#2E37A4',
  secondary: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
};

export const SPECIALTIES = [
  'Gynecology',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'General Medicine',
  'Neurology',
  'Psychiatry',
  'Ophthalmology',
  'ENT',
  'Other',
];

export const EXPERIENCE_OPTIONS = [
  'Less than 1 year',
  '1-3 years',
  '3-5 years',
  '5-10 years',
  '10-15 years',
  '15-20 years',
  '20+ years',
];

export const COMPLAINTS = [
  'bleeding',
  'missed periods',
  'discharge',
  'headache',
  'fever',
  'cold',
];

// Map experience text to numbers for API
export const EXPERIENCE_MAP: Record<string, number> = {
  'Less than 1 year': 0,
  '1-3 years': 2,
  '3-5 years': 4,
  '5-10 years': 7,
  '10-15 years': 12,
  '15-20 years': 17,
  '20+ years': 25,
};
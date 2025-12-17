// lib/utils/tokenStorage.ts

import { DoctorInfo, TenantDetails } from '@/types';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const DOCTOR_KEY = 'doctor_data';
const TENANT_KEY = 'tenant_details';
const PROFILE_COMPLETE_KEY = 'profile_complete';

export const tokenStorage = {
  // Tokens
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // Doctor Data
  setDoctorData(doctor: DoctorInfo): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DOCTOR_KEY, JSON.stringify(doctor));
    console.log('💾 Doctor data saved to localStorage');
  },

  getDoctorData(): DoctorInfo | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(DOCTOR_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Tenant Details
  setTenantDetails(tenantDetails: TenantDetails): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TENANT_KEY, JSON.stringify(tenantDetails));
    console.log('💾 Tenant details saved to localStorage');
  },

  getTenantDetails(): TenantDetails | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(TENANT_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Profile Complete Status
  setProfileComplete(isComplete: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROFILE_COMPLETE_KEY, JSON.stringify(isComplete));
    console.log('💾 Profile complete status saved:', isComplete);
  },

  getProfileComplete(): boolean {
    if (typeof window === 'undefined') return false;
    const data = localStorage.getItem(PROFILE_COMPLETE_KEY);
    return data ? JSON.parse(data) : false;
  },

  // Clear All
  clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(DOCTOR_KEY);
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(PROFILE_COMPLETE_KEY);
    console.log('🗑️ All storage cleared');
  },
};
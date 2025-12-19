// lib/api/auth.ts

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import {
  SignupRequest,
  LoginRequest,
  AuthResponse,
  RefreshResponse,
  UpdateProfileRequest,
  DoctorInfo,
} from '@/types';

// Map external API endpoints to local API routes
const getApiUrl = (endpoint: string) => {
  if (typeof window === 'undefined') {
    // Server-side: use external API directly
    return `${API_BASE_URL}${endpoint}`;
  }
  // Client-side: use local API routes
  // Map /api/v1/auth/* to /api/auth/*
  const localEndpoint = endpoint.replace('/api/v1/auth', '/auth');
  return `/api${localEndpoint}`;
};

// Helper function to parse error responses
function parseErrorResponse(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  // Handle validation errors (422) - detail is an array
  if (error.detail && Array.isArray(error.detail)) {
    const messages = error.detail.map((err: any) => {
      const loc = Array.isArray(err.loc) ? err.loc.join('.') : '';
      const msg = err.msg || 'Validation error';
      return loc ? `${loc}: ${msg}` : msg;
    });
    return messages.join('; ');
  }

  // Handle string detail
  if (error.detail && typeof error.detail === 'string') {
    return error.detail;
  }

  // Handle message field
  if (error.message) {
    return error.message;
  }

  return 'An error occurred';
}

class AuthService {
  async signup(data: SignupRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.SIGNUP), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let error: any;
        try {
          error = await response.json();
        } catch {
          error = { detail: `Signup failed with status ${response.status}` };
        }
        const errorMessage = parseErrorResponse(error);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Signup error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Signup failed');
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const url = getApiUrl(API_ENDPOINTS.LOGIN);
      console.log('📤 Login API call to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
        cache: 'no-store', // Prevent caching
      });

      console.log('📥 Login API response status:', response.status);

      if (!response.ok) {
        let error: any;
        try {
          error = await response.json();
        } catch {
          error = { detail: `Login failed with status ${response.status}` };
        }
        const errorMessage = parseErrorResponse(error);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Login API response received');
      return result;
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // API expects refresh_token as query parameter
      const baseUrl = getApiUrl(API_ENDPOINTS.LOGOUT);
      // Handle both relative and absolute URLs
      const url = baseUrl.startsWith('http') 
        ? new URL(baseUrl)
        : new URL(baseUrl, window.location.origin);
      url.searchParams.append('refresh_token', refreshToken);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Logout warning:', await response.text());
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.REFRESH), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        let error: any;
        try {
          error = await response.json();
        } catch {
          error = { detail: `Token refresh failed with status ${response.status}` };
        }
        const errorMessage = parseErrorResponse(error);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Token refresh error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Token refresh failed');
    }
  }

  async getProfile(accessToken: string): Promise<DoctorInfo> {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.PROFILE), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please login again');
        }
        let error: any;
        try {
          error = await response.json();
        } catch {
          error = { detail: `Failed to get profile with status ${response.status}` };
        }
        const errorMessage = parseErrorResponse(error);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Get profile error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get profile');
    }
  }

  async updateProfile(
    accessToken: string,
    data: UpdateProfileRequest
  ): Promise<DoctorInfo> {
    try {
      // Build request body with only non-empty fields
      const body: Record<string, string> = {};
      
      // Only include fields that have actual values (not empty strings or undefined)
      if (data.name !== undefined && data.name.trim() !== '') {
        body.name = data.name.trim();
      }
      if (data.specialty !== undefined && data.specialty.trim() !== '') {
        body.specialty = data.specialty.trim();
      }
      if (data.medical_registration_number !== undefined && data.medical_registration_number.trim() !== '') {
        body.medical_registration_number = data.medical_registration_number.trim();
      }
      if (data.experience !== undefined && data.experience.trim() !== '') {
        body.experience = data.experience.trim(); // API expects string
      }
      if (data.location !== undefined && data.location.trim() !== '') {
        body.location = data.location.trim();
      }

      // Ensure we have at least one field to update
      if (Object.keys(body).length === 0) {
        throw new Error('No valid fields provided for profile update');
      }

      console.log('📤 Sending profile update request:', {
        url: getApiUrl(API_ENDPOINTS.PROFILE),
        method: 'PATCH',
        body: body,
        hasAuth: !!accessToken,
      });

      const response = await fetch(getApiUrl(API_ENDPOINTS.PROFILE), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please login again');
        }
        let error: any;
        try {
          error = await response.json();
          console.error('❌ Profile update API error response:', {
            status: response.status,
            error: error,
          });
        } catch {
          error = { detail: `Profile update failed with status ${response.status}` };
        }
        const errorMessage = parseErrorResponse(error);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Profile update error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Profile update failed');
    }
  }
}

export const authService = new AuthService();
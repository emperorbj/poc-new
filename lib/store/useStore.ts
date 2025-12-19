// lib/store/useStore.ts

import { create } from 'zustand';
import {
  Patient,
  Consultation,
  TenantDetails,
  UserRegistration,
  DoctorInfo,
  UpdateProfileRequest,
} from '@/types';
import { authService } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/utils/tokenStorage';
import { EXPERIENCE_MAP } from '@/lib/constants';

interface AppState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isProfileComplete: boolean;
  doctorInfo: DoctorInfo | null;
  userRegistration: UserRegistration | null;
  tenantDetails: TenantDetails | null;
  consultations: Consultation[];
  currentConsultation: Consultation | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  register: (userData: UserRegistration) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>;
  setTenantDetails: (details: TenantDetails) => Promise<void>;
  updateDoctorProfile: (data: UpdateProfileRequest) => Promise<void>;
  addConsultation: (patient: Patient) => void;
  updateConsultation: (id: string, updates: Partial<Consultation>) => void;
  setCurrentConsultation: (consultation: Consultation | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  isInitialized: false,
  isProfileComplete: false,
  doctorInfo: null,
  userRegistration: null,
  tenantDetails: null,
  consultations: [],
  currentConsultation: null,
  accessToken: null,
  refreshToken: null,

  register: async (userData) => {
    try {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(userData.password)) {
        throw new Error(
          'Password must be at least 8 characters with uppercase, lowercase, digit, and special character'
        );
      }

      const response = await authService.signup({
        name: userData.doctorName,
        email: userData.email,
        password: userData.password,
        role: userData.role,
      });

      tokenStorage.setTokens(response.access_token, response.refresh_token);
      
      // Extract clinic_name from clinics array if available
      const clinicName = response.user.clinics?.[0]?.name || response.user.clinics?.[0]?.clinic_name || null;
      const doctorData = {
        ...response.user,
        clinic_name: clinicName || response.user.clinic_name,
      };
      
      tokenStorage.setDoctorData(doctorData);
      tokenStorage.setProfileComplete(false);

      console.log('✅ Registration successful - Profile incomplete');

      set({
        isAuthenticated: true,
        isProfileComplete: false,
        doctorInfo: doctorData,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        userRegistration: userData,
      });
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  login: async (email, password) => {
    try {
      console.log('📤 Starting login request...');
      const response = await authService.login({ email, password });
      console.log('✅ Login API response received');

      tokenStorage.setTokens(response.access_token, response.refresh_token);
      
      // Check for stored tenant details first (indicates profile was completed before)
      const storedTenantData = tokenStorage.getTenantDetails();
      const storedProfileComplete = tokenStorage.getProfileComplete();
      
      // Extract clinic_name from login response
      const clinicNameFromResponse = response.user.clinics?.[0]?.name || 
                                     response.user.clinics?.[0]?.clinic_name || 
                                     response.user.clinic_name || 
                                     null;
      
      let doctorData = {
        ...response.user,
        clinic_name: clinicNameFromResponse || response.user.clinic_name,
      };
      
      // Check if profile is complete from login response
      // Profile is complete if user has: medical_registration_number, location, specialty, and experience
      // OR if they have clinic_name and medical_registration_number (legacy check)
      let hasClinicInfo = Boolean(
        doctorData.medical_registration_number &&
        doctorData.location &&
        doctorData.specialty &&
        doctorData.experience
      ) || Boolean(
        doctorData.clinic_name && doctorData.medical_registration_number
      );

      // Try to fetch complete profile data from API (non-blocking)
      // This is optional - if it fails, we use login response data
      try {
        console.log('📤 Fetching profile data...');
        const profileData = await authService.getProfile(response.access_token);
        
        // Extract clinic_name from clinics array if available
        const clinicName = profileData.clinics?.[0]?.name || 
                          profileData.clinics?.[0]?.clinic_name || 
                          profileData.clinic_name || 
                          null;
        
        doctorData = {
          ...profileData,
          clinic_name: clinicName || profileData.clinic_name,
        };
        
        // Check if profile is complete based on fetched data
        // Profile is complete if user has: medical_registration_number, location, specialty, and experience
        // OR if they have clinic_name and medical_registration_number (legacy check)
        hasClinicInfo = Boolean(
          doctorData.medical_registration_number &&
          doctorData.location &&
          doctorData.specialty &&
          doctorData.experience
        ) || Boolean(
          doctorData.clinic_name && doctorData.medical_registration_number
        );
        
        console.log('✅ Profile fetched successfully');
      } catch (profileError) {
        console.warn('⚠️ Could not fetch profile, using login response:', profileError);
        // Continue with login response data - this is fine
      }

      // Determine profile completion status:
      // 1. If we have stored tenant details, profile was completed before
      // 2. If stored profile complete flag is true, use it
      // 3. Otherwise, check if current data has required profile info
      const isProfileComplete = storedProfileComplete || 
                               (storedTenantData !== null) || 
                               hasClinicInfo;

      tokenStorage.setDoctorData(doctorData);
      tokenStorage.setProfileComplete(isProfileComplete);

      // Use stored tenant data if available, otherwise null
      const tenantData = storedTenantData;

      console.log('🔍 Login - Profile status:', {
        hasClinicInfo,
        hasTenantData: !!tenantData,
        storedProfileComplete,
        isProfileComplete,
        hasClinicName: !!doctorData.clinic_name,
        hasMedicalReg: !!doctorData.medical_registration_number,
        hasLocation: !!doctorData.location,
        hasSpecialty: !!doctorData.specialty,
        hasExperience: !!doctorData.experience,
        profileFields: {
          medical_registration_number: doctorData.medical_registration_number,
          location: doctorData.location,
          specialty: doctorData.specialty,
          experience: doctorData.experience,
          clinic_name: doctorData.clinic_name,
        },
      });

      set({
        isAuthenticated: true,
        isProfileComplete: isProfileComplete,
        doctorInfo: doctorData,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tenantDetails: tenantData || null,
      });

      console.log('✅ Login successful', {
        isProfileComplete: isProfileComplete,
        hasTenantDetails: !!tenantData,
      });
    } catch (error: any) {
      console.error('❌ Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  },

  logout: async () => {
    try {
      const { refreshToken } = get();

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      tokenStorage.clearAll();

      set({
        isAuthenticated: false,
        isProfileComplete: false,
        doctorInfo: null,
        tenantDetails: null,
        userRegistration: null,
        accessToken: null,
        refreshToken: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      tokenStorage.clearAll();
      set({
        isAuthenticated: false,
        isProfileComplete: false,
        doctorInfo: null,
        tenantDetails: null,
        userRegistration: null,
        accessToken: null,
        refreshToken: null,
      });
    }
  },

  initializeSession: async () => {
    console.log('🔄 Initializing session...');

    try {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();
      const doctorData = tokenStorage.getDoctorData();
      const tenantData = tokenStorage.getTenantDetails();
      const profileComplete = tokenStorage.getProfileComplete();

      console.log('📦 Retrieved data:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasDoctorData: !!doctorData,
        hasTenantData: !!tenantData,
        profileComplete,
      });

      if (accessToken && refreshToken && doctorData) {
        set({
          isAuthenticated: true,
          isProfileComplete: profileComplete,
          accessToken,
          refreshToken,
          doctorInfo: doctorData,
          tenantDetails: tenantData || null,
          isInitialized: true,
        });
        console.log('✅ Session initialized', {
          profileComplete,
          hasTenantDetails: !!tenantData,
        });
      } else {
        set({ isInitialized: true });
        console.log('ℹ️ No existing session found');
      }
    } catch (error) {
      console.error('❌ Session initialization error:', error);
      set({ isInitialized: true });
    }
  },

  setTenantDetails: async (details) => {
    try {
      const { accessToken, doctorInfo, userRegistration } = get();

      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Validate required fields
      if (!details.medicalRegistrationNumber || !details.yearsOfExperience || !details.locationName) {
        throw new Error('Please fill in all required fields');
      }

      // API expects experience as string (number as string)
      const experienceNumber = EXPERIENCE_MAP[details.yearsOfExperience];
      if (experienceNumber === undefined) {
        throw new Error('Invalid years of experience selected');
      }
      
      // Get name and specialty from available sources, but don't send empty strings
      const doctorName = details.doctorName || doctorInfo?.name || userRegistration?.doctorName;
      const doctorSpecialty = details.specialty || doctorInfo?.specialty || userRegistration?.specialty;
      
      if (!doctorName || !doctorSpecialty) {
        throw new Error('Doctor name and specialty are required');
      }
      
      const updateData: UpdateProfileRequest = {
        name: doctorName,
        specialty: doctorSpecialty,
        medical_registration_number: details.medicalRegistrationNumber.trim(),
        experience: experienceNumber.toString(), // API expects string (number as string)
        location: details.locationName.trim(),
      };

      console.log('📤 Updating profile with:', updateData);
      console.log('🔑 Using access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING');

      // Try to refresh the profile first to ensure session is fresh (workaround for backend session issue)
      try {
        await authService.getProfile(accessToken);
        console.log('✅ Profile session refreshed');
      } catch (refreshError) {
        console.warn('⚠️ Could not refresh profile before update:', refreshError);
        // Continue anyway - this is just a workaround attempt
      }

      const updatedDoctor = await authService.updateProfile(accessToken, updateData);

      console.log('✅ Profile updated successfully:', updatedDoctor);

      // Extract clinic_name from clinics array if available
      const clinicName = updatedDoctor.clinics?.[0]?.name || updatedDoctor.clinics?.[0]?.clinic_name || null;
      const doctorData = {
        ...updatedDoctor,
        clinic_name: clinicName || updatedDoctor.clinic_name,
      };

      tokenStorage.setDoctorData(doctorData);
      tokenStorage.setTenantDetails(details);
      tokenStorage.setProfileComplete(true);

      set({
        tenantDetails: details,
        doctorInfo: doctorData,
        isProfileComplete: true,
      });

      console.log('✅ Profile saved to storage and state');
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      throw error;
    }
  },

  updateDoctorProfile: async (data) => {
    try {
      const { accessToken } = get();

      if (!accessToken) {
        throw new Error('No access token available');
      }

      const updatedDoctor = await authService.updateProfile(accessToken, data);

      // Extract clinic_name from clinics array if available
      const clinicName = updatedDoctor.clinics?.[0]?.name || updatedDoctor.clinics?.[0]?.clinic_name || null;
      const doctorData = {
        ...updatedDoctor,
        clinic_name: clinicName || updatedDoctor.clinic_name,
      };

      tokenStorage.setDoctorData(doctorData);

      set({ doctorInfo: doctorData });

      console.log('✅ Doctor profile updated');
    } catch (error) {
      console.error('❌ Error updating doctor profile:', error);
      throw error;
    }
  },

  addConsultation: (patient) =>
    set((state) => ({
      consultations: [
        ...state.consultations,
        {
          id: Date.now().toString(),
          patient,
          status: 'Pending',
          reviewed: false,
        },
      ],
    })),

  updateConsultation: (id, updates) =>
    set((state) => {
      const updatedConsultations = state.consultations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      
      // Also update currentConsultation if it's the one being updated
      const updatedCurrentConsultation = 
        state.currentConsultation?.id === id
          ? { ...state.currentConsultation, ...updates }
          : state.currentConsultation;
      
      console.log('📝 Updating consultation:', {
        id,
        updates,
        hasCurrentConsultation: !!updatedCurrentConsultation,
        transcription: updates.transcription?.substring(0, 100),
      });
      
      return {
        consultations: updatedConsultations,
        currentConsultation: updatedCurrentConsultation,
      };
    }),

  setCurrentConsultation: (consultation) =>
    set({ currentConsultation: consultation }),
}));
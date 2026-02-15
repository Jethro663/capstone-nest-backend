/**
 * Auth Service - Server Side
 * 
 * Methods for authentication operations
 * Used by Server Actions to communicate with backend
 */

import { api } from './api-client';

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  role?: 'student' | 'teacher';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyEmailData {
  email: string;
  code: string;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  civilStatus?: string;
  dateOfBirth?: string;
  address?: string;
  gradeLevel?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: any;
    accessToken?: string;
    refreshToken?: string;
  };
  user?: any;
  accessToken?: string;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/register', data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Registration failed',
    };
  }
}

/**
 * Verify email with OTP
 */
export async function verifyEmail(data: VerifyEmailData): Promise<AuthResponse> {
  try {
    const response = await api.post('/otp/verify', data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Verification failed',
    };
  }
}

/**
 * Resend OTP to email
 */
export async function resendOTP(email: string): Promise<AuthResponse> {
  try {
    const response = await api.post('/otp/resend', { email });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Failed to resend OTP',
    };
  }
}

/**
 * Login user with email and password
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/login', data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Login failed',
    };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Failed to get user',
    };
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/logout', {});
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Logout failed',
    };
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Failed to request password reset',
    };
  }
}

/**
 * Reset password with code
 */
export async function resetPassword(data: ResetPasswordData): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Failed to reset password',
    };
  }
}

/**
 * Change password (authenticated user)
 */
export async function changePassword(data: ChangePasswordData): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Failed to change password',
    };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(data: UpdateProfileData): Promise<AuthResponse> {
  try {
    const response = await api.patch('/user-profiles', data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: error.message || 'Failed to update profile',
    };
  }
}

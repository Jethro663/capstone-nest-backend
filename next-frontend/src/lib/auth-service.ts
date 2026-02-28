/**
 * Auth Service
 *
 * Thin wrappers around backend auth endpoints.
 * Matches backend response shapes exactly:
 *   login  → { success, message, data: { user, accessToken } }   (refreshToken is httpOnly cookie)
 *   refresh → { success, message, data: { accessToken } }
 *   me     → { success, data: { user } }
 *   profile → PATCH /auth/profile → { success, message, data: { user } }
 *
 * No self‑registration — accounts are created by admin.
 */

import { api } from './api-client';
import type { User } from '@/types/user';
import type { UpdateProfileDto } from '@/types/profile';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user?: User;
    accessToken?: string;
  };
}

// ---------------------------------------------------------------------------
// Login / Logout
// ---------------------------------------------------------------------------

export async function login(data: { email: string; password: string }): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/login', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Login failed' };
  }
}

export async function logout(): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/logout', {});
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Logout failed' };
  }
}

export async function logoutAll(): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/logout-all', {});
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Logout all failed' };
  }
}

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Failed to get user' };
  }
}

// ---------------------------------------------------------------------------
// OTP / Verification
// ---------------------------------------------------------------------------

export async function verifyEmail(data: { email: string; code: string }): Promise<AuthResponse> {
  try {
    const response = await api.post('/otp/verify', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Verification failed' };
  }
}

export async function resendOTP(email: string): Promise<AuthResponse> {
  try {
    const response = await api.post('/otp/resend', { email });
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Failed to resend OTP' };
  }
}

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

export async function forgotPassword(email: string): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Failed to request password reset' };
  }
}

export async function resetPassword(data: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Failed to reset password' };
  }
}

export async function setInitialPassword(data: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/set-initial-password', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Failed to set initial password' };
  }
}

export async function setActivationPassword(data: {
  email: string;
  newPassword: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/set-activation-password', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Failed to set password' };
  }
}

export async function changePassword(data: {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Failed to change password' };
  }
}

// ---------------------------------------------------------------------------
// Validate credentials (for pre‑login checks on unverified accounts)
// ---------------------------------------------------------------------------

export async function validateCredentials(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/validate-credentials', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Invalid credentials' };
  }
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfile(data: UpdateProfileDto): Promise<AuthResponse> {
  try {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data ?? { success: false, message: error.message || 'Failed to update profile' };
  }
}

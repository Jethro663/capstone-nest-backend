/**
 * Auth Service
 *
 * Thin wrappers around backend auth endpoints.
 * Matches backend response shapes exactly:
 *   login  -> { success, message, data: { user, accessToken } }   (refreshToken is httpOnly cookie)
 *   refresh -> { success, message, data: { accessToken } }
 *   me     -> { success, data: { user } }
 *   profile -> PATCH /auth/profile -> { success, message, data: { user } }
 *
 * No self-registration - accounts are created by admin.
 */

import { isAxiosError } from 'axios';
import { api, type ApiRequestConfig } from './api-client';
import type { UpdateProfileDto } from '@/types/profile';
import type { User } from '@/types/user';

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user?: User;
    accessToken?: string;
  };
}

type AuthErrorResponse = AuthResponse & {
  errors?: unknown;
};

const publicAuthRequestConfig: ApiRequestConfig = {
  withCredentials: true,
  skipAuthRefresh: true,
  skipSessionExpiredRedirect: true,
};

function toAuthErrorResponse(
  error: unknown,
  fallbackMessage: string,
): AuthErrorResponse {
  if (isAxiosError<AuthErrorResponse>(error)) {
    return error.response?.data ?? {
      success: false,
      message: error.message || fallbackMessage,
    };
  }

  if (error instanceof Error) {
    return { success: false, message: error.message || fallbackMessage };
  }

  return { success: false, message: fallbackMessage };
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/login', data, publicAuthRequestConfig);
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Login failed');
  }
}

export async function logout(): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/logout', {});
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Logout failed');
  }
}

export async function logoutAll(): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/logout-all', {});
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Logout all failed');
  }
}

export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Failed to get user');
  }
}

export async function verifyEmail(data: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post('/otp/verify', data, publicAuthRequestConfig);
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Verification failed');
  }
}

export async function resendOTP(email: string): Promise<AuthResponse> {
  try {
    const response = await api.post('/otp/resend', { email }, publicAuthRequestConfig);
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Failed to resend OTP');
  }
}

export async function forgotPassword(email: string): Promise<AuthResponse> {
  try {
    const response = await api.post(
      '/auth/forgot-password',
      { email },
      publicAuthRequestConfig,
    );
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Failed to request password reset');
  }
}

export async function resetPassword(data: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post(
      '/auth/reset-password',
      data,
      publicAuthRequestConfig,
    );
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Failed to reset password');
  }
}

export async function setInitialPassword(data: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post(
      '/auth/set-initial-password',
      data,
      publicAuthRequestConfig,
    );
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Failed to set initial password');
  }
}

export async function setActivationPassword(data: {
  email: string;
  newPassword: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post(
      '/auth/set-activation-password',
      data,
      publicAuthRequestConfig,
    );
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Failed to set password');
  }
}

export async function changePassword(data: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Failed to change password');
  }
}

export async function validateCredentials(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  try {
    const response = await api.post(
      '/auth/validate-credentials',
      data,
      publicAuthRequestConfig,
    );
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Invalid credentials');
  }
}

export async function updateProfile(
  data: UpdateProfileDto,
): Promise<AuthResponse> {
  try {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  } catch (error: unknown) {
    throw toAuthErrorResponse(error, 'Failed to update profile');
  }
}

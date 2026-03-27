/**
 * Auth Actions (Client-side helpers)
 *
 * These are plain async functions (NOT Server Actions) that call auth-service
 * and manage the in-memory access token on the client.
 *
 * The backend sets / clears the httpOnly refreshToken cookie itself -
 * we never touch cookies from the frontend.
 */

import { clearAccessToken, setAccessToken } from './api-client';
import * as authService from './auth-service';
import type { UpdateProfileDto } from '@/types/profile';

type ActionErrorResult = {
  success: false;
  message: string;
  errors?: unknown;
};

function toActionError(
  error: unknown,
  fallbackMessage: string,
): ActionErrorResult {
  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>;
    return {
      success: false,
      message:
        typeof errorRecord.message === 'string' && errorRecord.message.length > 0
          ? errorRecord.message
          : fallbackMessage,
      errors: errorRecord.errors,
    };
  }

  if (error instanceof Error) {
    return { success: false, message: error.message || fallbackMessage };
  }

  return { success: false, message: fallbackMessage };
}

export async function loginAction(formData: {
  email: string;
  password: string;
}) {
  try {
    const response = await authService.login(formData);

    if (!response.success) {
      return { success: false, message: response.message || 'Login failed' };
    }

    const accessToken = response.data?.accessToken;
    const userData = response.data?.user;

    if (!accessToken) {
      return { success: false, message: 'No access token in response' };
    }

    setAccessToken(accessToken);

    return { success: true, message: 'Login successful', user: userData };
  } catch (error: unknown) {
    return toActionError(error, 'Login failed. Please try again.');
  }
}

export async function logoutAction() {
  try {
    await authService.logout();
  } catch {
    // Continue even if backend call fails.
  }

  clearAccessToken();
  window.location.href = '/login';
}

export async function logoutAllAction() {
  try {
    await authService.logoutAll();
  } catch {
    // Continue even if backend call fails.
  }

  clearAccessToken();
  window.location.href = '/login';
}

export async function getCurrentUserAction() {
  try {
    const response = await authService.getCurrentUser();
    if (!response.success) {
      return { success: false, user: null };
    }

    return { success: true, user: response.data?.user ?? null };
  } catch {
    return { success: false, user: null };
  }
}

export async function verifyEmailAction(formData: {
  email: string;
  code: string;
}) {
  try {
    const response = await authService.verifyEmail(formData);
    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Verification failed',
      };
    }

    return { success: true, message: 'Email verified successfully.' };
  } catch (error: unknown) {
    return toActionError(error, 'Verification failed. Please try again.');
  }
}

export async function resendOTPAction(email: string) {
  try {
    const response = await authService.resendOTP(email);
    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Failed to resend OTP',
      };
    }

    return { success: true, message: 'OTP sent to your email' };
  } catch (error: unknown) {
    return toActionError(error, 'Failed to resend OTP. Please try again.');
  }
}

export async function forgotPasswordAction(email: string) {
  try {
    const response = await authService.forgotPassword(email);
    if (!response.success) {
      return { success: false, message: response.message || 'Request failed' };
    }

    return { success: true, message: response.message };
  } catch (error: unknown) {
    return toActionError(error, 'Failed to request password reset.');
  }
}

export async function resetPasswordAction(formData: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    const response = await authService.resetPassword(formData);
    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Password reset failed',
      };
    }

    return {
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    };
  } catch (error: unknown) {
    return toActionError(error, 'Password reset failed. Please try again.');
  }
}

export async function setInitialPasswordAction(formData: {
  email: string;
  code: string;
  newPassword: string;
}) {
  try {
    const response = await authService.setInitialPassword(formData);
    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Failed to set password',
      };
    }

    return {
      success: true,
      message: 'Password set successfully. You can now log in.',
    };
  } catch (error: unknown) {
    return toActionError(error, 'Failed to set password. Please try again.');
  }
}

/**
 * Set activation password after OTP verification.
 */
export async function completeActivationPasswordAction(formData: {
  email: string;
  newPassword: string;
}) {
  try {
    const setResponse = await authService.setActivationPassword(formData);
    if (!setResponse.success) {
      return {
        success: false,
        message: setResponse.message || 'Failed to set password',
      };
    }

    return { success: true, message: 'Password set successfully' };
  } catch (error: unknown) {
    return toActionError(error, 'Failed to set password. Please try again.');
  }
}

export const setActivationPasswordAction = completeActivationPasswordAction;

export async function changePasswordAction(formData: {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    const response = await authService.changePassword({
      oldPassword: formData.oldPassword,
      newPassword: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Password change failed',
      };
    }

    return { success: true, message: 'Password changed successfully' };
  } catch (error: unknown) {
    return toActionError(error, 'Password change failed. Please try again.');
  }
}

export async function updateProfileAction(formData: UpdateProfileDto) {
  try {
    const response = await authService.updateProfile(formData);
    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Profile update failed',
      };
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      user: response.data?.user,
    };
  } catch (error: unknown) {
    return toActionError(error, 'Profile update failed. Please try again.');
  }
}

export async function validateCredentialsAction(formData: {
  email: string;
  password: string;
}) {
  try {
    const response = await authService.validateCredentials(formData);
    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Invalid credentials',
      };
    }

    return { success: true, message: 'Credentials valid' };
  } catch (error: unknown) {
    return toActionError(error, 'Invalid credentials');
  }
}

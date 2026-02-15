/**
 * Auth Server Actions
 * 
 * Server-side functions for authentication operations
 * Called from client-side forms to securely handle credentials & set cookies
 */

'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as authService from './auth-service';
import { setAccessToken } from './api-client';

const COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days
};

/**
 * Login Server Action
 */
export async function loginAction(formData: {
  email: string;
  password: string;
}) {
  try {
    const response = await authService.login(formData);

    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Login failed',
      };
    }

    const userData = response.data?.user || response.user;
    const accessToken = response.data?.accessToken || response.accessToken;
    const refreshToken = response.data?.refreshToken;

    if (!accessToken) {
      return {
        success: false,
        message: 'No access token in response',
      };
    }

    // Set access token in memory for API client
    setAccessToken(accessToken);

    // Set refresh token in httpOnly cookie
    if (refreshToken) {
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    }

    return {
      success: true,
      message: 'Login successful',
      user: userData,
    };
  } catch (error: any) {
    console.error('[LOGIN_ACTION] Error:', error);
    return {
      success: false,
      message: error.message || 'Login failed. Please try again.',
      errors: error.errors,
    };
  }
}

/**
 * Register Server Action
 */
export async function registerAction(formData: {
  email: string;
  password: string;
  confirmPassword: string;
  role?: 'student' | 'teacher';
}) {
  try {
    const response = await authService.register(formData);

    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Registration failed',
      };
    }

    return {
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      email: formData.email,
    };
  } catch (error: any) {
    console.error('[REGISTER_ACTION] Error:', error);
    return {
      success: false,
      message: error.message || 'Registration failed. Please try again.',
      errors: error.errors,
    };
  }
}

/**
 * Verify Email Server Action
 */
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

    return {
      success: true,
      message: 'Email verified successfully. Please login.',
    };
  } catch (error: any) {
    console.error('[VERIFY_EMAIL_ACTION] Error:', error);
    return {
      success: false,
      message: error.message || 'Verification failed. Please try again.',
    };
  }
}

/**
 * Resend OTP Server Action
 */
export async function resendOTPAction(email: string) {
  try {
    const response = await authService.resendOTP(email);

    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Failed to resend OTP',
      };
    }

    return {
      success: true,
      message: 'OTP sent to your email',
    };
  } catch (error: any) {
    console.error('[RESEND_OTP_ACTION] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to resend OTP. Please try again.',
    };
  }
}

/**
 * Reset Password Server Action
 */
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
  } catch (error: any) {
    console.error('[RESET_PASSWORD_ACTION] Error:', error);
    return {
      success: false,
      message: error.message || 'Password reset failed. Please try again.',
    };
  }
}

/**
 * Logout Server Action
 */
export async function logoutAction() {
  try {
    // Call backend to invalidate session
    await authService.logout();
  } catch (error) {
    console.error('[LOGOUT_ACTION] Error:', error);
    // Continue logout even if backend fails
  }

  // Clear refresh token cookie
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);

  // Redirect to login
  redirect('/login');
}

/**
 * Change Password Server Action
 */
export async function changePasswordAction(formData: {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    const response = await authService.changePassword(formData);

    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Password change failed',
      };
    }

    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error: any) {
    console.error('[CHANGE_PASSWORD_ACTION] Error:', error);
    return {
      success: false,
      message: error.message || 'Password change failed. Please try again.',
    };
  }
}

/**
 * Update Profile Server Action
 */
export async function updateProfileAction(formData: Record<string, any>) {
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
  } catch (error: any) {
    console.error('[UPDATE_PROFILE_ACTION] Error:', error);
    return {
      success: false,
      message: error.message || 'Profile update failed. Please try again.',
    };
  }
}

/**
 * Get Current User (for initial auth check)
 */
export async function getCurrentUserAction() {
  try {
    const response = await authService.getCurrentUser();

    if (!response.success) {
      return {
        success: false,
        user: null,
      };
    }

    const userData = response.data?.user || response.user;
    return {
      success: true,
      user: userData,
    };
  } catch (error: any) {
    console.error('[GET_CURRENT_USER_ACTION] Error:', error);
    return {
      success: false,
      user: null,
    };
  }
}

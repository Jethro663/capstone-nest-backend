/**
 * Auth Actions (Client‑side helpers)
 *
 * These are plain async functions (NOT Server Actions) that call auth-service
 * and manage the in‑memory access token on the client.
 *
 * The backend sets / clears the httpOnly refreshToken cookie itself —
 * we never touch cookies from the frontend.
 */

import * as authService from './auth-service';
import { setAccessToken, clearAccessToken } from './api-client';

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function loginAction(formData: { email: string; password: string }) {
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

    // Store access token in memory for the API client interceptor
    setAccessToken(accessToken);

    return { success: true, message: 'Login successful', user: userData };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Login failed. Please try again.',
      errors: error.errors,
    };
  }
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function logoutAction() {
  try {
    await authService.logout();
  } catch {
    // Continue even if backend call fails
  }
  clearAccessToken();
  window.location.href = '/login';
}

export async function logoutAllAction() {
  try {
    await authService.logoutAll();
  } catch {
    // Continue even if backend call fails
  }
  clearAccessToken();
  window.location.href = '/login';
}

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// OTP / Verification
// ---------------------------------------------------------------------------

export async function verifyEmailAction(formData: { email: string; code: string }) {
  try {
    const response = await authService.verifyEmail(formData);
    if (!response.success) {
      return { success: false, message: response.message || 'Verification failed' };
    }
    return { success: true, message: 'Email verified successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Verification failed. Please try again.' };
  }
}

export async function resendOTPAction(email: string) {
  try {
    const response = await authService.resendOTP(email);
    if (!response.success) {
      return { success: false, message: response.message || 'Failed to resend OTP' };
    }
    return { success: true, message: 'OTP sent to your email' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to resend OTP. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

export async function forgotPasswordAction(email: string) {
  try {
    const response = await authService.forgotPassword(email);
    if (!response.success) {
      return { success: false, message: response.message || 'Request failed' };
    }
    return { success: true, message: response.message };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to request password reset.' };
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
      return { success: false, message: response.message || 'Password reset failed' };
    }
    return { success: true, message: 'Password reset successfully. Please login with your new password.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Password reset failed. Please try again.' };
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
      return { success: false, message: response.message || 'Failed to set password' };
    }
    return { success: true, message: 'Password set successfully. You can now log in.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to set password. Please try again.' };
  }
}

/**
 * Set activation password (called AFTER OTP verification — no code needed).
 * Sets the password and returns success. User should be redirected to login page.
 */
export async function setActivationPasswordAction(formData: {
  email: string;
  newPassword: string;
}) {
  try {
    const setResponse = await authService.setActivationPassword(formData);
    if (!setResponse.success) {
      return { success: false, message: setResponse.message || 'Failed to set password' };
    }
    return { success: true, message: 'Password set successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to set password. Please try again.' };
  }
}

export async function changePasswordAction(formData: {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    const response = await authService.changePassword(formData);
    if (!response.success) {
      return { success: false, message: response.message || 'Password change failed' };
    }
    return { success: true, message: 'Password changed successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Password change failed. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfileAction(formData: Record<string, any>) {
  try {
    const response = await authService.updateProfile(formData);
    if (!response.success) {
      return { success: false, message: response.message || 'Profile update failed' };
    }
    return { success: true, message: 'Profile updated successfully', user: response.data?.user };
  } catch (error: any) {
    return { success: false, message: error.message || 'Profile update failed. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// Validate credentials (pre‑login check for unverified accounts)
// ---------------------------------------------------------------------------

export async function validateCredentialsAction(formData: { email: string; password: string }) {
  try {
    const response = await authService.validateCredentials(formData);
    if (!response.success) {
      return { success: false, message: response.message || 'Invalid credentials' };
    }
    return { success: true, message: 'Credentials valid' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Invalid credentials' };
  }
}

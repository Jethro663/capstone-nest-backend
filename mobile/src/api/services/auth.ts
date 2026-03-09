import { apiClient, clearAuthSession, publicClient, setAccessToken } from '@/api/client';
import { persistAccessToken } from '@/api/storage';
import { unwrapEnvelope } from '@/api/http';
import type {
  AuthSession,
  LoginPayload,
  ResetPasswordPayload,
  SetActivationPasswordPayload,
  VerifyEmailPayload,
} from '@/types/auth';
import type { ApiEnvelope } from '@/types/api';
import type { UpdateProfileDto } from '@/types/profile';
import type { User } from '@/types/user';

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const response = await publicClient.post<
      ApiEnvelope<{
        user: User;
        accessToken: string;
      }>
    >('/auth/login', payload);
    const data = unwrapEnvelope(response.data);
    setAccessToken(data.accessToken);
    await persistAccessToken(data.accessToken);
    return {
      accessToken: data.accessToken,
      user: data.user,
    };
  },

  async logout() {
    await apiClient.post('/auth/logout', {});
    await clearAuthSession();
  },

  async getCurrentUser() {
    const response = await apiClient.get<ApiEnvelope<{ user: User }>>('/auth/me');
    return unwrapEnvelope(response.data).user;
  },

  async forgotPassword(email: string) {
    await publicClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(payload: ResetPasswordPayload) {
    await publicClient.post('/auth/reset-password', payload);
  },

  async validateCredentials(payload: LoginPayload) {
    await publicClient.post('/auth/validate-credentials', payload);
  },

  async verifyEmail(payload: VerifyEmailPayload) {
    await publicClient.post('/otp/verify', payload);
  },

  async resendOtp(email: string) {
    await publicClient.post('/otp/resend', { email });
  },

  async setActivationPassword(payload: SetActivationPasswordPayload) {
    await publicClient.post('/auth/set-activation-password', payload);
  },

  async updateProfile(payload: UpdateProfileDto) {
    const response = await apiClient.patch<ApiEnvelope<{ user: User }>>('/auth/profile', payload);
    return unwrapEnvelope(response.data).user;
  },

  async changePassword(payload: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    await apiClient.post('/auth/change-password', payload);
  },
};

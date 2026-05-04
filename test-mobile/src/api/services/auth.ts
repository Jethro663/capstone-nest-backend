import { apiClient, clearAuthSession, getRefreshToken, persistAuthTokens, publicClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  AuthSession,
  ForgotPasswordPayload,
  LoginPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  SetActivationPasswordPayload,
  ValidateCredentialsPayload,
  VerifyOtpPayload,
} from "../../types/auth";
import type { UpdateProfileDto } from "../../types/profile";
import type { User } from "../../types/user";

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const response = await publicClient.post<
      ApiEnvelope<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>
    >("/auth/mobile/login", payload);

    const data = unwrapEnvelope(response.data);
    await persistAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    };
  },

  async logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await publicClient.post("/auth/mobile/logout", { refreshToken });
    }
    await clearAuthSession();
  },

  async getCurrentUser() {
    const response = await apiClient.get<ApiEnvelope<{ user: User }>>("/auth/me");
    return unwrapEnvelope(response.data).user;
  },

  async updateProfile(payload: UpdateProfileDto) {
    const response = await apiClient.patch<ApiEnvelope<{ user: User }>>("/auth/profile", payload);
    return unwrapEnvelope(response.data).user;
  },

  async validateCredentials(payload: ValidateCredentialsPayload) {
    const response = await publicClient.post<ApiEnvelope<{ valid: boolean }>>("/auth/validate-credentials", payload);
    return unwrapEnvelope(response.data).valid;
  },

  async verifyEmail(payload: VerifyOtpPayload) {
    const response = await publicClient.post<ApiEnvelope<{ verified?: boolean }>>("/otp/verify", payload);
    return unwrapEnvelope(response.data);
  },

  async resendOtp(payload: ResendOtpPayload) {
    const response = await publicClient.post<ApiEnvelope<{ sent?: boolean }>>("/otp/resend", payload);
    return unwrapEnvelope(response.data);
  },

  async forgotPassword(payload: ForgotPasswordPayload) {
    const response = await publicClient.post<ApiEnvelope<{ sent?: boolean }>>("/auth/forgot-password", payload);
    return unwrapEnvelope(response.data);
  },

  async resetPassword(payload: ResetPasswordPayload) {
    const response = await publicClient.post<ApiEnvelope<{ success?: boolean }>>("/auth/reset-password", payload);
    return unwrapEnvelope(response.data);
  },

  async setActivationPassword(payload: SetActivationPasswordPayload) {
    const response = await publicClient.post<ApiEnvelope<{ success?: boolean }>>("/auth/set-activation-password", payload);
    return unwrapEnvelope(response.data);
  },
};

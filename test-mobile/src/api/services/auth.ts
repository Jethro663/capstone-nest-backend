import { apiClient, clearAuthSession, getRefreshToken, persistAuthTokens, publicClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { AuthSession, LoginPayload } from "../../types/auth";
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
};

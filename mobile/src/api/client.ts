import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./config";
import {
  clearSecureSession,
  persistAccessToken,
  persistRefreshToken,
  readAccessToken,
  readRefreshToken,
} from "./storage";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

async function hydrateTokens() {
  if (!accessToken) {
    accessToken = await readAccessToken();
  }

  if (!refreshToken) {
    refreshToken = await readRefreshToken();
  }
}

export async function persistAuthTokens(tokens: { accessToken: string | null; refreshToken: string | null }) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await Promise.all([persistAccessToken(tokens.accessToken), persistRefreshToken(tokens.refreshToken)]);
}

export const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const apiClient = createApiClient();

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    await hydrateTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | null;

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !String(originalRequest.url ?? "").includes("/auth/mobile/refresh")
      ) {
        originalRequest._retry = true;

        if (!refreshPromise) {
          refreshPromise = refreshSession();
        }

        const nextTokens = await refreshPromise;
        refreshPromise = null;

        if (nextTokens?.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${nextTokens.accessToken}`;
          return client(originalRequest);
        }

        await clearAuthSession();
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export async function refreshSession() {
  await hydrateTokens();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await publicClient.post("/auth/mobile/refresh", {
      refreshToken,
    });
    const nextAccessToken = response.data?.data?.accessToken ?? null;
    const nextRefreshToken = response.data?.data?.refreshToken ?? null;

    if (!nextAccessToken || !nextRefreshToken) {
      await clearAuthSession();
      return null;
    }

    await persistAuthTokens({
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    });

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    };
  } catch {
    await clearAuthSession();
    return null;
  }
}

export async function clearAuthSession() {
  accessToken = null;
  refreshToken = null;
  await clearSecureSession();
}

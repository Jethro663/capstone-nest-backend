import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/api/config';
import { clearSecureSession, persistAccessToken, readAccessToken } from '@/api/storage';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export const apiClient = createApiClient();
export const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (!accessToken) {
      accessToken = await readAccessToken();
    }
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as (InternalAxiosRequestConfig & {
        _retry?: boolean;
      }) | null;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        if (!refreshPromise) {
          refreshPromise = refreshSession();
        }

        const nextToken = await refreshPromise;
        refreshPromise = null;

        if (nextToken) {
          originalRequest.headers.Authorization = `Bearer ${nextToken}`;
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
  try {
    const response = await publicClient.post('/auth/refresh', {});
    const nextToken = response.data?.data?.accessToken ?? response.data?.accessToken ?? null;
    setAccessToken(nextToken);
    await persistAccessToken(nextToken);
    return nextToken;
  } catch {
    setAccessToken(null);
    await persistAccessToken(null);
    return null;
  }
}

export async function clearAuthSession() {
  setAccessToken(null);
  await clearSecureSession();
}

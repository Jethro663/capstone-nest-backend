/**
 * API Client for Next.js
 * 
 * Wraps axios with:
 * - Automatic token management (from cookies)
 * - Token refresh interceptor
 * - Error handling
 * - Base URL configuration
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

let accessToken: string | null = null;

export interface ApiRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
  skipSessionExpiredRedirect?: boolean;
}

export type ApiRequestOptions = Pick<
  ApiRequestConfig,
  'skipAuthRefresh' | 'skipSessionExpiredRedirect'
>;

/**
 * Create axios instance with base configuration
 */
export function createApiClient(): AxiosInstance {
  // Use relative URL so requests go through the Next.js rewrite proxy,
  // ensuring cookies are set on the same origin as the frontend.
  const baseURL = '/api';

  const api = axios.create({
    baseURL,
    withCredentials: true, // Send httpOnly cookies with requests
    timeout: 30000,
  });

  // Request interceptor: add authorization header
  api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor: handle 401 and token refresh
  let refreshPromise: Promise<string | null> | null = null;

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as ApiRequestConfig | undefined;

      if (!originalRequest) {
        return Promise.reject(error);
      }

      // If 401 and not already retried
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.skipAuthRefresh
      ) {
        originalRequest._retry = true;

        // Prevent multiple refresh attempts
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken();
        }

        try {
          const newToken = await refreshPromise;
          refreshPromise = null;

          if (newToken) {
            accessToken = newToken;
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } else {
            // Refresh failed (expired/invalid refresh token) → force re-login
            accessToken = null;
            if (
              typeof window !== 'undefined' &&
              !originalRequest.skipSessionExpiredRedirect
            ) {
              import('sonner').then(({ toast }) => {
                toast.error('Session expired. Please log in again.');
              });
              setTimeout(() => {
                window.location.href = '/login';
              }, 1500);
            }
            return Promise.reject(error);
          }
        } catch (refreshError) {
          refreshPromise = null;
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
}

/**
 * Refresh access token using refresh token from cookie
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await axios.post(
      '/api/auth/refresh',
      {},
      { withCredentials: true }
    );

    const newToken = response.data.data?.accessToken || response.data.accessToken;
    if (newToken) {
      accessToken = newToken;
      return newToken;
    }
    return null;
  } catch {
    accessToken = null;
    return null;
  }
}

/**
 * Set access token in memory
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Clear access token
 */
export function clearAccessToken(): void {
  accessToken = null;
}

// Create default instance
export const api = createApiClient();

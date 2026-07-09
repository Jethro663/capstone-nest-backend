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
import { refreshSessionAccessToken } from './session-refresh';

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

function expireClientSession(shouldRedirect: boolean) {
  accessToken = null;

  if (typeof window === 'undefined' || !shouldRedirect) {
    return;
  }

  import('sonner').then(({ toast }) => {
    toast.error('Session expired. Please log in again.');
  });
  setTimeout(() => {
    window.location.href = '/login';
  }, 1500);
}

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

  // Response interceptor: handle 401 and token refresh
  let refreshPromise: Promise<string | null> | null = null;
  let bootstrapPromise: Promise<string | null> | null = null;

  // Request interceptor: ensure auth header is present before protected calls.
  api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const requestUrl = typeof config.url === 'string' ? config.url : '';
      const isAuthRefreshRequest = requestUrl.includes('/auth/refresh');
      const customConfig = config as ApiRequestConfig;

      if (
        !accessToken &&
        !isAuthRefreshRequest &&
        !customConfig.skipAuthRefresh
      ) {
        if (!bootstrapPromise && !refreshPromise) {
          bootstrapPromise = refreshSessionAccessToken()
            .catch(() => null)
            .finally(() => {
              bootstrapPromise = null;
            });
        }

        const bootstrappedToken = await (bootstrapPromise || refreshPromise).catch(() => null);
        if (bootstrappedToken) {
          accessToken = bootstrappedToken;
        }
      }

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error: AxiosError) => Promise.reject(error),
  );

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as ApiRequestConfig | undefined;
      const responseStatus = error.response?.status;
      const responseData = error.response?.data as
        | { statusCode?: number; message?: string }
        | undefined;
      const responseMessage =
        typeof responseData?.message === 'string'
          ? responseData.message.toLowerCase()
          : '';
      const isAuthExpiredResponse =
        responseStatus === 401 ||
        responseData?.statusCode === 401 ||
        responseMessage.includes('invalid or expired token') ||
        responseMessage.includes('jwt expired') ||
        responseMessage.includes('token expired');

      if (!originalRequest) {
        return Promise.reject(error);
      }

      // Retry once when auth has expired, even if backend wraps it in a 400 payload.
      if (
        isAuthExpiredResponse &&
        !originalRequest._retry &&
        !originalRequest.skipAuthRefresh
      ) {
        originalRequest._retry = true;
        const failedToken = accessToken;

        // Prevent multiple refresh attempts
        if (!refreshPromise && !bootstrapPromise) {
          refreshPromise = refreshSessionAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        try {
          const newToken = await (refreshPromise || bootstrapPromise);

          if (newToken) {
            accessToken = newToken;
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } else if (accessToken && accessToken !== failedToken) {
            // Another concurrent refresh or login set a new valid access token
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          } else {
            // Refresh returned no usable token, so force re-login.
            expireClientSession(!originalRequest.skipSessionExpiredRedirect);
            return Promise.reject(error);
          }
        } catch (refreshError) {
          if (accessToken && accessToken !== failedToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
          expireClientSession(!originalRequest.skipSessionExpiredRedirect);
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
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

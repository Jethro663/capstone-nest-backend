/**
 * API Client for Next.js
 * 
 * Wraps axios with:
 * - Automatic token management (from cookies)
 * - Token refresh interceptor
 * - Error handling
 * - Base URL configuration
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

let accessToken: string | null = null;

/**
 * Create axios instance with base configuration
 */
export function createApiClient(): AxiosInstance {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // If 401 and not already retried
      if (error.response?.status === 401 && !originalRequest._retry) {
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
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } else {
            // Refresh failed - redirect to login
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }
        } catch (refreshError) {
          refreshPromise = null;
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
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
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
      {},
      { withCredentials: true }
    );

    const newToken = response.data.data?.accessToken || response.data.accessToken;
    if (newToken) {
      accessToken = newToken;
      return newToken;
    }
    return null;
  } catch (error) {
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

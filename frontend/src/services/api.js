// API client: axios instance with token refresh

import axios from 'axios';

// Configuration

// API base URL (uses VITE_API_URL or defaults to localhost)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default settings
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,  // CRITICAL: Sends httpOnly cookie with requests
    timeout: 30000,         // 30 second timeout
    headers: {
        'Content-Type': 'application/json'
    }
});

// Token storage: access token kept in memory (prevents XSS, restored via refresh on load)
let accessToken = null;

// Set access token (stored in memory)
export const setAccessToken = (token) => {
    accessToken = token;
    console.log('[AUTH] Access token set in memory');
};

// Get current access token
export const getAccessToken = () => {
    return accessToken;
};

// Clear access token
export const clearAccessToken = () => {
    accessToken = null;
    console.log('[AUTH] Access token cleared from memory');
};

// Request interceptor: attach Authorization header and queue requests during refresh
api.interceptors.request.use(
    (config) => {
        // If a token refresh is in progress, queue outgoing requests so they get
        // the new token when available. This prevents race conditions where
        // requests are sent without an Authorization header.
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: (token) => {
                        if (token) {
                            config.headers.Authorization = `Bearer ${token}`;
                        }
                        resolve(config);
                    },
                    reject,
                });
            });
        }

        // Add access token to request if available
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Log request for debugging (remove in production)
        if (import.meta.env.DEV) {
            console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error) => {
        // Request setup failed
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor: refresh token on 401 and retry requests

// Flag to prevent multiple refresh attempts
let isRefreshing = false;

// Queue of failed requests waiting for token refresh
let failedQueue = [];

// Process queued requests after token refresh
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        // Successful response (2xx status)
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Don't handle 401 for auth endpoints (login, register, refresh, etc)
        // These should return their original error messages
        const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/otp/verify', '/otp/resend'];
        const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));

        // Handle token expiration (401 Unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {

            // Prevent retry loop
            if (isRefreshing) {
                // Token refresh already in progress
                // Queue this request to retry after refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            // Mark request as retried to prevent infinite loop
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                console.log('[AUTH] Access token expired, refreshing...');

                // Call refresh endpoint
                // Backend uses refresh token from httpOnly cookie
                const refreshResponse = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                // Extract new access token
                const newAccessToken = refreshResponse.data.data.accessToken;

                // Save new token
                setAccessToken(newAccessToken);

                console.log('[AUTH] Token refreshed successfully');

                // Process queued requests
                processQueue(null, newAccessToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                console.error('[AUTH] Token refresh failed:', refreshError);

                // Refresh failed - user must login again
                processQueue(refreshError, null);
                clearAccessToken();

                return Promise.reject(refreshError);

            } finally {
                isRefreshing = false;
            }
        }

        // Other errors (not 401) - return them as-is
        // Log error for debugging
        if (import.meta.env.DEV) {
            console.error('[API] Response error:', {
                url: error.config?.url,
                status: error.response?.status,
                message: error.response?.data?.message
            });
        }

        return Promise.reject(error);
    }
);

// Export api instance

export default api;


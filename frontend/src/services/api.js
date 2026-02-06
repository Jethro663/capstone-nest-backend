// ================================================================================
// API CLIENT - HTTP Request Configuration
// ================================================================================
// Central axios instance with token management and automatic refresh

import axios from 'axios';

// ================================================================================
// CONFIGURATION
// ================================================================================

/**
 * API Base URL
 *
 * DEVELOPMENT: http://localhost:3000/api
 * PRODUCTION: Set via VITE_API_URL environment variable
 *
 * USAGE:
 * Create .env file:
 * VITE_API_URL=https://your-production-api.com/api
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Create axios instance with base configuration
 *
 * SETTINGS:
 * - baseURL: All requests prepend this URL
 * - withCredentials: Send cookies (for refresh token)
 * - timeout: Request timeout in milliseconds
 * - headers: Default headers for all requests
 */
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,  // CRITICAL: Sends httpOnly cookie with requests
    timeout: 30000,         // 30 second timeout
    headers: {
        'Content-Type': 'application/json'
    }
});

// ================================================================================
// TOKEN STORAGE
// ================================================================================

/**
 * Access Token Storage
 *
 * SECURITY: Stored in memory (NOT localStorage)
 *
 * WHY IN MEMORY:
 * - Prevents XSS attacks from stealing token
 * - Auto-cleared when tab/window closes
 * - Refresh token (in httpOnly cookie) provides session persistence
 *
 * TRADE-OFF:
 * - Token lost on page refresh
 * - But automatically restored via refreshToken call on app load
 */
let accessToken = null;

/**
 * Set access token
 * Called after successful login or token refresh
 *
 * @param {string} token - JWT access token from backend
 */
export const setAccessToken = (token) => {
    accessToken = token;
    console.log('[AUTH] Access token set in memory');
};

/**
 * Get current access token
 *
 * @returns {string|null} Current token or null
 */
export const getAccessToken = () => {
    return accessToken;
};

/**
 * Clear access token
 * Called on logout or when token refresh fails
 */
export const clearAccessToken = () => {
    accessToken = null;
    console.log('[AUTH] Access token cleared from memory');
};

// ================================================================================
// REQUEST INTERCEPTOR
// ================================================================================

/**
 * Add authentication token to every request
 *
 * HOW IT WORKS:
 * 1. User calls: api.get('/auth/me')
 * 2. This interceptor runs BEFORE request sent
 * 3. Adds "Authorization: Bearer <token>" header
 * 4. Request continues to backend
 * 5. Backend verifies token and responds
 */
api.interceptors.request.use(
    (config) => {
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

// ================================================================================
// RESPONSE INTERCEPTOR
// ================================================================================

/**
 * Handle responses and automatic token refresh
 *
 * HOW TOKEN REFRESH WORKS:
 * 1. Request to protected endpoint
 * 2. Access token expired (15 minutes passed)
 * 3. Backend returns 401 Unauthorized
 * 4. This interceptor catches 401
 * 5. Calls /auth/refresh with refresh token cookie
 * 6. Gets new access token (15 min validity)
 * 7. Retries original request with new token
 * 8. User doesn't notice - seamless!
 *
 * REFRESH TOKEN EXPIRY:
 * - If refresh token also expired (7 days)
 * - Refresh call fails with 401
 * - User redirected to login
 */

// Flag to prevent multiple refresh attempts
let isRefreshing = false;

// Queue of failed requests waiting for token refresh
let failedQueue = [];

/**
 * Process queued requests after token refresh
 *
 * @param {Error|null} error - Error if refresh failed
 * @param {string|null} token - New access token if refresh succeeded
 */
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

// ================================================================================
// EXPORT API INSTANCE
// ================================================================================

export default api;


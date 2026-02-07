// Auth service: backend-compatible authentication API

import api, { setAccessToken, clearAccessToken } from './api';

// Register a new user (POST /auth/register)
export const register = async ({ email, password, confirmPassword, role = 'student' }) => {
    try {
        // Make API call to registration endpoint
        const response = await api.post('/auth/register', {
            email,           // User's email address
            password,        // User's password (will be hashed by backend)
            confirmPassword, // Password confirmation
            role            // User role (student/teacher)
        });

        // Return the full response data
        // This includes the user object and success message
        return response.data;

    } catch (error) {
        // Handle different error types from backend

        if (error.response) {
            // Backend returned an error response
            const { data, status } = error.response;

            // Throw structured error with backend message
            throw {
                message: data.message || 'Registration failed',
                code: data.code,
                status: status,
                errors: data.errors // Validation errors if any
            };
        }

        // Network or other error
        throw {
            message: 'Network error. Please check your connection.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Verify email with OTP (POST /otp/verify)
export const verifyEmail = async (email, code) => {
    try {
        const response = await api.post('/otp/verify', {
            email,  // User's email address
            code    // 6-digit verification code
        });

        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;

            // Handle specific verification errors
            throw {
                message: data.message || 'Verification failed',
                code: data.code,
                // These codes help UI show specific messages:
                // OTP_INVALID - Wrong code entered
                // OTP_EXPIRED - Code is older than 10 minutes
                // OTP_MAX_ATTEMPTS - User tried 5+ times
                // OTP_NOT_FOUND - No pending verification for this user
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Resend OTP (POST /otp/resend)
export const resendOTP = async (email) => {
    try {
        const response = await api.post('/otp/resend', { email });
        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Failed to resend code',
                code: data.code
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Login user (POST /auth/login)
export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', {
            email,      // User's email
            password    // User's password (backend will verify hash)
        });

        // Extract access token and user data from response
        const { accessToken, user } = response.data.data;

        // Save access token to memory (NOT localStorage for security)
        // This token will be added to all future API requests automatically
        setAccessToken(accessToken);

        // Return user data for context/state management
        return response.data;

    } catch (error) {
        if (error.response) {
            const { data, status } = error.response;

            // Handle specific login errors
            throw {
                message: data.message || 'Login failed',
                code: data.code,
                status: status,
                // Common error codes:
                // EMAIL_NOT_VERIFIED - User hasn't verified email yet
                // INVALID_CREDENTIALS - Wrong email or password
                // ACCOUNT_INACTIVE - Account suspended/deleted
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Validate credentials without enforcing email verification
export const validateCredentials = async (email, password) => {
    try {
        const response = await api.post('/auth/validate-credentials', { email, password });
        return response.data;
    } catch (error) {
        if (error.response) {
            const { data, status } = error.response;
            throw {
                message: data.message || 'Invalid credentials',
                code: data.code,
                status,
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Logout and clear session (POST /auth/logout)
export const logout = async () => {
    try {
        // Call backend logout endpoint
        await api.post('/auth/logout');

        // Clear access token from memory
        clearAccessToken();

        return { success: true };

    } catch (error) {
        // Even if backend call fails, clear local token
        clearAccessToken();

        // Don't throw error on logout - always succeed locally
        return { success: true };
    }
};

// Get current authenticated user (GET /auth/me)
export const getCurrentUser = async () => {
    try {
        const response = await api.get('/auth/me');
        return response.data;

    } catch (error) {
        // If this fails, user is not authenticated
        clearAccessToken();

        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Authentication failed',
                code: data.code
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Forgot password (POST /auth/forgot-password)
export const forgotPassword = async (email) => {
    try {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Failed to send reset code',
                code: data.code
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Reset password with OTP (POST /auth/reset-password)
export const resetPassword = async (email, code, newPassword) => {
    try {
        const response = await api.post('/auth/reset-password', {
            email,        // User's email
            code,         // 6-digit OTP code
            newPassword   // New password (backend will hash it)
        });

        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Failed to reset password',
                code: data.code,
                errors: data.errors // Validation errors if password is weak
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Refresh access token (POST /auth/refresh)
export const refreshToken = async () => {
    try {
        const response = await api.post('/auth/refresh');

        const { accessToken } = response.data.data;

        // Save new access token
        setAccessToken(accessToken);

        return response.data;

    } catch (error) {
        // Refresh token expired or invalid - user must login again
        clearAccessToken();

        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Session expired',
                code: data.code
            };
        }

        throw {
            message: 'Session expired. Please login again.',
            code: 'SESSION_EXPIRED'
        };
    }
};

// Helpers

// Check if user is authenticated (token exists in memory)
export const isAuthenticated = () => {
    const { getAccessToken } = require('./api');
    return getAccessToken() !== null;
};

/**
 * Update user profile
 *
 * BACKEND ENDPOINT: PATCH /api/auth/profile
 */
export const updateProfile = async (profileData) => {
    try {
        const isForm = profileData instanceof FormData;
        const response = await api.patch('/auth/profile', profileData, isForm ? {
            headers: { 'Content-Type': 'multipart/form-data' }
        } : undefined);
        return response.data;
    } catch (error) {
        if (error.response) {
            throw error.response.data;
        }
        throw error;
    }
};

// Export functions

export default {
    // Registration & Verification
    register,
    verifyEmail,
    resendOTP,

    // Authentication
    login,
    logout,
    getCurrentUser,
    updateProfile,

    // Password Management
    forgotPassword,
    resetPassword,

    // Token Management
    refreshToken,
    isAuthenticated
};
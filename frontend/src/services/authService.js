// ================================================================================
// AUTH SERVICE - Backend-Compatible Authentication
// ================================================================================
// This service handles all authentication operations
// Matches the backend API structure exactly

import api, { setAccessToken, clearAccessToken } from './api';

// ================================================================================
// REGISTRATION - Matches Backend Schema
// ================================================================================

/**
 * Register a new user account
 *
 * BACKEND ENDPOINT: POST /api/auth/register
 *
 * BACKEND EXPECTS:
 * {
 *   email: string (required) - User's email address
 *   password: string (required) - Must meet security requirements
 *   confirmPassword: string (required) - Must match password
 *   role: string (optional) - Defaults to "student" if not provided
 * }
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   message: "Registration successful. Please check your email for verification code.",
 *   data: {
 *     user: {
 *       id: "uuid",
 *       email: "user@example.com",
 *       roles: ["student"],
 *       isEmailVerified: false,
 *       status: "PENDING"
 *     }
 *   }
 * }
 *
 * WHAT HAPPENS:
 * 1. Backend validates email format and password strength
 * 2. Backend checks if email already exists
 * 3. Backend creates user with PENDING status
 * 4. Backend generates 6-digit OTP code
 * 5. Backend sends verification email
 * 6. Frontend should redirect to email verification page
 */
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

// ================================================================================
// EMAIL VERIFICATION - OTP Code Verification
// ================================================================================

/**
 * Verify user's email with OTP code
 *
 * BACKEND ENDPOINT: POST /api/otp/verify
 *
 * BACKEND EXPECTS:
 * {
 *   email: string (required) - User's email
 *   code: string (required) - 6-digit OTP code from email
 * }
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   message: "Email verified successfully",
 *   data: {
 *     email: "user@example.com",
 *     isVerified: true
 *   }
 * }
 *
 * WHAT HAPPENS:
 * 1. Backend finds OTP record for user
 * 2. Backend checks if code matches
 * 3. Backend checks if code is expired (<10 minutes)
 * 4. Backend checks attempt count (<5 attempts)
 * 5. Backend updates user: isEmailVerified = true, status = ACTIVE
 * 6. Backend deletes used OTP
 * 7. User can now login
 */
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

// ================================================================================
// RESEND OTP - Request New Verification Code
// ================================================================================

/**
 * Resend OTP verification code
 *
 * BACKEND ENDPOINT: POST /api/otp/resend
 *
 * BACKEND EXPECTS:
 * {
 *   email: string (required) - User's email
 * }
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   message: "Verification code sent",
 *   data: {
 *     expiresAt: "2026-02-01T12:30:00Z" // When new code expires
 *   }
 * }
 *
 * WHAT HAPPENS:
 * 1. Backend deletes old OTP records for this user
 * 2. Backend generates new 6-digit code
 * 3. Backend sends new email
 * 4. Backend returns new expiration time
 */
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

// ================================================================================
// LOGIN - User Authentication
// ================================================================================

/**
 * Login user with email and password
 *
 * BACKEND ENDPOINT: POST /api/auth/login
 *
 * BACKEND EXPECTS:
 * {
 *   email: string (required) - User's email
 *   password: string (required) - User's password
 * }
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   message: "Login successful",
 *   data: {
 *     user: {
 *       id: "uuid",
 *       email: "user@example.com",
 *       roles: ["student"],
 *       isEmailVerified: true
 *     },
 *     accessToken: "eyJhbGciOiJIUzI1NiIs..." // JWT token
 *   }
 * }
 *
 * ALSO SETS:
 * - HttpOnly cookie: refreshToken (7 day expiration)
 *
 * WHAT HAPPENS:
 * 1. Backend finds user by email
 * 2. Backend checks if email is verified
 * 3. Backend checks if account is active
 * 4. Backend verifies password hash
 * 5. Backend generates access token (15 min) and refresh token (7 days)
 * 6. Backend returns access token in response
 * 7. Backend sets refresh token as httpOnly cookie
 * 8. Frontend saves access token in memory
 * 9. Backend updates lastLoginAt timestamp
 */
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

// ================================================================================
// LOGOUT - Clear User Session
// ================================================================================

/**
 * Logout user and clear tokens
 *
 * BACKEND ENDPOINT: POST /api/auth/logout
 *
 * BACKEND EXPECTS: Nothing (uses refresh token from cookie)
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   message: "Logout successful"
 * }
 *
 * WHAT HAPPENS:
 * 1. Backend clears refreshToken cookie
 * 2. Frontend clears access token from memory
 * 3. User is logged out
 */
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

// ================================================================================
// GET CURRENT USER - Fetch Authenticated User Data
// ================================================================================

/**
 * Get currently authenticated user's data
 *
 * BACKEND ENDPOINT: GET /api/auth/me
 *
 * BACKEND EXPECTS: Valid access token in Authorization header
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   data: {
 *     user: {
 *       userId: "uuid",
 *       email: "user@example.com",
 *       roles: ["student"]
 *     }
 *   }
 * }
 *
 * WHAT HAPPENS:
 * 1. Frontend sends request with access token
 * 2. Backend verifies token signature
 * 3. Backend extracts user ID from token
 * 4. Backend returns user data
 *
 * USED FOR:
 * - Checking if user is still logged in on page load
 * - Getting fresh user data after token refresh
 * - Verifying authentication status
 */
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

// ================================================================================
// FORGOT PASSWORD - Request Password Reset
// ================================================================================

/**
 * Request password reset OTP
 *
 * BACKEND ENDPOINT: POST /api/auth/forgot-password
 *
 * BACKEND EXPECTS:
 * {
 *   email: string (required) - User's email
 * }
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   message: "If an account exists, a code has been sent."
 * }
 *
 * NOTE: Backend returns same message whether email exists or not
 * This prevents email enumeration attacks
 *
 * WHAT HAPPENS:
 * 1. Backend finds user by email (or not)
 * 2. If user exists: generate OTP, send email
 * 3. If user doesn't exist: do nothing but still return success
 * 4. This prevents attackers from knowing which emails are registered
 */
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

// ================================================================================
// RESET PASSWORD - Complete Password Reset
// ================================================================================

/**
 * Reset password with OTP code
 *
 * BACKEND ENDPOINT: POST /api/auth/reset-password
 *
 * BACKEND EXPECTS:
 * {
 *   email: string (required) - User's email
 *   code: string (required) - 6-digit OTP from email
 *   newPassword: string (required) - New password (must meet requirements)
 * }
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   message: "Password reset successfully"
 * }
 *
 * WHAT HAPPENS:
 * 1. Backend finds user by email
 * 2. Backend verifies OTP code
 * 3. Backend checks if code expired
 * 4. Backend validates new password strength
 * 5. Backend hashes new password
 * 6. Backend updates user's password
 * 7. Backend deletes used OTP
 * 8. User can now login with new password
 */
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

// ================================================================================
// TOKEN REFRESH - Get New Access Token
// ================================================================================

/**
 * Refresh access token using refresh token cookie
 *
 * BACKEND ENDPOINT: POST /api/auth/refresh
 *
 * BACKEND EXPECTS: Valid refresh token in httpOnly cookie
 *
 * BACKEND RETURNS:
 * {
 *   success: true,
 *   message: "Token refreshed successfully",
 *   data: {
 *     accessToken: "eyJhbGciOiJIUzI1NiIs..." // New JWT token
 *   }
 * }
 *
 * WHAT HAPPENS:
 * 1. Frontend sends request (refresh token auto-sent via cookie)
 * 2. Backend verifies refresh token
 * 3. Backend checks if user still exists and is active
 * 4. Backend generates new access token (15 min)
 * 5. Backend returns new token
 * 6. Frontend saves new token in memory
 *
 * NOTE: This is usually called automatically by the API interceptor
 * when access token expires (401 response)
 */
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

// ================================================================================
// HELPER FUNCTIONS
// ================================================================================

/**
 * Check if user is authenticated
 *
 * RETURNS: boolean - true if user has valid access token
 *
 * NOTE: This only checks if token EXISTS in memory
 * It doesn't verify if token is valid or expired
 * For that, call getCurrentUser()
 */
export const isAuthenticated = () => {
    // Import from api.js which stores the token
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
        const response = await api.patch('/auth/profile', {
            fullName: profileData.name
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw error.response.data;
        }
        throw error;
    }
};

// ================================================================================
// EXPORT ALL FUNCTIONS
// ================================================================================

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
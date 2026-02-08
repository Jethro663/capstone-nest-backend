import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import profilesService from '../services/profilesService';
import { toast } from 'sonner';


// Auth context: holds current user, loading state, and auth helpers
const AuthContext = createContext(null);
// AuthProvider: provides authentication state and functions to the app
export function AuthProvider({ children }) {

    // ============================================================================
    // STATE
    // ============================================================================

    // Current user object (null if not authenticated)
    const [user, setUser] = useState(null);

    // Loading flag used while checking authentication status
    const [loading, setLoading] = useState(true);
    /**
     * Check authentication status on app load
     *
     * CALLED ONCE when app first mounts
     *
     * WHY:
     * - User may still be logged in from previous session
     * - Refresh token cookie persists across browser restarts
     * - Access token in memory is lost on page refresh
     * - This restores the session
     *
     * FLOW:
     * 1. App loads
     * 2. Call getCurrentUser()
     * 3. Backend validates access token (from previous session if any)
     * 4. If token valid: returns user data
     * 5. If token expired: interceptor calls /auth/refresh automatically
     * 6. If refresh succeeds: get new token, fetch user
     * 7. If refresh fails: user must login
     */
    const checkAuth = useCallback(async () => {
        try {
            console.log('[AUTH] Checking authentication status...');

            // Try to get current user with existing token/cookie
            const response = await authService.getCurrentUser();

            // Success - user is authenticated
            // The /auth/me endpoint returns JWT payload: { userId, email, roles, type }
            const userData = response.data.user;
            console.log('[AUTH] User authenticated:', userData.email);

            // Try to fetch and merge user profile (if any) so UI has complete info
            let profileData = null;
            try {
                const profileRes = await profilesService.getMyProfile();
                profileData = profileRes?.data || profileRes || null;
                console.log('[AUTH] Fetched profile:', profileData);
            } catch (err) {
                // Ignore profile fetch errors; treat as no profile
                console.warn('[AUTH] Failed to fetch profile:', err?.message || err);
            }

            // Normalize: ensure both `id` and `userId` exist for compatibility
            const normalizedUser = {
                ...userData,
                id: userData.id || userData.userId,
                userId: userData.userId || userData.id,
            };

            // Merge profile fields into user state in a SINGLE setUser call
            // This prevents double-render issues
            if (profileData) {
                setUser({ ...normalizedUser, ...profileData });
            } else {
                setUser(normalizedUser);
            }

        } catch (error) {
            // Not authenticated or token expired
            console.log('[AUTH] Not authenticated');
            setUser(null);

        } finally {
            // Done checking authentication
            setLoading(false);
        }
    }, []);

    /**
     * Run auth check when component mounts
     */
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // ============================================================================
    // AUTHENTICATION FUNCTIONS
    // ============================================================================

    /**
     * REGISTER NEW USER
     *
     * @param {Object} userData - Registration data
     * @param {string} userData.email - User's email
     * @param {string} userData.password - User's password
     * @param {string} userData.confirmPassword - Password confirmation
     * @param {string} userData.role - User role (student/teacher)
     *
     * @returns {Promise<Object>} Registration response
     *
     * FLOW:
     * 1. Call backend registration API
     * 2. Backend creates account with PENDING status
     * 3. Backend sends OTP email
     * 4. Return response (includes user email for verification page)
     * 5. Frontend redirects to email verification page
     *
     * NOTE: User is NOT logged in after registration
     * They must verify email first, then login
     */
    const register = async (userData) => {
        try {
            const response = await authService.register(userData);

            toast.success('Registration successful! Check your email for verification code.');

            return response;

        } catch (error) {
            // Handle specific errors
            if (error.code === 'EMAIL_EXISTS') {
                toast.error('Email already registered. Please login instead.');
            } else if (error.errors) {
                // Validation errors from backend
                const firstError = Object.values(error.errors)[0];
                const errorMessage = typeof firstError === 'object' ? (firstError.message || firstError.msg) : firstError;
                toast.error(errorMessage || 'Registration failed');
            } else {
                toast.error(error.message || 'Registration failed. Please try again.');
            }

            throw error;
        }
    };

    /**
     * VERIFY EMAIL
     *
     * @param {string} email - User's email
     * @param {string} code - 6-digit OTP code
     *
     * @returns {Promise<Object>} Verification response
     *
     * FLOW:
     * 1. Call backend verification API
     * 2. Backend verifies code matches and not expired
     * 3. Backend updates user: isEmailVerified = true, status = ACTIVE
     * 4. User can now login
     * 5. Frontend redirects to login page
     */
    const verifyEmail = async (email, code) => {
        try {
            const response = await authService.verifyEmail(email, code);

            toast.success('Email verified! You can now login.');

            return response;

        } catch (error) {
            // Handle specific verification errors
            if (error.code === 'OTP_INVALID') {
                toast.error('Invalid verification code. Please try again.');
            } else if (error.code === 'OTP_EXPIRED') {
                toast.error('Verification code expired. Please request a new one.');
            } else if (error.code === 'OTP_MAX_ATTEMPTS') {
                toast.error('Too many failed attempts. Please request a new code.');
            } else {
                toast.error(error.message || 'Verification failed. Please try again.');
            }

            throw error;
        }
    };

    /**
     * RESEND OTP CODE
     *
     * @param {string} email - User's email
     *
     * @returns {Promise<Object>} Response with new expiration time
     */
    const resendOTP = async (email) => {
        try {
            const response = await authService.resendOTP(email);

            toast.success('New verification code sent! Check your email.');

            return response;

        } catch (error) {
            toast.error(error.message || 'Failed to resend code. Please try again.');
            throw error;
        }
    };

    /**
     * LOGIN USER
     *
     * @param {string} email - User's email
     * @param {string} password - User's password
     *
     * @returns {Promise<Object>} Login response with user data
     *
     * FLOW:
     * 1. Call backend login API
     * 2. Backend verifies credentials
     * 3. Backend returns access token + user data
     * 4. authService.login() saves token to memory
     * 5. Set user in context state
     * 6. App.jsx detects user logged in → redirects to dashboard
     *
     * WHAT GETS STORED:
     * - Access token: In memory (via authService)
     * - Refresh token: In httpOnly cookie (via backend)
     * - User data: In context state (this component)
     */
    const login = async (email, password) => {
        try {
            const response = await authService.login(email, password);

            // Login returns user from database (has `id`, not `userId`)
            const userData = response.data.user;

            // Normalize: ensure both `id` and `userId` exist
            const normalizedUser = {
                ...userData,
                id: userData.id || userData.userId,
                userId: userData.userId || userData.id,
            };

            // Fetch and merge profile in one go (same as checkAuth)
            let profileData = null;
            try {
                const profileRes = await profilesService.getMyProfile();
                profileData = profileRes?.data || profileRes || null;
            } catch (err) {
                console.warn('[AUTH] Failed to fetch profile on login:', err?.message || err);
            }

            // Set user with profile merged in a SINGLE call
            if (profileData) {
                setUser({ ...normalizedUser, ...profileData });
            } else {
                setUser(normalizedUser);
            }

            toast.success('Login successful!');

            return response;

        } catch (error) {
            // Handle specific login errors
            if (error.code === 'EMAIL_NOT_VERIFIED' || error.message?.includes('Email not verified')) {
                toast.error('Please verify your email before logging in.');
            } else if (error.code === 'INVALID_CREDENTIALS' || error.message?.includes('Invalid credentials')) {
                toast.error('Invalid email or password.');
            } else if (error.code === 'ACCOUNT_INACTIVE' || error.message?.includes('not active')) {
                toast.error('Account is suspended. Contact support.');
            } else {
                toast.error(error.message || 'Login failed. Please try again.');
            }

            throw error;
        }
    };

    /**
     * LOGOUT USER
     *
     * FLOW:
     * 1. Call backend logout API
     * 2. Backend clears refresh token cookie
     * 3. authService.logout() clears access token from memory
     * 4. Clear user from context state
     * 5. App.jsx detects user logged out → redirects to login
     */
    const logout = async () => {
        try {
            await authService.logout();

            // Clear user from context
            setUser(null);

            toast.info('Logged out successfully');

        } catch (error) {
            // Even if backend call fails, still logout locally
            setUser(null);
            console.error('Logout error:', error);
        }
    };

    /**
     * UPDATE PROFILE
     */
    const updateProfile = async (profileData) => {
        try {
            const result = await authService.updateProfile(profileData);
            // API returns: { success: true, message, data: { user } }
            setUser(result.data.user);
            return result;
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    };

    /**
     * UPDATE USER DATA IN CONTEXT
     *
     * Used for updating user profile without re-fetching from backend
     *
     * @param {Object} updates - Fields to update
     *
     * EXAMPLE:
     * updateUser({ firstName: "Jane", lastName: "Doe" })
     *
     * NOTE: This only updates local state
     * To persist changes, you must also call the backend API
     */
    const updateUser = useCallback((updates) => {
        setUser(prev => ({
            ...prev,
            ...updates
        }));
    }, []);

    /**
     * FORGOT PASSWORD
     *
     * @param {string} email - User's email
     *
     * @returns {Promise<Object>} Response
     */
    const forgotPassword = async (email) => {
        try {
            const response = await authService.forgotPassword(email);

            toast.success('Password reset code sent to your email.');

            return response;

        } catch (error) {
            toast.error(error.message || 'Failed to send reset code.');
            throw error;
        }
    };

    // Reset password using OTP (calls authService.resetPassword)
    const resetPassword = async (email, code, newPassword) => {
        try {
            const response = await authService.resetPassword(email, code, newPassword);

            toast.success('Password reset successful! You can now login.');

            return response;

        } catch (error) {
            if (error.code === 'OTP_INVALID') {
                toast.error('Invalid reset code.');
            } else if (error.code === 'OTP_EXPIRED') {
                toast.error('Reset code expired. Request a new one.');
            } else if (error.errors) {
                // Password validation errors
                const firstError = Object.values(error.errors)[0];
                const errorMessage = typeof firstError === 'object' ? (firstError.message || firstError.msg) : firstError;
                toast.error(errorMessage || 'Password reset failed');
            } else {
                toast.error(error.message || 'Password reset failed.');
            }

            throw error;
        }
    };

    // ============================================================================
    // CONTEXT VALUE
    // ============================================================================

    /**
     * Value provided to all components
     *
     * ACCESSIBLE VIA:
     * const { user, login, logout } = useAuth();
     */
    const value = {
        // State
        user,                           // Current user object or null
        loading,                        // True while checking auth
        isAuthenticated: !!user,        // Boolean: is user logged in?

        // Functions
        register,                       // Register new user
        verifyEmail,                    // Verify email with OTP
        resendOTP,                      // Resend verification code
        login,                          // Login user
        logout,                         // Logout user
        updateProfile,                  // Update user profile
        forgotPassword,                 // Request password reset
        resetPassword,                  // Reset password with code
        updateUser,                     // Update user in context
        checkAuth,                      // Re-check authentication
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    /**
     * Show loading screen while checking authentication
     * Prevents flash of login page
     */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#374151] to-[#dc2626]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-white text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    /**
     * Provide authentication context to app
     */
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ================================================================================
// CUSTOM HOOK
// ================================================================================

/**
 * useAuth Hook
 *
 * Provides access to authentication context
 *
 * USAGE:
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function MyComponent() {
 *   const { user, login, logout } = useAuth();
 *
 *   if (!user) {
 *     return <div>Please log in</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.email}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}

export default AuthContext;


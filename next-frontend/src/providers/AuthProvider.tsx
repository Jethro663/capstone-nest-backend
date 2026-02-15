/**
 * Auth Context - Client Side
 * 
 * Provides lightweight client-side auth state for:
 * - Current user data
 * - Loading state during initial auth check
 * - Derived states (isAuthenticated, role, etc.)
 * 
 * NOTE: Mutations (login, logout) happen via Server Actions
 * This context is READ-ONLY for the most part
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { getCurrentUserAction } from '@/lib/auth-actions';

export interface User {
  id?: string;
  userId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  role?: string;
  profilePictureUrl?: string;
  emailVerified?: boolean;
  status?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: string | null;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load current user on mount
   */
  const refreshAuth = useCallback(async () => {
    try {
      const result = await getCurrentUserAction();
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[AUTH_PROVIDER] Error checking auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const isAuthenticated = !!user;
  const role = user?.role || user?.roles?.[0] || null;

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    role,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user has a specific role
 */
export function useRole(role: string | string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;

  const userRole = user.role || user.roles?.[0];
  const roles = Array.isArray(role) ? role : [role];

  return userRole ? roles.includes(userRole) : false;
}

/**
 * Hook to get user's primary role
 */
export function useUserRole(): string | null {
  const { role } = useAuth();
  return role;
}

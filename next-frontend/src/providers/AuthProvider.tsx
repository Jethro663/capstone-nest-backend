/**
 * Auth Context — Client Side
 *
 * Provides lightweight client‑side auth state:
 *   - Current user data
 *   - Loading state during initial auth check
 *   - Derived helpers (isAuthenticated, role, isProfileIncomplete)
 *   - setUser for updating after login / profile changes
 *
 * Mutations (login, logout, etc.) happen via auth‑actions.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { usePathname } from 'next/navigation';
import { getCurrentUserAction } from '@/lib/auth-actions';
import { setAccessToken } from '@/lib/api-client';
import { getRoleName } from '@/utils/helpers';
import type { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: string | null;
  isProfileIncomplete: boolean;
  setUser: (user: User | null) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_REFRESH_TIMEOUT_MS = 10_000;

function shouldBootstrapAuth(pathname: string | null): boolean {
  return pathname === '/dashboard' || pathname?.startsWith('/dashboard/') || false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const shouldRefreshSession = shouldBootstrapAuth(pathname);

  const refreshAuth = useCallback(async () => {
    try {
      // Explicitly exchange the httpOnly cookie for an access token FIRST.
      // This avoids the /auth/me → 401 → interceptor → refresh loop.
      const refreshRes = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true, timeout: AUTH_REFRESH_TIMEOUT_MS },
      );
      const newToken =
        refreshRes.data?.data?.accessToken ?? refreshRes.data?.accessToken;
      if (!newToken) throw new Error('No access token in refresh response');
      setAccessToken(newToken);

      // Now fetch the current user — token is in memory so no 401 occurs.
      const result = await getCurrentUserAction();
      if (result.success && result.user) {
        setUser(result.user as User);
      } else {
        setUser(null);
      }
    } catch {
      // Refresh failed → no valid session
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldRefreshSession) {
      setAccessToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void refreshAuth();
  }, [refreshAuth, shouldRefreshSession]);

  const isAuthenticated = !!user;
  const role = getRoleName(user?.roles?.[0]) || null;
  const isProfileIncomplete =
    isAuthenticated && (!user?.firstName || !user?.lastName);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    role,
    isProfileIncomplete,
    setUser,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook — full auth context */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/** Hook — check if user has one of the given roles */
export function useRole(role: string | string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  const userRole = getRoleName(user.roles?.[0]) || undefined;
  const roles = Array.isArray(role) ? role : [role];
  return userRole ? roles.includes(userRole) : false;
}

/** Hook — get primary role string */
export function useUserRole(): string | null {
  const { role } = useAuth();
  return role;
}

export { shouldBootstrapAuth };
export { AUTH_REFRESH_TIMEOUT_MS };

/**
 * Auth context for client-side session bootstrap and role helpers.
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { getCurrentUserAction } from '@/lib/auth-actions';
import { getAccessToken, setAccessToken } from '@/lib/api-client';
import {
  AUTH_ME_TIMEOUT_MS,
  shouldBootstrapAuth,
} from '@/lib/auth-bootstrap';
import { refreshSessionAccessToken } from '@/lib/session-refresh';
import { getRoleName } from '@/utils/helpers';
import type { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  status: 'bootstrapping' | 'authenticated' | 'unauthenticated';
  isAuthenticated: boolean;
  role: string | null;
  isProfileIncomplete: boolean;
  setUser: (user: User | null) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_BOOTSTRAP_DEBUG = process.env.NODE_ENV === 'development';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'bootstrapping' | 'authenticated' | 'unauthenticated'>(
    'bootstrapping',
  );
  const pathname = usePathname();
  const shouldRefreshSession = shouldBootstrapAuth(pathname);
  const bootstrapRunIdRef = useRef(0);
  const latestUserRef = useRef<User | null>(null);
  const latestPathnameRef = useRef<string | null>(pathname);

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  useEffect(() => {
    latestPathnameRef.current = pathname;
  }, [pathname]);

  const logBootstrap = useCallback(
    (stage: string, details: Record<string, unknown> = {}) => {
      if (!AUTH_BOOTSTRAP_DEBUG) return;
      // Focused diagnostics for auth bootstrap regression tracking.
      console.info('[AuthBootstrap]', stage, details);
    },
    [],
  );

  const fetchCurrentUserWithTimeout = useCallback(async () => {
    const meStart = performance.now();
    const result = await Promise.race([
      getCurrentUserAction(),
      new Promise<Awaited<ReturnType<typeof getCurrentUserAction>>>((resolve) => {
        setTimeout(() => resolve({ success: false, user: null }), AUTH_ME_TIMEOUT_MS);
      }),
    ]);
    logBootstrap('me.result', {
      success: result.success,
      durationMs: Math.round(performance.now() - meStart),
    });

    return result;
  }, [logBootstrap]);

  const refreshAuth = useCallback(async () => {
    const bootstrapStart = performance.now();
    try {
      const refreshStart = performance.now();
      const newToken = await refreshSessionAccessToken();
      logBootstrap('refresh.result', {
        durationMs: Math.round(performance.now() - refreshStart),
      });

      if (!newToken) {
        throw new Error('No access token in refresh response');
      }

      setAccessToken(newToken);

      const result = await fetchCurrentUserWithTimeout();
      if (result.success && result.user) {
        setUser(result.user as User);
        setStatus('authenticated');
        logBootstrap('bootstrap.success', {
          durationMs: Math.round(performance.now() - bootstrapStart),
        });
        return;
      }
    } catch {
      logBootstrap('bootstrap.failure', {
        durationMs: Math.round(performance.now() - bootstrapStart),
      });
    }

    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, [fetchCurrentUserWithTimeout, logBootstrap]);

  useEffect(() => {
    const runId = bootstrapRunIdRef.current + 1;
    bootstrapRunIdRef.current = runId;
    const existingUser = latestUserRef.current;
    const existingToken = getAccessToken();

    if (!shouldRefreshSession) {
      setStatus(existingUser ? 'authenticated' : 'unauthenticated');
      logBootstrap('bootstrap.skipped');
      return;
    }

    if (existingUser && existingToken) {
      setStatus('authenticated');
      logBootstrap('bootstrap.reused-session', {
        pathname: latestPathnameRef.current,
      });
      return;
    }

    setStatus('bootstrapping');
    logBootstrap('bootstrap.start', { pathname: latestPathnameRef.current });
    void (async () => {
      await refreshAuth();

      // Ensure stale bootstrap runs cannot keep the loader stuck.
      if (bootstrapRunIdRef.current !== runId) return;
    })();
  }, [logBootstrap, refreshAuth, shouldRefreshSession]);

  const loading = status === 'bootstrapping';
  const isAuthenticated = status === 'authenticated' && !!user;
  const role = getRoleName(user?.roles?.[0]) || null;
  const isProfileIncomplete =
    isAuthenticated && (!user?.firstName || !user?.lastName);

  const value: AuthContextType = {
    user,
    loading,
    status,
    isAuthenticated,
    role,
    isProfileIncomplete,
    setUser,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function useRole(role: string | string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  const userRole = getRoleName(user.roles?.[0]) || undefined;
  const roles = Array.isArray(role) ? role : [role];
  return userRole ? roles.includes(userRole) : false;
}

export function useUserRole(): string | null {
  const { role } = useAuth();
  return role;
}

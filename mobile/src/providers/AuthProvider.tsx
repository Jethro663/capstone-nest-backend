import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/api/services/auth';
import { clearAuthSession, getAccessToken, refreshSession, setAccessToken } from '@/api/client';
import { readSessionSnapshot, writeSessionSnapshot } from '@/api/storage';
import { getRoleName } from '@/shared/utils/helpers';
import type { AuthSession } from '@/types/auth';
import type { UpdateProfileDto } from '@/types/profile';
import type { User } from '@/types/user';

type AuthContextValue = {
  session: AuthSession | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateLocalUser: (user: User | null) => Promise<void>;
  updateProfile: (payload: UpdateProfileDto) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback(async (next: AuthSession | null) => {
    setSession(next);
    await writeSessionSnapshot(next);
  }, []);

  const updateLocalUser = useCallback(
    async (user: User | null) => {
      const accessToken = getAccessToken();
      await persistSession(user && accessToken ? { accessToken, user } : null);
    },
    [persistSession],
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    const snapshot = await readSessionSnapshot();
    if (snapshot?.accessToken) {
      setAccessToken(snapshot.accessToken);
      setSession(snapshot);
    }

    try {
      const accessToken = await refreshSession();
      if (!accessToken) {
        await clearAuthSession();
        await persistSession(null);
        return;
      }
      const currentUser = await authApi.getCurrentUser();
      await persistSession({ accessToken, user: currentUser });
    } catch {
      await clearAuthSession();
      await persistSession(null);
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email: string, password: string) => {
      const nextSession = await authApi.login({ email, password });
      await persistSession(nextSession);
      return nextSession;
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      await clearAuthSession();
      await persistSession(null);
    }
  }, [persistSession]);

  const refreshAuth = useCallback(async () => {
    const accessToken = await refreshSession();
    if (!accessToken) {
      await persistSession(null);
      return;
    }
    const currentUser = await authApi.getCurrentUser();
    await persistSession({ accessToken, user: currentUser });
  }, [persistSession]);

  const updateProfile = useCallback(
    async (payload: UpdateProfileDto) => {
      const user = await authApi.updateProfile(payload);
      await updateLocalUser(user);
      return user;
    },
    [updateLocalUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isAuthenticated: !!session?.user,
      role: getRoleName(session?.user?.roles?.[0]) || null,
      bootstrap,
      login,
      logout,
      refreshAuth,
      updateLocalUser,
      updateProfile,
    }),
    [bootstrap, loading, login, logout, refreshAuth, session, updateLocalUser, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

import { clearAllEditorRecovery } from "../features/assessment-editor/recovery";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "../api/services/auth";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  refreshSession,
} from "../api/client";
import { readSessionSnapshot, writeSessionSnapshot } from "../api/storage";
import type { AuthSession } from "../types/auth";
import type { UpdateProfileDto } from "../types/profile";
import type { User } from "../types/user";
import { isProfileIncomplete as resolveProfileIncomplete } from "../utils/accountSecurity";

type AuthContextValue = {
  session: AuthSession | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isProfileIncomplete: boolean;
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
    if (
      next &&
      (next.user.isEmailVerified !== true || next.user.status !== "ACTIVE")
    ) {
      setSession(null);
      await clearAuthSession();
      await writeSessionSnapshot(null);
      throw new Error(
        next.user.isEmailVerified !== true
          ? "Email not verified. Please check your inbox."
          : "Account is not active. Contact administrator.",
      );
    }
    setSession(next);
    await writeSessionSnapshot(next);
  }, []);

  const updateLocalUser = useCallback(
    async (user: User | null) => {
      const access = getAccessToken();
      const refresh = getRefreshToken();
      await persistSession(
        user && access && refresh
          ? { accessToken: access, refreshToken: refresh, user }
          : null,
      );
    },
    [persistSession],
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    const snapshot = await readSessionSnapshot();
    if (snapshot?.accessToken && snapshot?.refreshToken) {
      setSession(snapshot);
    }

    try {
      const refreshed = await refreshSession();
      if (!refreshed) {
        await clearAuthSession();
        await persistSession(null);
        return;
      }

      const currentUser = await authApi.getCurrentUser();
      await persistSession({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        user: currentUser,
      });
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
      await clearAllEditorRecovery();
    }
  }, [persistSession]);

  const refreshAuth = useCallback(async () => {
    const refreshed = await refreshSession();
    if (!refreshed) {
      await persistSession(null);
      return;
    }

    const currentUser = await authApi.getCurrentUser();
    await persistSession({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user: currentUser,
    });
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
      isAuthenticated:
        session?.user.isEmailVerified === true &&
        session.user.status === "ACTIVE",
      isProfileIncomplete: resolveProfileIncomplete(session?.user),
      bootstrap,
      login,
      logout,
      refreshAuth,
      updateLocalUser,
      updateProfile,
    }),
    [
      bootstrap,
      loading,
      login,
      logout,
      refreshAuth,
      session,
      updateLocalUser,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

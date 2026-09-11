"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/providers/AuthProvider";
import { adminDemoModeService } from "@/services/admin-demo-mode-service";
import type {
  ActivateAdminDemoMode,
  AdminDemoModeStatus,
  DeactivateAdminDemoMode,
} from "@/types/admin-demo-mode";

type AdminDemoModeContextValue = {
  status: AdminDemoModeStatus | null;
  loading: boolean;
  error: string | null;
  mutating: boolean;
  refresh: () => Promise<void>;
  activate: (payload: ActivateAdminDemoMode) => Promise<void>;
  deactivate: (payload: DeactivateAdminDemoMode) => Promise<void>;
};

const AdminDemoModeContext = createContext<
  AdminDemoModeContextValue | undefined
>(undefined);

export function AdminDemoModeProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [status, setStatus] = useState<AdminDemoModeStatus | null>(null);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const serverOffsetMs = useRef(0);

  const acceptStatus = useCallback((next: AdminDemoModeStatus) => {
    const serverTime = Date.parse(next.serverTime);
    serverOffsetMs.current = Number.isFinite(serverTime)
      ? serverTime - Date.now()
      : 0;
    setStatus(next);
    setClockNow(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setStatus(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      acceptStatus(await adminDemoModeService.getStatus());
      setError(null);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Demo mode status could not be loaded.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [acceptStatus, isAdmin]);

  useEffect(() => {
    void refresh();
    if (!isAdmin) return;

    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const poll = window.setInterval(() => void refresh(), 30_000);
    const clock = window.setInterval(
      () => setClockNow((current) => Math.max(Date.now(), current + 1_000)),
      1_000,
    );

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [isAdmin, refresh]);

  const effectiveStatus = useMemo(() => {
    if (!status?.active || !status.expiresAt) return status;
    const now = clockNow + serverOffsetMs.current;
    if (Date.parse(status.expiresAt) > now) return status;
    return { ...status, active: false, state: "expired" as const };
  }, [clockNow, status]);

  const activate = useCallback(
    async (payload: ActivateAdminDemoMode) => {
      setMutating(true);
      setError(null);
      try {
        acceptStatus(await adminDemoModeService.activate(payload));
      } catch (requestError) {
        const message = getApiErrorMessage(
          requestError,
          "Demo mode could not be activated.",
        );
        setError(message);
        throw requestError;
      } finally {
        setMutating(false);
      }
    },
    [acceptStatus],
  );

  const deactivate = useCallback(
    async (payload: DeactivateAdminDemoMode) => {
      setMutating(true);
      setError(null);
      try {
        acceptStatus(await adminDemoModeService.deactivate(payload));
      } catch (requestError) {
        const message = getApiErrorMessage(
          requestError,
          "Demo mode could not be deactivated.",
        );
        setError(message);
        throw requestError;
      } finally {
        setMutating(false);
      }
    },
    [acceptStatus],
  );

  const value = useMemo(
    () => ({
      status: effectiveStatus,
      loading,
      error,
      mutating,
      refresh,
      activate,
      deactivate,
    }),
    [effectiveStatus, loading, error, mutating, refresh, activate, deactivate],
  );

  return (
    <AdminDemoModeContext.Provider value={value}>
      {children}
    </AdminDemoModeContext.Provider>
  );
}

export function useAdminDemoMode() {
  const context = useContext(AdminDemoModeContext);
  if (!context) {
    throw new Error(
      "useAdminDemoMode must be used within AdminDemoModeProvider",
    );
  }
  return context;
}

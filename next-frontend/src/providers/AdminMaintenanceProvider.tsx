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
import { adminMaintenanceService } from "@/services/admin-maintenance-service";
import type {
  AdminMaintenanceStatus,
  OpenAdminMaintenanceSession,
} from "@/types/admin-maintenance";

type AdminMaintenanceContextValue = {
  status: AdminMaintenanceStatus | null;
  loading: boolean;
  error: string | null;
  mutating: boolean;
  refresh: () => Promise<void>;
  open: (payload: OpenAdminMaintenanceSession) => Promise<void>;
  close: () => Promise<void>;
};

const AdminMaintenanceContext = createContext<
  AdminMaintenanceContextValue | undefined
>(undefined);

export function AdminMaintenanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [status, setStatus] = useState<AdminMaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const serverOffsetMs = useRef(0);

  const acceptStatus = useCallback((next: AdminMaintenanceStatus) => {
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
      acceptStatus(await adminMaintenanceService.getStatus());
      setError(null);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Maintenance Access status could not be loaded.",
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
    if (
      !status?.active ||
      status.mode === "manual" ||
      !status.expiresAt
    ) {
      return status;
    }
    const now = clockNow + serverOffsetMs.current;
    return Date.parse(status.expiresAt) > now
      ? status
      : { ...status, active: false, state: "expired" as const };
  }, [clockNow, status]);

  const open = useCallback(
    async (payload: OpenAdminMaintenanceSession) => {
      setMutating(true);
      setError(null);
      try {
        acceptStatus(await adminMaintenanceService.open(payload));
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Maintenance Access could not be turned on.",
          ),
        );
        throw requestError;
      } finally {
        setMutating(false);
      }
    },
    [acceptStatus],
  );

  const close = useCallback(async () => {
    setMutating(true);
    setError(null);
    try {
      acceptStatus(await adminMaintenanceService.close());
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Maintenance Access could not be turned off.",
        ),
      );
      throw requestError;
    } finally {
      setMutating(false);
    }
  }, [acceptStatus]);

  const value = useMemo(
    () => ({
      status: effectiveStatus,
      loading,
      error,
      mutating,
      refresh,
      open,
      close,
    }),
    [effectiveStatus, loading, error, mutating, refresh, open, close],
  );

  return (
    <AdminMaintenanceContext.Provider value={value}>
      {children}
    </AdminMaintenanceContext.Provider>
  );
}

export function useAdminMaintenance() {
  const context = useContext(AdminMaintenanceContext);
  if (!context) {
    throw new Error(
      "useAdminMaintenance must be used within AdminMaintenanceProvider",
    );
  }
  return context;
}

export function useOptionalAdminMaintenance() {
  return useContext(AdminMaintenanceContext);
}

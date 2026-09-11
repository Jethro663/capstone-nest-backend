import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminDemoModeApi } from "../api/services/admin-demo-mode";
import { useAdminNetworkStatus } from "./useAdminNetworkStatus";
import type {
  ActivateAdminDemoMode,
  AdminDemoModeStatus,
  DeactivateAdminDemoMode,
} from "../types/admin-demo-mode";
import { hasAdminDemoModeRule } from "../types/admin-demo-mode";

export const ADMIN_DEMO_MODE_QUERY_KEY = ["admin-demo-mode"] as const;

const ADMIN_QUERY_PREFIXES = [
  ["admin-users"],
  ["admin-user"],
  ["admin-user-monitoring"],
  ["admin-sections"],
  ["admin-section-advisers"],
  ["admin-classes"],
  ["admin-class-form-sections"],
  ["admin-class-form-teachers"],
  ["admin-roster"],
  ["admin-roster-sections"],
  ["admin-roster-pending"],
  ["academic"],
] as const;

function effectiveStatus(
  status: AdminDemoModeStatus | undefined,
  now: number,
): AdminDemoModeStatus | undefined {
  if (!status?.active || !status.expiresAt) return status;
  if (Date.parse(status.expiresAt) > now) return status;
  return { ...status, active: false, state: "expired" };
}

export function useAdminDemoMode() {
  const queryClient = useQueryClient();
  const network = useAdminNetworkStatus();
  const [now, setNow] = useState(Date.now());
  const query = useQuery({
    queryKey: ADMIN_DEMO_MODE_QUERY_KEY,
    queryFn: adminDemoModeApi.getStatus,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !network.isOffline) void query.refetch();
    });
    return () => {
      clearInterval(clock);
      subscription.remove();
    };
  }, [network.isOffline, query.refetch]);

  const acceptStatus = async (status: AdminDemoModeStatus) => {
    queryClient.setQueryData(ADMIN_DEMO_MODE_QUERY_KEY, status);
    await queryClient.invalidateQueries({
      queryKey: ADMIN_DEMO_MODE_QUERY_KEY,
    });
    await Promise.all(
      ADMIN_QUERY_PREFIXES.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  };

  const activation = useMutation({
    mutationFn: adminDemoModeApi.activate,
    onSuccess: acceptStatus,
  });
  const deactivation = useMutation({
    mutationFn: adminDemoModeApi.deactivate,
    onSuccess: acceptStatus,
  });

  const status = useMemo(() => {
    const serverTime = Date.parse(query.data?.serverTime ?? "");
    const serverOffset = Number.isFinite(serverTime)
      ? serverTime - query.dataUpdatedAt
      : 0;
    return effectiveStatus(query.data, now + serverOffset);
  }, [now, query.data, query.dataUpdatedAt]);

  const assertOnline = () => {
    if (network.isOffline) {
      throw new Error("Reconnect before changing Demo mode.");
    }
  };

  return {
    status,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isOffline: network.isOffline,
    isCachedOffline: network.isOffline && Boolean(query.data),
    isMutating: activation.isPending || deactivation.isPending,
    refresh: query.refetch,
    hasExactRule: (code: Parameters<typeof hasAdminDemoModeRule>[1]) =>
      hasAdminDemoModeRule(status, code),
    activate: async (payload: ActivateAdminDemoMode) => {
      assertOnline();
      return activation.mutateAsync(payload);
    },
    deactivate: async (payload: DeactivateAdminDemoMode) => {
      assertOnline();
      return deactivation.mutateAsync(payload);
    },
  };
}

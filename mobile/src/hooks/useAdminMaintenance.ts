import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminMaintenanceApi } from "../api/services/admin-maintenance";
import { useAdminNetworkStatus } from "./useAdminNetworkStatus";
import {
  hasAdminMaintenanceRule,
  type AdminMaintenanceStatus,
  type OpenAdminMaintenanceSession,
} from "../types/admin-maintenance";

export const ADMIN_MAINTENANCE_QUERY_KEY = ["admin-maintenance"] as const;

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
  status: AdminMaintenanceStatus | undefined,
  now: number,
) {
  if (
    !status?.active ||
    status.mode === "manual" ||
    !status.expiresAt
  ) {
    return status;
  }
  return Date.parse(status.expiresAt) > now
    ? status
    : { ...status, active: false, state: "expired" as const };
}

export function useAdminMaintenance() {
  const queryClient = useQueryClient();
  const network = useAdminNetworkStatus();
  const [now, setNow] = useState(Date.now());
  const query = useQuery({
    queryKey: ADMIN_MAINTENANCE_QUERY_KEY,
    queryFn: adminMaintenanceApi.getStatus,
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

  const acceptStatus = async (status: AdminMaintenanceStatus) => {
    queryClient.setQueryData(ADMIN_MAINTENANCE_QUERY_KEY, status);
    await queryClient.invalidateQueries({
      queryKey: ADMIN_MAINTENANCE_QUERY_KEY,
    });
    await Promise.all(
      ADMIN_QUERY_PREFIXES.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  };

  const opening = useMutation({
    mutationFn: adminMaintenanceApi.open,
    onSuccess: acceptStatus,
  });
  const closing = useMutation({
    mutationFn: adminMaintenanceApi.close,
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
      throw new Error("Reconnect before changing Maintenance Access.");
    }
  };

  return {
    status,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isOffline: network.isOffline,
    isCachedOffline: network.isOffline && Boolean(query.data),
    isMutating: opening.isPending || closing.isPending,
    refresh: query.refetch,
    hasExactRule: (code: Parameters<typeof hasAdminMaintenanceRule>[1]) =>
      hasAdminMaintenanceRule(status, code),
    open: async (payload: OpenAdminMaintenanceSession) => {
      assertOnline();
      return opening.mutateAsync(payload);
    },
    close: async () => {
      assertOnline();
      return closing.mutateAsync();
    },
  };
}

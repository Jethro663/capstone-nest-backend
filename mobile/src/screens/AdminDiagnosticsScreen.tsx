import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { adminApi } from "../api/services/admin";
import {
  AdminDataRow,
  AdminEmpty,
  AdminNotice,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "AdminDiagnostics">;

export function AdminDiagnosticsScreen(_props: Props) {
  const liveness = useQuery({
    queryKey: ["admin-diagnostics", "live"],
    queryFn: () => adminApi.getLiveness(),
  });
  const readiness = useQuery({
    queryKey: ["admin-diagnostics", "ready"],
    queryFn: () => adminApi.getReadiness(),
  });
  const refresh = () =>
    void Promise.all([liveness.refetch(), readiness.refetch()]);
  return (
    <AdminScreen
      title="Diagnostics"
      subtitle="Backend liveness and dependency readiness"
      refreshing={liveness.isRefetching || readiness.isRefetching}
      onRefresh={refresh}
      showRefreshAction
    >
      {liveness.isError || readiness.isError ? (
        <AdminNotice
          title="Diagnostics are incomplete"
          description="One or more health contracts could not be reached. Pull to retry."
          tone="red"
        />
      ) : null}
      <AdminSection title="API liveness" subtitle="Direct server response">
        <AdminDataRow
          title="API server"
          subtitle={
            liveness.data?.timestamp
              ? new Date(liveness.data.timestamp).toLocaleString()
              : "No timestamp returned"
          }
          status={liveness.data?.status ?? "Unavailable"}
          statusTone={liveness.data?.status === "ok" ? "green" : "red"}
        />
      </AdminSection>
      <AdminSection
        title="Dependency readiness"
        subtitle="Backend-owned checks; degraded is distinct from unavailable"
      >
        {Object.entries(readiness.data?.dependencies ?? {}).map(
          ([name, state]) => (
            <AdminDataRow
              key={name}
              title={name}
              subtitle={
                state.message ??
                (state.degraded
                  ? "Available with reduced capability"
                  : state.ok
                    ? "Operating normally"
                    : "Unavailable")
              }
              status={
                state.degraded ? "Degraded" : state.ok ? "Ready" : "Issue"
              }
              statusTone={state.degraded ? "amber" : state.ok ? "green" : "red"}
            />
          ),
        )}
        {!Object.keys(readiness.data?.dependencies ?? {}).length &&
        !readiness.isLoading ? (
          <AdminEmpty
            title="No dependency evidence"
            subtitle="The readiness endpoint returned no dependency records."
          />
        ) : null}
      </AdminSection>
    </AdminScreen>
  );
}

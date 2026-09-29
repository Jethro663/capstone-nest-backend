import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { adminApi } from "../api/services/admin";
import { AdminAsyncState } from "../components/admin/AdminAsyncState";
import {
  AdminDataRow,
  AdminEmpty,
  AdminNotice,
  AdminScreen,
  AdminSection,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "AdminDiagnostics">;

function formatAge(seconds: number | null) {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`;
}

export function AdminDiagnosticsScreen(_props: Props) {
  const liveness = useQuery({
    queryKey: ["admin-diagnostics", "live"],
    queryFn: () => adminApi.getLiveness(),
  });
  const readiness = useQuery({
    queryKey: ["admin-diagnostics", "ready"],
    queryFn: () => adminApi.getReadiness(),
  });
  const workflows = useQuery({
    queryKey: ["admin-diagnostics", "workflows"],
    queryFn: () => adminApi.getWorkflowDiagnostics(),
  });
  const refresh = () =>
    void Promise.all([liveness.refetch(), readiness.refetch(), workflows.refetch()]);
  return (
    <AdminScreen
      title="Diagnostics"
      subtitle="Backend liveness and dependency readiness"
      refreshing={liveness.isRefetching || readiness.isRefetching || workflows.isRefetching}
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
      <AdminSection
        title="Workflow queues"
        subtitle="Aggregate job state only; no people, class, or payload details"
      >
        <AdminAsyncState
          isLoading={workflows.isLoading}
          hasData={Boolean(workflows.data)}
          error={
            workflows.isError
              ? workflows.error instanceof Error
                ? workflows.error.message
                : "Workflow diagnostics unavailable"
              : null
          }
          onRetry={() => void workflows.refetch()}
          isRetrying={workflows.isRefetching}
          empty={
            <AdminEmpty
              title="No workflow evidence"
              subtitle="The diagnostics endpoint returned no workflow state."
            />
          }
        >
          {workflows.data?.alerts.map((alert) => (
            <AdminNotice
              key={alert.code}
              title={alert.severity === "critical" ? "Critical workflow alert" : "Workflow warning"}
              description={alert.message}
              tone={alert.severity === "critical" ? "red" : "amber"}
            />
          ))}
          {workflows.data?.totals.map((item) => (
            <AdminDataRow
              key={item.status}
              title={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              subtitle={
                item.oldestAgeSeconds === null
                  ? "No age applies to this terminal status"
                  : `Oldest: ${formatAge(item.oldestAgeSeconds)}`
              }
              status={`${item.count} ${item.count === 1 ? "job" : "jobs"}`}
              statusTone={item.status === "failed" && item.count > 0 ? "red" : item.oldestAgeSeconds && item.oldestAgeSeconds > workflows.data.staleAfterSeconds ? "amber" : "neutral"}
            />
          ))}
        </AdminAsyncState>
      </AdminSection>
    </AdminScreen>
  );
}

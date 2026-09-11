import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { adminApi } from "../api/services/admin";
import { academicStateService } from "../api/services/academic-state";
import { toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import {
  AdminDataRow,
  AdminEmpty,
  AdminMetricStrip,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "Home">;

export function AdminHomeScreen({ navigation }: Props) {
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminApi.getOverview(),
  });
  const academicState = useQuery({
    queryKey: ["academic", "current"],
    queryFn: async () => (await academicStateService.getCurrent()).data,
  });
  const recentOperations = useQuery({
    queryKey: ["admin-audit", "home-recent"],
    queryFn: () => adminApi.getAuditPage({ page: 1, limit: 5 }),
  });
  const stats = overview.data?.stats;
  const dependencies = overview.data
    ? Object.entries(overview.data.readiness.dependencies)
    : [];
  const attentionItems = dependencies.filter(
    ([, status]) => !status.ok || status.degraded,
  );
  const attentionCount = attentionItems.length;
  const rootNavigation = navigation.getParent() as unknown as {
    navigate: (name: string, params?: unknown) => void;
  };

  return (
    <AdminScreen
      title="Admin overview"
      subtitle="School operations, people, and system readiness"
      rightAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          onPress={() => rootNavigation.navigate("Notifications")}
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={20}
            color={theme.primary}
          />
        </Pressable>
      }
      refreshing={
        overview.isRefetching ||
        academicState.isRefetching ||
        recentOperations.isRefetching
      }
      onRefresh={() => {
        void overview.refetch();
        void academicState.refetch();
        void recentOperations.refetch();
      }}
    >
      {overview.isError ? (
        <AdminEmpty
          title="Overview unavailable"
          subtitle={toAppError(overview.error).message}
          icon="alert-circle-outline"
          actionLabel="Try again"
          onAction={() => void overview.refetch()}
        />
      ) : null}

      <AdminSection
        title="Current academic state"
        subtitle="Backend-authoritative school year, policy period, and freshness"
      >
        {academicState.data ? (
          <AdminDataRow
            title={academicState.data.schoolYear}
            subtitle={
              academicState.data.periods.find(
                (period) => period.key === academicState.data?.quarter,
              )?.label ?? academicState.data.quarter
            }
            meta={`Version ${academicState.data.version} · updated ${new Date(academicState.data.updatedAt).toLocaleString()}`}
            status="Current"
            statusTone="green"
            onPress={() => navigation.navigate("AdminSettings")}
          />
        ) : (
          <AdminDataRow
            title={
              academicState.isError
                ? "Academic state unavailable"
                : "Loading academic state…"
            }
            subtitle={
              academicState.isError
                ? toAppError(academicState.error).message
                : "Waiting for the authoritative backend state"
            }
            status={academicState.isError ? "Review" : "Loading"}
            statusTone={academicState.isError ? "red" : "neutral"}
            onPress={() => navigation.navigate("AdminSettings")}
          />
        )}
      </AdminSection>

      <AdminSection
        title="Needs attention"
        subtitle="Only backend-supported exceptions appear here"
      >
        {attentionItems.length ? (
          attentionItems.map(([name, status]) => (
            <AdminDataRow
              key={name}
              title={name}
              subtitle={
                status.message ||
                (status.degraded
                  ? "Available with reduced capability"
                  : "Dependency unavailable")
              }
              status={status.degraded ? "Degraded" : "Issue"}
              statusTone={status.degraded ? "amber" : "red"}
              onPress={() => navigation.navigate("AdminDiagnostics")}
            />
          ))
        ) : (
          <AdminDataRow
            title="No system exceptions"
            subtitle="The current readiness response has no degraded or unavailable dependencies"
            status="Ready"
            statusTone="green"
            onPress={() => navigation.navigate("AdminDiagnostics")}
          />
        )}
      </AdminSection>

      <AdminSection
        title="Recent operations"
        subtitle="Latest immutable audit events; open Audit Trail for full evidence"
      >
        {(recentOperations.data?.data ?? []).length ? (
          recentOperations.data!.data.map((event) => (
            <AdminDataRow
              key={event.id}
              title={event.action}
              subtitle={`${event.targetType} · ${event.actor?.email ?? event.actorId}`}
              meta={new Date(event.createdAt).toLocaleString()}
              onPress={() => navigation.navigate("AdminAudit")}
            />
          ))
        ) : (
          <AdminDataRow
            title={
              recentOperations.isError
                ? "Recent operations unavailable"
                : "No recent operations"
            }
            subtitle={
              recentOperations.isError
                ? toAppError(recentOperations.error).message
                : "No audit events were returned"
            }
            onPress={() => navigation.navigate("AdminAudit")}
          />
        )}
      </AdminSection>

      {stats ? (
        <AdminMetricStrip
          items={[
            { label: "Users", value: stats.totalUsers },
            { label: "Students", value: stats.totalStudents },
            { label: "Teachers", value: stats.totalTeachers },
            { label: "Classes", value: stats.totalClasses },
          ]}
        />
      ) : null}

      <AdminSection
        title="Review and act"
        subtitle="The most common administration workspaces"
      >
        <AdminDataRow
          title="People and access"
          subtitle="Create accounts and review account status"
          meta={
            stats ? `${stats.totalUsers} accounts` : "Open user administration"
          }
          onPress={() => navigation.navigate("AdminUsers")}
        />
        <AdminDataRow
          title="Classes and sections"
          subtitle="Inspect assignments, rosters, and schedules"
          meta={
            stats
              ? `${stats.totalClasses} classes`
              : "Open class administration"
          }
          onPress={() => navigation.navigate("AdminClasses")}
        />
        <AdminDataRow
          title="Academic controls"
          subtitle="Periods, records, readiness, and recovery"
          onPress={() => navigation.navigate("AdminSettings")}
        />
        <AdminDataRow
          title="System diagnostics"
          subtitle="API, database, cache, and AI dependencies"
          status={attentionCount ? `${attentionCount} to review` : "Ready"}
          statusTone={attentionCount ? "amber" : "green"}
          onPress={() => navigation.navigate("AdminDiagnostics")}
        />
      </AdminSection>

      <AdminSection
        title="System readiness"
        subtitle="Live backend dependency checks"
      >
        {dependencies.length ? (
          dependencies.map(([name, status]) => (
            <AdminDataRow
              key={name}
              title={name}
              subtitle={
                status.ok
                  ? status.degraded
                    ? "Available with reduced capability"
                    : "Operating normally"
                  : status.message || "Unavailable"
              }
              status={
                status.ok ? (status.degraded ? "Degraded" : "Ready") : "Issue"
              }
              statusTone={
                status.ok ? (status.degraded ? "amber" : "green") : "red"
              }
            />
          ))
        ) : (
          <View style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
            <Text style={{ fontSize: 12, color: theme.muted }}>
              Loading system readiness…
            </Text>
          </View>
        )}
      </AdminSection>
    </AdminScreen>
  );
}

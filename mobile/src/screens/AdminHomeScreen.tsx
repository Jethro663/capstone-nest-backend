import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { adminApi } from "../api/services/admin";
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
  const stats = overview.data?.stats;
  const dependencies = overview.data
    ? Object.entries(overview.data.readiness.dependencies)
    : [];
  const attentionCount = dependencies.filter(([, status]) => !status.ok || status.degraded).length;

  return (
    <AdminScreen
      title="Admin overview"
      subtitle="School operations, people, and system readiness"
      refreshing={overview.isRefetching}
      onRefresh={() => void overview.refetch()}
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
          meta={stats ? `${stats.totalUsers} accounts` : "Open user administration"}
          onPress={() => navigation.navigate("AdminUsers")}
        />
        <AdminDataRow
          title="Classes and sections"
          subtitle="Inspect assignments, rosters, and schedules"
          meta={stats ? `${stats.totalClasses} classes` : "Open class administration"}
          onPress={() => navigation.navigate("Classes")}
        />
        <AdminDataRow
          title="Academic controls"
          subtitle="Periods, records, readiness, and recovery"
          onPress={() => navigation.navigate("Academic")}
        />
        <AdminDataRow
          title="System diagnostics"
          subtitle="API, database, cache, and AI dependencies"
          status={attentionCount ? `${attentionCount} to review` : "Ready"}
          statusTone={attentionCount ? "amber" : "green"}
          onPress={() => navigation.navigate("AdminDiagnostics")}
        />
      </AdminSection>

      <AdminSection title="System readiness" subtitle="Live backend dependency checks">
        {dependencies.length ? (
          dependencies.map(([name, status]) => (
            <AdminDataRow
              key={name}
              title={name}
              subtitle={status.ok ? status.degraded ? "Available with reduced capability" : "Operating normally" : status.message || "Unavailable"}
              status={status.ok ? status.degraded ? "Degraded" : "Ready" : "Issue"}
              statusTone={status.ok ? status.degraded ? "amber" : "green" : "red"}
            />
          ))
        ) : (
          <View style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
            <Text style={{ fontSize: 12, color: theme.muted }}>Loading system readiness…</Text>
          </View>
        )}
      </AdminSection>
    </AdminScreen>
  );
}

import { useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { adminApi } from "../api/services/admin";
import { toAppError } from "../api/http";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { TeacherActionButton, TeacherEmpty, TeacherPanel, TeacherRow, TeacherScreen, TeacherStats, teacherTheme as theme } from "../components/teacher/TeacherMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "Home">;

export function AdminHomeScreen({ navigation }: Props) {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => adminApi.getOverview() });
  const openTool = (section: RootStackParamList["AdminTools"]["section"]) => (navigation.getParent() as unknown as { navigate: (name: string, params?: unknown) => void })?.navigate("AdminTools", { section });
  const stats = overview.data?.stats;

  return (
    <TeacherScreen title="Administrator" workspaceLabel="Admin workspace" subtitle="Live operational overview backed by the administrator dashboard contract." icon="shield-account-outline" refreshing={overview.isRefetching} onRefresh={() => void overview.refetch()}>
      {overview.isError ? <TeacherEmpty title="Overview unavailable" subtitle={toAppError(overview.error).message} icon="alert-circle-outline" /> : null}
      {stats ? <TeacherStats items={[
        { label: "Users", value: stats.totalUsers, tone: "red" },
        { label: "Students", value: stats.totalStudents, tone: "blue" },
        { label: "Teachers", value: stats.totalTeachers, tone: "green" },
        { label: "Classes", value: stats.totalClasses, tone: "amber" },
      ]} /> : null}
      <TeacherPanel title="System readiness" subtitle="Backend-owned dependency health, not a client-side guess.">
        {overview.data ? Object.entries(overview.data.readiness.dependencies).map(([name, status]) => <TeacherRow key={name} title={name} subtitle={status.ok ? status.degraded ? "Degraded" : "Ready" : status.message || "Unavailable"} />) : <View style={{ padding: 14 }}><Text style={{ color: theme.muted }}>Loading readiness...</Text></View>}
      </TeacherPanel>
      <TeacherPanel title="Administration modules" subtitle="Open a real RBAC workspace for each basic web administration domain.">
        <View style={{ padding: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {([
            ["users", "Users", "account-multiple-outline"], ["evaluations", "Evaluations", "clipboard-check-outline"], ["calendar", "Calendar", "calendar-month-outline"], ["library", "Library", "folder-open-outline"], ["reports", "Reports", "chart-box-outline"], ["audit", "Audit log", "shield-star-outline"], ["diagnostics", "Diagnostics", "heart-pulse"], ["roster", "Roster import", "account-arrow-right-outline"], ["templates", "Class templates", "content-copy"], ["settings", "System settings", "cog-outline"], ["records", "Academic records", "book-check-outline"],
          ] as const).map(([key, label, icon]) => <TeacherActionButton key={key} label={label} icon={icon} tone="blue" onPress={() => openTool(key)} />)}
        </View>
      </TeacherPanel>
    </TeacherScreen>
  );
}

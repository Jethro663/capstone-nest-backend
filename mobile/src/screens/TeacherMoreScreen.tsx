import { useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";
import { useTeacherClasses, useTeacherPendingInterventions, useTeacherSections } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
} from "../components/teacher/TeacherMobilePrimitives";

export function TeacherMoreScreen() {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const classesQuery = useTeacherClasses(teacherId);
  const sectionsQuery = useTeacherSections("all");
  const pendingInterventionsQuery = useTeacherPendingInterventions();

  const actionRows = useMemo(
    () => [
      {
        title: "Calendar",
        subtitle: "Class schedules, assessments, announcements, and school events in one planner.",
        route: "TeacherCalendar" as const,
      },
      {
        title: "Lessons",
        subtitle: "Reorder and apply bulk publish, draft, or delete lifecycle actions.",
        route: "TeacherLessons" as const,
      },
      {
        title: "Nexora Library",
        subtitle: "Review modules and jump into class content workspaces.",
        route: "TeacherLibrary" as const,
      },
      {
        title: "Class Record",
        subtitle: "Finalize, reopen, and monitor grading period records.",
        route: "TeacherClassRecord" as const,
      },
      {
        title: "Reports",
        subtitle: "Inspect enrollment, performance, assessment, and usage snapshots.",
        route: "TeacherReports" as const,
      },
      {
        title: "Interventions",
        subtitle: "Track active at-risk cases and resolved support cycles.",
        route: "TeacherInterventions" as const,
      },
      {
        title: "Performance",
        subtitle: "Monitor class trends plus intervention quiz score comparisons.",
        route: "TeacherPerformance" as const,
      },
      {
        title: "Evaluations",
        subtitle: "Switch evaluation type and inspect class-level rating breakdowns.",
        route: "TeacherEvaluations" as const,
      },
      {
        title: "Announcements",
        subtitle: "Create, pin, schedule, edit, and delete class announcements.",
        route: "TeacherAnnouncements" as const,
      },
    ],
    [],
  );

  const isRefreshing =
    classesQuery.isRefetching ||
    sectionsQuery.isRefetching ||
    pendingInterventionsQuery.isRefetching;

  return (
    <TeacherScreen
      title="More Teacher Tabs"
      subtitle="A full teacher operations hub with quick actions, reporting, and classroom tools aligned with web workflows."
      icon="view-grid-plus-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={isRefreshing}
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          sectionsQuery.refetch(),
          pendingInterventionsQuery.refetch(),
        ]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Active classes", value: classesQuery.data?.length ?? 0, tone: "red" },
          { label: "Sections", value: sectionsQuery.data?.data?.length ?? 0, tone: "blue" },
          { label: "Pending interventions", value: pendingInterventionsQuery.data?.pendingCount ?? 0, tone: "amber" },
        ]}
      />

      <TeacherPanel title="Quick launch" subtitle="Tap a workflow to jump straight into day-to-day teacher operations.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton label="Calendar" icon="calendar-month-outline" tone="purple" onPress={() => navigation.navigate("TeacherCalendar")} />
          <TeacherActionButton label="Announcements" icon="bullhorn-outline" tone="amber" onPress={() => navigation.navigate("TeacherAnnouncements")} />
          <TeacherActionButton label="Performance" icon="chart-line" tone="blue" onPress={() => navigation.navigate("TeacherPerformance")} />
          <TeacherActionButton label="Interventions" icon="account-alert-outline" tone="red" onPress={() => navigation.navigate("TeacherInterventions")} />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Teaching and records" subtitle="Feature-complete teacher spaces mirrored from web endpoints.">
        {actionRows.map((entry) => (
          <TeacherRow
            key={entry.route}
            title={entry.title}
            subtitle={entry.subtitle}
            onPress={() => navigation.navigate(entry.route)}
          />
        ))}
      </TeacherPanel>

      <TeacherPanel title="Tip" subtitle="Use pull-to-refresh on any tab to sync live data before creating, editing, or finalizing records." />
    </TeacherScreen>
  );
}

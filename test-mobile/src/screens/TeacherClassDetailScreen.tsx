import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import {
  queryKeys,
  useAnnouncements,
  useAssessments,
  useClassDetail,
  useClassModules,
  useSchoolEvents,
  useTeacherEnrollments,
} from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { assessmentsApi } from "../api/services/assessments";
import { toAppError } from "../api/http";
import type { RootStackParamList, TeacherClassDetailTab } from "../navigation/types";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  stripRichText,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherClassDetail">;

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TeacherClassDetailScreen({ navigation, route }: Props) {
  const { classId, initialTab } = route.params;
  const [activeTab, setActiveTab] = useState<TeacherClassDetailTab>(initialTab ?? "modules");
  const classQuery = useClassDetail(classId);
  const modulesQuery = useClassModules(classId);
  const assessmentsQuery = useAssessments(classId);
  const announcementsQuery = useAnnouncements(classId);
  const rosterQuery = useTeacherEnrollments(classId);
  const schoolEventsQuery = useSchoolEvents({ schoolYear: classQuery.data?.schoolYear });

  const upcomingItems = useMemo(() => {
    const assessmentItems = (assessmentsQuery.data ?? []).map((assessment) => ({
      id: `assessment-${assessment.id}`,
      title: assessment.title,
      subtitle: `Assessment · Due ${formatDate(assessment.dueDate)}`,
      sortAt: new Date(assessment.dueDate || 0).getTime(),
      action: () => navigation.navigate("TeacherAssessmentDetail", { assessmentId: assessment.id, classId }),
    }));

    const eventItems = (schoolEventsQuery.data ?? [])
      .filter((entry) => classQuery.data?.schoolYear && entry.schoolYear === classQuery.data.schoolYear)
      .slice(0, 4)
      .map((entry) => ({
        id: `event-${entry.id}`,
        title: entry.title,
        subtitle: `School event · ${formatDate(entry.startsAt)}`,
        sortAt: new Date(entry.startsAt).getTime(),
        action: () => navigation.navigate("TeacherCalendar", { classId }),
      }));

    return [...assessmentItems, ...eventItems]
      .sort((left, right) => left.sortAt - right.sortAt)
      .slice(0, 5);
  }, [assessmentsQuery.data, classQuery.data?.schoolYear, classId, navigation, schoolEventsQuery.data]);

  const topError = classQuery.error || modulesQuery.error || assessmentsQuery.error || announcementsQuery.error || rosterQuery.error;

  return (
    <TeacherScreen
      title={classQuery.data ? `${classQuery.data.subjectCode} · ${classQuery.data.subjectName}` : "Class workspace"}
      subtitle={
        classQuery.data
          ? `${classQuery.data.section?.name || "Section pending"} · ${classQuery.data.schoolYear}`
          : "Teacher class shell"
      }
      icon="google-classroom"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
      refreshing={
        classQuery.isRefetching ||
        modulesQuery.isRefetching ||
        assessmentsQuery.isRefetching ||
        announcementsQuery.isRefetching ||
        rosterQuery.isRefetching
      }
      onRefresh={() => {
        void Promise.all([
          classQuery.refetch(),
          modulesQuery.refetch(),
          assessmentsQuery.refetch(),
          announcementsQuery.refetch(),
          rosterQuery.refetch(),
          schoolEventsQuery.refetch(),
        ]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Modules", value: modulesQuery.data?.length ?? 0, tone: "red" },
          { label: "Assessments", value: assessmentsQuery.data?.length ?? 0, tone: "blue" },
          { label: "Announcements", value: announcementsQuery.data?.length ?? 0, tone: "amber" },
          { label: "Students", value: rosterQuery.data?.length ?? 0, tone: "green" },
        ]}
      />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {(["modules", "assessments", "announcements", "calendar", "students"] as const).map((entry) => (
          <TeacherChip
            key={entry}
            label={entry[0].toUpperCase() + entry.slice(1)}
            active={activeTab === entry}
            onPress={() => setActiveTab(entry)}
          />
        ))}
      </View>

      {topError ? (
        <TeacherPanel title="Class data issue" subtitle={toAppError(topError).message}>
          <TeacherEmpty title="Unable to render the full class" subtitle="Pull to refresh once the class APIs are stable again." />
        </TeacherPanel>
      ) : null}

      {activeTab === "modules" ? (
        <TeacherPanel title="Modules" subtitle="Open modules, inspect their content, and manage lock or visibility at the module level.">
          {modulesQuery.data?.length ? (
            modulesQuery.data.map((module) => (
              <TeacherRow
                key={module.id}
                title={module.title}
                subtitle={`${module.sections?.length ?? 0} sections · ${module.isLocked ? "Locked" : "Unlocked"} · ${module.isVisible === false ? "Hidden" : "Visible"}`}
                onPress={() => navigation.navigate("TeacherModuleDetail", { classId, moduleId: module.id })}
              />
            ))
          ) : (
            <TeacherEmpty title="No modules yet" subtitle="Class modules will appear here once they are attached or published." icon="view-module-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "assessments" ? (
        <TeacherPanel title="Assessments" subtitle="Open an assessment to review submissions, grade attempts, or change publish state.">
          {assessmentsQuery.data?.length ? (
            assessmentsQuery.data.map((assessment) => (
              <TeacherRow
                key={assessment.id}
                title={assessment.title}
                subtitle={`${assessment.isPublished ? "Published" : "Draft"} · ${assessment.type.replace(/_/g, " ")} · Due ${formatDate(assessment.dueDate)}`}
                onPress={() =>
                  navigation.navigate("TeacherAssessmentDetail", {
                    assessmentId: assessment.id,
                    classId,
                  })
                }
              />
            ))
          ) : (
            <TeacherEmpty title="No assessments yet" subtitle="Assessments assigned to this class will appear here." icon="clipboard-text-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "announcements" ? (
        <TeacherPanel title="Announcements" subtitle="Review recent updates for this class or jump to the full announcement manager.">
          {announcementsQuery.data?.length ? (
            announcementsQuery.data.map((announcement) => (
              <TeacherRow
                key={announcement.id}
                title={announcement.title}
                subtitle={`${announcement.isPinned ? "Pinned" : "Post"} · ${stripRichText(announcement.content).slice(0, 110) || "No content preview available."}`}
                onPress={() => navigation.getParent()?.navigate("Announcements" as never)}
              />
            ))
          ) : (
            <TeacherEmpty title="No announcements yet" subtitle="Use the announcements tab to publish quick class updates." icon="bullhorn-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "calendar" ? (
        <TeacherPanel title="Calendar" subtitle="Upcoming class-relevant dates pulled from assessments and school events.">
          {upcomingItems.length ? (
            upcomingItems.map((entry) => (
              <TeacherRow key={entry.id} title={entry.title} subtitle={entry.subtitle} onPress={entry.action} />
            ))
          ) : (
            <TeacherEmpty title="No upcoming items" subtitle="No assessments or school events are queued for this class right now." icon="calendar-blank-outline" />
          )}
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Pressable
              onPress={() => navigation.navigate("TeacherCalendar", { classId })}
              style={{
                borderRadius: 10,
                backgroundColor: theme.redSoft,
                paddingHorizontal: 12,
                paddingVertical: 11,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.red }}>Open full calendar</Text>
            </Pressable>
          </View>
        </TeacherPanel>
      ) : null}

      {activeTab === "students" ? (
        <TeacherPanel title="Roster" subtitle="Simple learner list for quick mobile checks.">
          {rosterQuery.data?.length ? (
            rosterQuery.data.map((entry) => {
              const name = [entry.student?.firstName, entry.student?.lastName].filter(Boolean).join(" ").trim() || entry.student?.email || "Learner";
              return (
                <TeacherRow
                  key={entry.id}
                  title={name}
                  subtitle={entry.student?.email || "No email available"}
                />
              );
            })
          ) : (
            <TeacherEmpty title="No roster loaded" subtitle="Enrolled learners will appear here when the class roster is available." icon="account-group-outline" />
          )}
        </TeacherPanel>
      ) : null}
    </TeacherScreen>
  );
}

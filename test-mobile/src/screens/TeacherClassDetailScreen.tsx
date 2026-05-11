import { useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
  useAnnouncements,
  useAssessments,
  useClassDetail,
  useClassModules,
  useSchoolEvents,
  useTeacherEnrollments,
} from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { toAppError } from "../api/http";
import type { RootStackParamList, TeacherClassDetailTab } from "../navigation/types";
import { TeacherClassRecordBoard } from "../components/teacher/TeacherClassRecordBoard";
import { TeacherDiscussionBoard } from "../components/teacher/TeacherDiscussionBoard";
import { TeacherExtractionBoard } from "../components/teacher/TeacherExtractionBoard";
import {
  TeacherActionButton,
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

const CLASS_TABS: Array<{ key: TeacherClassDetailTab; label: string }> = [
  { key: "modules", label: "Modules" },
  { key: "assessments", label: "Assessments" },
  { key: "announcements", label: "Announcements" },
  { key: "extraction", label: "Extraction" },
  { key: "discussion", label: "Discussion Board" },
  { key: "classRecord", label: "Class Record" },
  { key: "calendar", label: "Calendar" },
  { key: "students", label: "Students" },
];

export function TeacherClassDetailScreen({ navigation, route }: Props) {
  const { classId, initialTab } = route.params;
  const [activeTab, setActiveTab] = useState<TeacherClassDetailTab>(initialTab ?? "modules");
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const tabRefetchersRef = useRef<Partial<Record<TeacherClassDetailTab, () => Promise<unknown>>>>({});
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
      subtitle: `Assessment - Due ${formatDate(assessment.dueDate)}`,
      sortAt: new Date(assessment.dueDate || 0).getTime(),
      action: () => navigation.navigate("TeacherAssessmentDetail", { assessmentId: assessment.id, classId }),
    }));

    const eventItems = (schoolEventsQuery.data ?? [])
      .filter((entry) => classQuery.data?.schoolYear && entry.schoolYear === classQuery.data.schoolYear)
      .slice(0, 4)
      .map((entry) => ({
        id: `event-${entry.id}`,
        title: entry.title,
        subtitle: `School event - ${formatDate(entry.startsAt)}`,
        sortAt: new Date(entry.startsAt).getTime(),
        action: () => navigation.navigate("TeacherCalendar", { classId }),
      }));

    return [...assessmentItems, ...eventItems]
      .sort((left, right) => left.sortAt - right.sortAt)
      .slice(0, 5);
  }, [assessmentsQuery.data, classQuery.data?.schoolYear, classId, navigation, schoolEventsQuery.data]);

  const topError = classQuery.error || modulesQuery.error || assessmentsQuery.error || announcementsQuery.error || rosterQuery.error;
  const registerTabRefetcher =
    (tab: TeacherClassDetailTab) =>
    (refetcher: () => Promise<unknown>) => {
      tabRefetchersRef.current[tab] = refetcher;
    };

  const handleCreateAssessment = async () => {
    if (creatingAssessment) return;
    try {
      setCreatingAssessment(true);
      const created = await assessmentsApi.create({
        title: "Untitled Assessment",
        classId,
      });
      navigation.navigate("TeacherAssessmentEditor", {
        assessmentId: created.id,
        classId: created.classId,
      });
    } catch (error) {
      Alert.alert("Unable to create assessment", toAppError(error).message);
    } finally {
      setCreatingAssessment(false);
    }
  };

  return (
    <TeacherScreen
      title={classQuery.data ? `${classQuery.data.subjectCode} - ${classQuery.data.subjectName}` : "Class workspace"}
      subtitle={
        classQuery.data
          ? `${classQuery.data.section?.name || "Section pending"} - ${classQuery.data.schoolYear}`
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
        const tasks: Array<Promise<unknown>> = [
          classQuery.refetch(),
          modulesQuery.refetch(),
          assessmentsQuery.refetch(),
          announcementsQuery.refetch(),
          rosterQuery.refetch(),
          schoolEventsQuery.refetch(),
        ];
        const activeTabRefetcher = tabRefetchersRef.current[activeTab];
        if (activeTabRefetcher) {
          tasks.push(activeTabRefetcher());
        }
        void Promise.all(tasks);
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingRight: 20, gap: 6 }}
      >
        {CLASS_TABS.map((entry) => (
          <TeacherChip
            key={entry.key}
            label={entry.label}
            active={activeTab === entry.key}
            onPress={() => setActiveTab(entry.key)}
          />
        ))}
      </ScrollView>
      <Text style={{ marginTop: 6, marginHorizontal: 16, fontSize: 11, color: theme.muted }}>
        Swipe tabs to view all class tools, including Extraction, Discussion Board, and Class Record.
      </Text>

      <TeacherPanel title="Class actions" subtitle="Mobile shortcuts for web teacher deep workflows.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="AI draft"
            icon="robot-outline"
            tone="purple"
            onPress={() => navigation.navigate("TeacherAiDraft", { classId })}
          />
          <TeacherActionButton
            label="Add students"
            icon="account-multiple-plus-outline"
            tone="green"
            onPress={() => navigation.navigate("TeacherClassAddStudents", { classId })}
          />
        </View>
      </TeacherPanel>

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
                subtitle={`${module.sections?.length ?? 0} sections - ${module.isLocked ? "Locked" : "Unlocked"} - ${module.isVisible === false ? "Hidden" : "Visible"}`}
                onPress={() => navigation.navigate("TeacherModuleDetail", { classId, moduleId: module.id })}
              />
            ))
          ) : (
            <TeacherEmpty title="No modules yet" subtitle="Class modules will appear here once they are attached or published." icon="view-module-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "assessments" ? (
        <TeacherPanel
          title="Assessments"
          subtitle="Open an assessment to review submissions, grade attempts, edit questions, or create new drafts."
          action={
            <TeacherActionButton
              label={creatingAssessment ? "Creating..." : "Create"}
              icon="plus"
              tone="green"
              disabled={creatingAssessment}
              onPress={() => void handleCreateAssessment()}
            />
          }
        >
          {assessmentsQuery.data?.length ? (
            assessmentsQuery.data.map((assessment) => (
              <TeacherRow
                key={assessment.id}
                title={assessment.title}
                subtitle={`${assessment.isPublished ? "Published" : "Draft"} - ${assessment.type.replace(/_/g, " ")} - Due ${formatDate(assessment.dueDate)}`}
                onPress={() =>
                  navigation.navigate("TeacherAssessmentDetail", {
                    assessmentId: assessment.id,
                    classId,
                  })
                }
                right={
                  <Pressable
                    onPress={() =>
                      navigation.navigate("TeacherAssessmentEditor", {
                        assessmentId: assessment.id,
                        classId,
                      })
                    }
                    style={{
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.text }}>Edit</Text>
                  </Pressable>
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
                subtitle={`${announcement.isPinned ? "Pinned" : "Post"} - ${stripRichText(announcement.content).slice(0, 110) || "No content preview available."}`}
                onPress={() => navigation.getParent()?.navigate("Announcements" as never)}
              />
            ))
          ) : (
            <TeacherEmpty title="No announcements yet" subtitle="Use the announcements tab to publish quick class updates." icon="bullhorn-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "extraction" ? (
        <TeacherExtractionBoard
          classId={classId}
          classItem={classQuery.data}
          registerRefetch={registerTabRefetcher("extraction")}
          onOpenExtraction={(extractionId) =>
            navigation.navigate("TeacherExtractionDetail", { extractionId, classId })
          }
        />
      ) : null}

      {activeTab === "discussion" ? (
        <TeacherDiscussionBoard
          classId={classId}
          registerRefetch={registerTabRefetcher("discussion")}
        />
      ) : null}

      {activeTab === "classRecord" ? (
        <TeacherClassRecordBoard
          classId={classId}
          registerRefetch={registerTabRefetcher("classRecord")}
        />
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
              const studentId = entry.student?.id || entry.studentId || entry.userId;
              return (
                <TeacherRow
                  key={entry.id}
                  title={name}
                  subtitle={entry.student?.email || "No email available"}
                  onPress={
                    studentId
                      ? () =>
                          navigation.navigate("TeacherClassStudentOverview", {
                            classId,
                            studentId,
                          })
                      : undefined
                  }
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

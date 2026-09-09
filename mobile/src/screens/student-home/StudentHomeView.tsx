import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { LessonCard, SubjectCard } from "../../data/types";
import type { Assessment } from "../../types/assessment";
import { studentDarkTheme as theme } from "../../theme/studentDark";
import {
  StudentFlatSection,
  StudentInlineNotice,
  StudentListRow,
  StudentScreen,
} from "../../components/student/StudentWorkspacePrimitives";

type ScheduleItem = {
  id: string;
  classId: string;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  room?: string;
};

type PendingAssessment = {
  assessment: Assessment;
  subject: SubjectCard;
};

type LearningItem = {
  lesson: LessonCard;
  subject: SubjectCard;
};

type TimelineItem = {
  id: string;
  title: string;
  subtitle: string;
};

type StudentHomeNavigation = {
  navigate(...args: any[]): void;
};

function formatDueDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatClock(value: string) {
  const [rawHours = "0", rawMinutes = "0"] = value.split(":");
  const hours = Number.parseInt(rawHours, 10);
  const minutes = Number.parseInt(rawMinutes, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function SectionAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}
    >
      <Text style={{ color: theme.redText, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export function StudentHomeView({
  navigation,
  bridges,
  firstName,
  initials,
  unreadCount,
  profileReadiness,
  pendingAssessments,
  pendingAssessmentStatusCount,
  hasPendingAssessmentSync,
  todaySchedule,
  continueLearning,
  recentLessons,
  latestUpdate,
  refreshing,
  onRefresh,
  errorMessage,
}: {
  navigation: StudentHomeNavigation;
  bridges: ReactNode;
  firstName: string;
  initials: string;
  unreadCount: number;
  profileReadiness: number;
  pendingAssessments: PendingAssessment[];
  pendingAssessmentStatusCount: number;
  hasPendingAssessmentSync: boolean;
  todaySchedule: ScheduleItem[];
  continueLearning: LearningItem[];
  recentLessons: Array<LessonCard & { subject: SubjectCard }>;
  latestUpdate?: TimelineItem;
  refreshing: boolean;
  onRefresh: () => void;
  errorMessage?: string;
}) {
  const nextAssessment = pendingAssessments[0];
  const nextLesson = continueLearning[0] ??
    (recentLessons[0]
      ? { lesson: recentLessons[0], subject: recentLessons[0].subject }
      : undefined);
  const nextClass = todaySchedule[0];

  return (
    <StudentScreen
      title="Student Home"
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => navigation.navigate("Notifications")}
            style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" }}
          >
            <MaterialCommunityIcons name="bell-outline" size={19} color={theme.text} />
            {unreadCount > 0 ? (
              <View style={{ position: "absolute", top: 5, right: 5, minWidth: 16, height: 16, borderRadius: 999, backgroundColor: theme.redText, paddingHorizontal: 3, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "900" }}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => navigation.navigate("Profile")}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.redText, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "900" }}>{initials}</Text>
          </Pressable>
        </View>
      }
    >
      {bridges}

      <View style={{ paddingHorizontal: 16, paddingTop: 15, paddingBottom: 10, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <Text style={{ color: theme.redText, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" }}>Your school day</Text>
        <Text style={{ marginTop: 4, color: theme.text, fontSize: 21, fontWeight: "900" }}>Good day, {firstName}</Text>
        <Text style={{ marginTop: 4, color: theme.muted, fontSize: 12, lineHeight: 17 }}>
          {pendingAssessments.length > 0
            ? `${pendingAssessments.length} ${pendingAssessments.length === 1 ? "task needs" : "tasks need"} your attention.`
            : hasPendingAssessmentSync
              ? `Checking ${pendingAssessmentStatusCount} assessment status${pendingAssessmentStatusCount === 1 ? "" : "es"}.`
              : "You are caught up. Pick up where you left off."}
        </Text>
      </View>

      {errorMessage ? (
        <StudentInlineNotice title="Some home data could not load" description={errorMessage} tone="amber" />
      ) : null}

      <StudentFlatSection title="Next for you" subtitle="The most useful next step based on due work and class progress.">
        {nextAssessment ? (
          <StudentListRow
            title={nextAssessment.assessment.title}
            subtitle={`${nextAssessment.subject.name} · Due ${formatDueDate(nextAssessment.assessment.dueDate)}`}
            icon="clipboard-text-outline"
            status="Open task"
            tone="amber"
            onPress={() => navigation.navigate("AssessmentDetail", {
              assessmentId: nextAssessment.assessment.id,
              classId: nextAssessment.assessment.classId,
              source: "home",
            })}
          />
        ) : nextLesson ? (
          <StudentListRow
            title={nextLesson.lesson.title}
            subtitle={`${nextLesson.subject.name} · ${nextLesson.lesson.duration}`}
            icon="book-open-page-variant-outline"
            status="Continue"
            onPress={() => navigation.navigate("LessonDetail", {
              lessonId: nextLesson.lesson.id,
              classId: nextLesson.subject.id,
              source: "home",
            })}
          />
        ) : nextClass ? (
          <StudentListRow
            title={nextClass.subjectName}
            subtitle={`${formatClock(nextClass.startTime)} · ${nextClass.teacherName}`}
            icon="google-classroom"
            status="Open class"
            onPress={() => navigation.navigate("ClassDetail", { classId: nextClass.classId, source: "home" })}
          />
        ) : (
          <StudentListRow title="Nothing urgent right now" subtitle="Your next published activity will appear here." icon="check-circle-outline" tone="green" />
        )}
      </StudentFlatSection>

      <StudentFlatSection
        title="Today"
        subtitle={todaySchedule.length > 0 ? `${todaySchedule.length} class ${todaySchedule.length === 1 ? "block" : "blocks"}` : "No scheduled classes today"}
        action={<SectionAction label="View all classes" onPress={() => navigation.navigate("Classes")} />}
      >
        {todaySchedule.length > 0 ? todaySchedule.map((entry) => (
          <StudentListRow
            key={entry.id}
            title={entry.subjectName}
            subtitle={`${formatClock(entry.startTime)} · ${entry.teacherName}${entry.room ? ` · Room ${entry.room}` : ""}`}
            icon="clock-outline"
            status="Today"
            tone="blue"
            onPress={() => navigation.navigate("ClassDetail", { classId: entry.classId, source: "home" })}
          />
        )) : (
          <StudentListRow title="No scheduled classes" subtitle="Use the time to review a lesson or check due work." icon="calendar-blank-outline" />
        )}
      </StudentFlatSection>

      <StudentFlatSection title="Continue learning" subtitle="Resume the next available lesson.">
        {nextLesson ? (
          <StudentListRow
            title={nextLesson.lesson.title}
            subtitle={`${nextLesson.subject.name} · ${nextLesson.lesson.duration}`}
            icon="play-circle-outline"
            status="Resume"
            onPress={() => navigation.navigate("LessonDetail", {
              lessonId: nextLesson.lesson.id,
              classId: nextLesson.subject.id,
              source: "home",
            })}
          />
        ) : (
          <StudentListRow title="No lessons available yet" subtitle="Published lessons from your classes will appear here." icon="book-open-outline" />
        )}
      </StudentFlatSection>

      <StudentFlatSection
        title="Due soon"
        subtitle={hasPendingAssessmentSync && pendingAssessments.length === 0
          ? `Checking ${pendingAssessmentStatusCount} assessment status${pendingAssessmentStatusCount === 1 ? "" : "es"}`
          : `${pendingAssessments.length} ${pendingAssessments.length === 1 ? "task" : "tasks"} still need attention`}
        action={<SectionAction label="View assessments" onPress={() => navigation.navigate("Assessments")} />}
      >
        {pendingAssessments.length > 0 ? pendingAssessments.map(({ assessment, subject }) => (
          <StudentListRow
            key={assessment.id}
            title={assessment.title}
            subtitle={`${subject.name} · ${(assessment.type || "Task").replace(/_/g, " ")} · ${assessment.totalPoints ?? 100} pts`}
            icon="clipboard-text-outline"
            status={formatDueDate(assessment.dueDate)}
            tone="amber"
            onPress={() => navigation.navigate("AssessmentDetail", {
              assessmentId: assessment.id,
              classId: assessment.classId,
              source: "home",
            })}
          />
        )) : hasPendingAssessmentSync ? (
          <StudentListRow title="Checking assessment submissions" subtitle="We are verifying your latest submissions before listing what is still due." icon="sync" tone="blue" />
        ) : (
          <StudentListRow title="You are all caught up" subtitle="No published assessments right now." icon="check-circle-outline" tone="green" />
        )}
      </StudentFlatSection>

      <StudentFlatSection
        title="Latest update"
        subtitle="One useful school or class update, without a crowded activity wall."
        action={<SectionAction label="Open calendar" onPress={() => navigation.navigate("StudentCalendar")} />}
      >
        {latestUpdate ? (
          <StudentListRow title={latestUpdate.title} subtitle={latestUpdate.subtitle} icon="calendar-star" tone="purple" onPress={() => navigation.navigate("StudentCalendar")} />
        ) : (
          <StudentListRow title="No new updates" subtitle="School events and due dates will appear here." icon="bell-check-outline" />
        )}
      </StudentFlatSection>

      {profileReadiness < 100 ? (
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Profile")}>
          <StudentInlineNotice
            title="Complete your learner profile"
            description="Add your phone, address, and guardian details so school records stay accurate."
            icon="account-edit-outline"
            tone="purple"
          />
        </Pressable>
      ) : null}

      <View style={{ height: 24 }} />
    </StudentScreen>
  );
}

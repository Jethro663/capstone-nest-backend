import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LessonCard, SubjectCard } from "../../data/types";
import type { Assessment } from "../../types/assessment";
import { studentDarkTheme as theme } from "../../theme/studentDark";
import {
  StudentInlineNotice,
  StudentScreen,
} from "../../components/student/StudentWorkspacePrimitives";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

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

function SectionHeading({
  title,
  eyebrow,
  actionLabel,
  onAction,
}: {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.headingCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <MaterialCommunityIcons name="arrow-right" size={15} color={theme.redText} />
        </Pressable>
      ) : null}
    </View>
  );
}

function MoveTile({
  icon,
  label,
  title,
  subtitle,
  onPress,
  tone = "blue",
}: {
  icon: IconName;
  label: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  tone?: "blue" | "amber" | "green";
}) {
  const palette = tone === "amber"
    ? { surface: theme.amberSoft, icon: theme.amber }
    : tone === "green"
      ? { surface: theme.greenSoft, icon: theme.green }
      : { surface: theme.blueSoft, icon: theme.blue };

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.moveTile, pressed && onPress ? styles.pressed : null]}
    >
      <View style={[styles.moveIcon, { backgroundColor: palette.surface }]}>
        <MaterialCommunityIcons name={icon} size={21} color={palette.icon} />
      </View>
      <View style={styles.moveCopy}>
        <Text style={styles.moveLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.moveTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.moveSubtitle}>{subtitle}</Text>
      </View>
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={21} color={theme.dim} /> : null}
    </Pressable>
  );
}

export function StudentHomeView({
  navigation,
  bridges,
  firstName,
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
  const secondaryAssessment = nextAssessment ? pendingAssessments[1] : pendingAssessments[0];
  const secondaryLesson = nextAssessment
    ? nextLesson
    : [
        ...continueLearning,
        ...recentLessons.map((lesson) => ({ lesson, subject: lesson.subject })),
      ].find((item) => item.lesson.id !== nextLesson?.lesson.id);

  const priorityTitle = nextAssessment?.assessment.title ??
    nextLesson?.lesson.title ??
    nextClass?.subjectName ??
    "You are ready for the day";
  const priorityContext = nextAssessment
    ? `${nextAssessment.subject.name} · Due ${formatDueDate(nextAssessment.assessment.dueDate)}`
    : nextLesson
      ? `${nextLesson.subject.name} · ${nextLesson.lesson.duration}`
      : nextClass
        ? `${formatClock(nextClass.startTime)} · ${nextClass.teacherName}`
        : "Nothing urgent is waiting for you.";
  const priorityLabel = nextAssessment
    ? "Open assessment"
    : nextLesson
      ? "Resume lesson"
      : nextClass
        ? "Open class"
        : "See my classes";
  const openPriority = () => {
    if (nextAssessment) {
      navigation.navigate("AssessmentDetail", {
        assessmentId: nextAssessment.assessment.id,
        classId: nextAssessment.assessment.classId,
        source: "home",
      });
      return;
    }
    if (nextLesson) {
      navigation.navigate("LessonDetail", {
        lessonId: nextLesson.lesson.id,
        classId: nextLesson.subject.id,
        source: "home",
      });
      return;
    }
    if (nextClass) {
      navigation.navigate("ClassDetail", { classId: nextClass.classId, source: "home" });
      return;
    }
    navigation.navigate("Classes");
  };

  return (
    <StudentScreen
      title="Home"
      refreshing={refreshing}
      onRefresh={onRefresh}
      showRefreshAction={false}
      rightAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          onPress={() => navigation.navigate("Notifications")}
          style={styles.notificationButton}
        >
          <MaterialCommunityIcons name="bell-outline" size={20} color={theme.text} />
          {unreadCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      }
    >
      {bridges}

      <View style={styles.welcome}>
        <Text style={styles.eyebrow}>Your school day</Text>
        <Text style={styles.welcomeTitle}>Hi, {firstName}!</Text>
        <Text style={styles.welcomeSubtitle}>
          {pendingAssessments.length > 0
            ? `${pendingAssessments.length} ${pendingAssessments.length === 1 ? "task needs" : "tasks need"} your attention today.`
            : hasPendingAssessmentSync
              ? `Checking ${pendingAssessmentStatusCount} assessment status${pendingAssessmentStatusCount === 1 ? "" : "es"}.`
              : "You are caught up. Choose a lesson when you are ready."}
        </Text>
      </View>

      {errorMessage ? (
        <StudentInlineNotice title="Some home data could not load" description={errorMessage} tone="amber" />
      ) : null}

      <View style={styles.section}>
        <SectionHeading eyebrow="Start here" title="Your next move" />
        <View testID="student-home-priority-surface" style={styles.priorityCard}>
          <Pressable
            accessibilityRole="button"
            onPress={openPriority}
            style={({ pressed }) => [styles.priorityPressTarget, pressed ? styles.priorityPressed : null]}
          >
            <View style={styles.priorityRail}>
              <View style={styles.priorityIcon}>
                <MaterialCommunityIcons
                  name={nextAssessment ? "clipboard-text-outline" : nextLesson ? "book-open-page-variant-outline" : nextClass ? "google-classroom" : "check-circle-outline"}
                  size={23}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.priorityKicker}>
                {nextAssessment ? "Needs attention" : nextLesson ? "Pick up here" : nextClass ? "Coming up" : "All clear"}
              </Text>
            </View>

            <View style={styles.priorityBody}>
              <Text style={styles.priorityTitle}>{priorityTitle}</Text>
              <Text style={styles.priorityContext}>{priorityContext}</Text>
              <View style={styles.priorityAction}>
                <Text style={styles.priorityActionText}>{priorityLabel}</Text>
                <MaterialCommunityIcons name="arrow-right" size={17} color={theme.redText} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      <View testID="student-home-section-divider" style={styles.sectionDivider} />
      <View style={styles.section}>
        <SectionHeading
          eyebrow="Today"
          title="Your day"
          actionLabel="Full calendar"
          onAction={() => navigation.navigate("StudentCalendar")}
        />
        <View style={styles.dayCard}>
          {todaySchedule.length > 0 ? todaySchedule.map((entry, index) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate("ClassDetail", { classId: entry.classId, source: "home" })}
              style={({ pressed }) => [
                styles.scheduleRow,
                index < todaySchedule.length - 1 ? styles.scheduleDivider : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{formatClock(entry.startTime)}</Text>
                <View style={styles.timelineDot} />
                {index < todaySchedule.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.scheduleCopy}>
                <Text style={styles.scheduleTitle}>{entry.subjectName}</Text>
                <Text style={styles.scheduleMeta}>
                  {entry.teacherName}{entry.room ? ` · Room ${entry.room}` : ""}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={21} color={theme.dim} />
            </Pressable>
          )) : (
            <View style={styles.emptyDay}>
              <View style={styles.emptyDayIcon}>
                <MaterialCommunityIcons name="weather-sunny" size={24} color={theme.amber} />
              </View>
              <View style={styles.scheduleCopy}>
                <Text style={styles.scheduleTitle}>No classes on your schedule</Text>
                <Text style={styles.scheduleMeta}>A good time to review or finish a task.</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View testID="student-home-section-divider" style={styles.sectionDivider} />
      <View style={styles.section}>
        <SectionHeading eyebrow="Small steps" title="Keep moving" />
        <View style={styles.moveGrid}>
          {secondaryLesson ? (
            <MoveTile
              icon="play-circle-outline"
              label="Learning"
              title={secondaryLesson.lesson.title}
              subtitle={`${secondaryLesson.subject.name} · ${secondaryLesson.lesson.duration}`}
              onPress={() => navigation.navigate("LessonDetail", {
                lessonId: secondaryLesson.lesson.id,
                classId: secondaryLesson.subject.id,
                source: "home",
              })}
            />
          ) : (
            <MoveTile
              icon="book-check-outline"
              label="Learning"
              title="You are up to date"
              subtitle="New published lessons will appear here."
              tone="green"
            />
          )}
          {secondaryAssessment ? (
            <MoveTile
              icon="calendar-clock-outline"
              label="Another task"
              title={secondaryAssessment.assessment.title}
              subtitle={`${secondaryAssessment.subject.name} · Due ${formatDueDate(secondaryAssessment.assessment.dueDate)}`}
              tone="amber"
              onPress={() => navigation.navigate("AssessmentDetail", {
                assessmentId: secondaryAssessment.assessment.id,
                classId: secondaryAssessment.assessment.classId,
                source: "home",
              })}
            />
          ) : (
            <MoveTile
              icon={hasPendingAssessmentSync ? "sync" : "check-decagram-outline"}
              label="Tasks"
              title={hasPendingAssessmentSync ? "Checking your work" : "Nothing else is due"}
              subtitle={hasPendingAssessmentSync ? "Your latest submissions are syncing." : "Nice work keeping up."}
              tone={hasPendingAssessmentSync ? "blue" : "green"}
              onPress={() => navigation.navigate("Assessments")}
            />
          )}
        </View>
      </View>

      <View testID="student-home-section-divider" style={styles.sectionDivider} />
      <View style={styles.section}>
        <SectionHeading
          eyebrow="From school"
          title="Latest update"
          actionLabel="See calendar"
          onAction={() => navigation.navigate("StudentCalendar")}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("StudentCalendar")}
          style={({ pressed }) => [styles.updateCard, pressed ? styles.pressed : null]}
        >
          <View style={styles.updateIcon}>
            <MaterialCommunityIcons name={latestUpdate ? "calendar-star" : "bell-check-outline"} size={22} color={theme.purple} />
          </View>
          <View style={styles.moveCopy}>
            <Text style={styles.updateTitle}>{latestUpdate?.title ?? "No new updates"}</Text>
            <Text style={styles.moveSubtitle}>{latestUpdate?.subtitle ?? "School events and dates will appear here."}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={21} color={theme.dim} />
        </Pressable>
      </View>

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

      <View style={{ height: 28 }} />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 17,
    height: 17,
    borderRadius: 999,
    backgroundColor: theme.redText,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900" },
  welcome: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  eyebrow: {
    color: theme.redText,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  welcomeTitle: { marginTop: 5, color: theme.text, fontSize: 26, lineHeight: 32, fontWeight: "900" },
  welcomeSubtitle: { marginTop: 5, color: theme.subtext, fontSize: 13, lineHeight: 19 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionDivider: { height: 1, marginHorizontal: 16, marginTop: 22, backgroundColor: theme.border },
  sectionHeading: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 9,
  },
  headingCopy: { flex: 1 },
  sectionTitle: { marginTop: 2, color: theme.text, fontSize: 19, lineHeight: 24, fontWeight: "900" },
  sectionAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 8 },
  sectionActionText: { color: theme.redText, fontSize: 11, fontWeight: "900" },
  priorityCard: { overflow: "hidden", borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  priorityPressTarget: { minHeight: 188 },
  priorityPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  priorityRail: { minHeight: 66, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: theme.deepNavy },
  priorityIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.redText },
  priorityKicker: { flex: 1, color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  priorityBody: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 14 },
  priorityTitle: { color: theme.text, fontSize: 20, lineHeight: 26, fontWeight: "900" },
  priorityContext: { marginTop: 5, color: theme.subtext, fontSize: 12, lineHeight: 18 },
  priorityAction: { alignSelf: "flex-start", minHeight: 44, marginTop: 13, borderRadius: 12, borderWidth: 1, borderColor: theme.redLine, backgroundColor: theme.redSoft, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  priorityActionText: { color: theme.redText, fontSize: 12, fontWeight: "900" },
  dayCard: { overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  scheduleRow: { minHeight: 76, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  scheduleDivider: { borderBottomWidth: 1, borderBottomColor: theme.border },
  timeColumn: { width: 75, alignSelf: "stretch", justifyContent: "center" },
  timeText: { color: theme.redText, fontSize: 11, fontWeight: "900" },
  timelineDot: { position: "absolute", right: 9, top: 33, width: 9, height: 9, borderRadius: 999, backgroundColor: theme.redText },
  timelineLine: { position: "absolute", right: 13, top: 42, bottom: -35, width: 1, backgroundColor: theme.redLine },
  scheduleCopy: { flex: 1, minWidth: 0 },
  scheduleTitle: { color: theme.text, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  scheduleMeta: { marginTop: 4, color: theme.muted, fontSize: 11, lineHeight: 16 },
  emptyDay: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
  emptyDayIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: theme.amberSoft },
  moveGrid: { gap: 9 },
  moveTile: { minHeight: 88, borderRadius: 17, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  moveIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  moveCopy: { flex: 1, minWidth: 0 },
  moveLabel: { color: theme.redText, fontSize: 9, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  moveTitle: { marginTop: 3, color: theme.text, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  moveSubtitle: { marginTop: 3, color: theme.muted, fontSize: 11, lineHeight: 16 },
  updateCard: { minHeight: 82, borderRadius: 17, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  updateIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.purpleSoft },
  updateTitle: { color: theme.text, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});

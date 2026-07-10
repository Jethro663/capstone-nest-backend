import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EmptyState, Refreshable, ScreenScroll } from "../components/ui/primitives";
import {
  queryKeys,
  useAnnouncements,
  useAssessments,
  useClassDetail,
  useClassModules,
  useLessonCompletions,
} from "../api/hooks";
import { peekAppError } from "../api/http";
import type { ClassDetailInitialTab, RootStackParamList } from "../navigation/types";
import { assessmentsApi } from "../api/services/assessments";
import { StudentDiscussionBoard } from "../components/student/StudentDiscussionBoard";
import { useAuth } from "../providers/AuthProvider";
import type { Assessment, AssessmentAttempt } from "../types/assessment";
import type { ClassItem } from "../types/class";
import type { ClassModule } from "../types/module";
import { studentDarkTheme } from "../theme/studentDark";
import { refetchWithConcurrency } from "../utils/refetchWithConcurrency";

type Props = NativeStackScreenProps<RootStackParamList, "ClassDetail">;
type DetailNavigation = NativeStackNavigationProp<RootStackParamList>;
type DetailTab =
  | "modules"
  | "assignments"
  | "announcements"
  | "discussion"
  | "classmates"
  | "grades"
  | "calendar";

type EventRow = {
  id: string;
  title: string;
  subtitle: string;
  tone: "blue" | "amber";
  sortValue: number;
};

type CalendarCell = {
  key: string;
  label: string;
  inMonth: boolean;
  isToday: boolean;
  isClassDay: boolean;
  isDueDay: boolean;
};

type GradeCategorySummary = {
  id: string;
  label: string;
  scoreText: string;
  tone: "high" | "mid" | "pending";
};

type BreakdownSummary = {
  id: string;
  label: string;
  value: string;
};

type ClassScheduleItem = NonNullable<ClassItem["schedules"]>[number];

const theme = studentDarkTheme;

const primaryTabs: DetailTab[] = ["modules", "assignments", "announcements", "discussion"];
const overflowTabs: DetailTab[] = ["classmates", "grades", "calendar"];

const tabLabels: Record<DetailTab, string> = {
  modules: "Modules",
  assignments: "Assignments",
  announcements: "Announcements",
  discussion: "Discussion",
  classmates: "Classmates",
  grades: "Grades",
  calendar: "Calendar",
};

const gradeCategoryOrder: Array<{ id: string; label: string; types: Assessment["type"][] }> = [
  { id: "written", label: "Written Works", types: ["written_work"] },
  { id: "performance", label: "Performance Tasks", types: ["performance_task"] },
  { id: "quarterly", label: "Quarterly Assessment", types: ["quarterly_assessment"] },
  { id: "assignments", label: "Assignments", types: ["assignment"] },
  { id: "quizzes", label: "Quizzes", types: ["quiz"] },
  { id: "exams", label: "Exams", types: ["exam"] },
];

function formatDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "TBA";
  const [hoursValue = "0", minutesValue = "00"] = value.split(":");
  const hours = Number.parseInt(hoursValue, 10);
  if (!Number.isFinite(hours)) return value;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 || 12;
  return `${normalized}:${minutesValue} ${meridiem}`;
}

function formatScheduleLabel(schedule?: ClassScheduleItem) {
  if (!schedule) return "Schedule TBA";
  const dayLabel = schedule.days.join("/");
  return `${dayLabel} ${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}`;
}

function formatTeacher(classItem?: ClassItem) {
  const teacher = classItem?.teacher;
  const fullName = [teacher?.firstName, teacher?.lastName].filter(Boolean).join(" ").trim();
  return fullName || "Teacher not assigned";
}

function buildBadgeText(classItem?: ClassItem) {
  const fromCode = (classItem?.subjectCode || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  if (fromCode) return fromCode;
  return (classItem?.subjectName || "CL")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildInitials(firstName?: string, lastName?: string) {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((value) => value?.trim()[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "ST";
}

function isNotFoundError(error: unknown) {
  return peekAppError(error).status === 404;
}

function getAttemptErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Attempt history unavailable";
}

function getLatestSubmittedAttempt(attempts: AssessmentAttempt[]) {
  return [...attempts]
    .filter((attempt) => attempt.isSubmitted || Boolean(attempt.submittedAt))
    .sort((left, right) => {
      const leftTime = new Date(left.submittedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.submittedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    })[0];
}

function sortAttemptsByNewest(attempts: AssessmentAttempt[]) {
  return [...attempts].sort((left, right) => {
    const leftTime = new Date(left.submittedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.submittedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function getModuleLessons(moduleEntry: ClassModule) {
  if (moduleEntry.isLocked) {
    return [];
  }

  return moduleEntry.sections
    .slice()
    .sort((left, right) => left.order - right.order)
    .flatMap((section) =>
      section.items
        .slice()
        .sort((left, right) => left.order - right.order)
        .flatMap((item) => {
          if (item.itemType !== "lesson") return [];
          if (!("lessonId" in item) || typeof item.lessonId !== "string") return [];
          if ("lesson" in item && item.lesson && typeof item.lesson === "object" && "isDraft" in item.lesson && item.lesson.isDraft) {
            return [];
          }

          return [
            {
              id: item.lessonId,
              title:
                "lesson" in item &&
                item.lesson &&
                typeof item.lesson === "object" &&
                "title" in item.lesson &&
                typeof item.lesson.title === "string"
                  ? item.lesson.title
                  : "Lesson",
            },
          ];
        }),
    );
}

function getVisibleLessons(modules: ClassModule[]) {
  return modules.flatMap((moduleEntry) => getModuleLessons(moduleEntry));
}

function summarizeModule(moduleEntry: ClassModule, completedIds: Set<string>) {
  const lessons = getModuleLessons(moduleEntry);
  const assessmentCount = moduleEntry.sections.reduce((total, section) => {
    return total + section.items.filter((item) => item.itemType === "assessment").length;
  }, 0);

  return {
    lessons,
    lessonCount: lessons.length,
    completedCount: lessons.filter((lesson) => completedIds.has(lesson.id)).length,
    assessmentCount,
  };
}

function buildEventRows(classItem: ClassItem | undefined, assessments: Assessment[]) {
  const scheduleRows: EventRow[] = (classItem?.schedules ?? []).map((schedule) => ({
    id: `schedule-${schedule.id}`,
    title: `${classItem?.subjectName || "Class"} - Class Session`,
    subtitle: `${schedule.days.join("/")} · ${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}${classItem?.room ? ` · ${classItem.room}` : ""}`,
    tone: "blue",
    sortValue: new Date().getTime(),
  }));

  const assessmentRows: EventRow[] = assessments
    .filter((assessment) => assessment.dueDate)
    .map((assessment) => ({
      id: `assessment-${assessment.id}`,
      title: assessment.title,
      subtitle: `Due ${formatDateTime(assessment.dueDate)}`,
      tone: "amber",
      sortValue: new Date(assessment.dueDate || 0).getTime(),
    }));

  return [...assessmentRows, ...scheduleRows].sort((left, right) => left.sortValue - right.sortValue);
}

function normalizeDayToken(day: string): number | null {
  const normalized = day.trim().slice(0, 3).toLowerCase();
  switch (normalized) {
    case "sun":
      return 0;
    case "mon":
      return 1;
    case "tue":
      return 2;
    case "wed":
      return 3;
    case "thu":
      return 4;
    case "fri":
      return 5;
    case "sat":
      return 6;
    default:
      return null;
  }
}

function buildCalendarCells(monthDate: Date, classItem: ClassItem | undefined, assessments: Assessment[]) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const calendarCells: CalendarCell[] = [];
  const scheduleDays = new Set<number>();
  for (const schedule of classItem?.schedules ?? []) {
    for (const day of schedule.days) {
      const normalizedDay = normalizeDayToken(day);
      if (normalizedDay !== null) {
        scheduleDays.add(normalizedDay);
      }
    }
  }
  const dueDates = new Set(
    assessments
      .filter((assessment) => assessment.dueDate)
      .map((assessment) => {
        const dueDate = new Date(assessment.dueDate || 0);
        return Number.isNaN(dueDate.getTime()) ? "" : dueDate.toDateString();
      })
      .filter(Boolean),
  );
  const today = new Date();

  for (let index = 0; index < startDay; index += 1) {
    calendarCells.push({
      key: `blank-start-${index}`,
      label: "",
      inMonth: false,
      isToday: false,
      isClassDay: false,
      isDueDay: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const isToday =
      cellDate.getFullYear() === today.getFullYear() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getDate() === today.getDate();
    const isDueDay = dueDates.has(cellDate.toDateString());
    calendarCells.push({
      key: `day-${day}`,
      label: String(day),
      inMonth: true,
      isToday,
      isClassDay: scheduleDays.has(cellDate.getDay()) || isDueDay,
      isDueDay,
    });
  }

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push({
      key: `blank-end-${calendarCells.length}`,
      label: "",
      inMonth: false,
      isToday: false,
      isClassDay: false,
      isDueDay: false,
    });
  }

  return calendarCells;
}

function DarkSectionLabel({
  title,
  meta,
  metaColor = theme.red,
}: {
  title: string;
  meta?: string;
  metaColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 6,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: theme.muted }}>
        {title}
      </Text>
      {meta ? <Text style={{ fontSize: 10, fontWeight: "600", color: metaColor }}>{meta}</Text> : null}
    </View>
  );
}

function ToneTag({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "green" | "red" | "amber" | "purple";
}) {
  const toneStyles = {
    blue: { backgroundColor: theme.blueSoft, color: theme.blue },
    green: { backgroundColor: theme.greenSoft, color: theme.green },
    red: { backgroundColor: theme.redSoft, color: theme.red },
    amber: { backgroundColor: theme.amberSoft, color: theme.amber },
    purple: { backgroundColor: theme.purpleSoft, color: theme.purple },
  }[tone];

  return (
    <View style={{ borderRadius: 4, backgroundColor: toneStyles.backgroundColor, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: "500", color: toneStyles.color }}>{label}</Text>
    </View>
  );
}

function DarkEmptyPanel({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 18,
        paddingVertical: 22,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{title}</Text>
      <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: theme.muted }}>{subtitle}</Text>
    </View>
  );
}

export function StudentClassDetailContent({
  classId,
  navigation,
  initialTab,
}: {
  classId: string;
  navigation: Pick<DetailNavigation, "goBack" | "navigate">;
  initialTab?: ClassDetailInitialTab;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab ?? "modules");
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const discussionRefetchRef = useRef<() => Promise<unknown>>(() => Promise.resolve(undefined));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { user } = useAuth();
  const classQuery = useClassDetail(classId);
  const modulesQuery = useClassModules(classId);
  const lessonCompletionsQuery = useLessonCompletions(classId);
  const assessmentsQuery = useAssessments(classId);
  const announcementsQuery = useAnnouncements(classId);

  const classItem = classQuery.data;
  const modules = useMemo(() => [...(modulesQuery.data ?? [])].sort((left, right) => left.order - right.order), [modulesQuery.data]);
  const lessonCompletions = lessonCompletionsQuery.data ?? [];
  const completedLessonIds = useMemo(
    () => new Set(lessonCompletions.filter((entry) => entry.completed).map((entry) => entry.lessonId)),
    [lessonCompletions],
  );
  const visibleLessons = useMemo(() => getVisibleLessons(modules), [modules]);
  const visibleLessonIds = useMemo(() => new Set(visibleLessons.map((lesson) => lesson.id)), [visibleLessons]);
  const completedLessonCount = lessonCompletions.filter((entry) => entry.completed && visibleLessonIds.has(entry.lessonId)).length;
  const lessonProgress = visibleLessons.length > 0 ? Math.round((completedLessonCount / visibleLessons.length) * 100) : 0;
  const assessments = useMemo(() => [...(assessmentsQuery.data ?? [])].filter((entry) => entry.isPublished), [assessmentsQuery.data]);
  const attemptQueries = useQueries({
    queries: assessments.map((assessment) => ({
      queryKey: queryKeys.assessmentAttempts(assessment.id),
      queryFn: () => assessmentsApi.getStudentAttempts(assessment.id),
      enabled: assessments.length > 0,
    })),
  });
  const announcements = useMemo(
    () =>
      [...(announcementsQuery.data ?? [])].sort((left, right) => {
        if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
        return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
      }),
    [announcementsQuery.data],
  );

  const attemptMap = useMemo(() => {
    return Object.fromEntries(
      assessments.map((assessment, index) => [assessment.id, attemptQueries[index]?.data ?? [] as AssessmentAttempt[]]),
    );
  }, [assessments, attemptQueries]);

  const classmates = classItem?.enrollments ?? [];
  const memberCount = classmates.length + (classItem?.teacher ? 1 : 0);
  const primaryError =
    classQuery.error ||
    modulesQuery.error ||
    lessonCompletionsQuery.error ||
    assessmentsQuery.error ||
    announcementsQuery.error ||
    attemptQueries.find((query) => query.error)?.error;
  const refreshing =
    classQuery.isRefetching ||
    modulesQuery.isRefetching ||
    lessonCompletionsQuery.isRefetching ||
    assessmentsQuery.isRefetching ||
    announcementsQuery.isRefetching ||
    attemptQueries.some((query) => query.isRefetching);
  const classNotFound = !classItem && isNotFoundError(classQuery.error);

  const assignmentCards = useMemo(() => {
    return assessments.map((assessment, index) => {
      const attempts = attemptQueries[index]?.data ?? [];
      const latestSubmittedAttempt = getLatestSubmittedAttempt(attempts);
      const newestAttempt = sortAttemptsByNewest(attempts)[0];
      const hasScore = typeof latestSubmittedAttempt?.score === "number";
      const status: "pending" | "submitted" | "graded" =
        hasScore ? "graded" : latestSubmittedAttempt ? "submitted" : newestAttempt ? "submitted" : "pending";
      const dueLabel =
        status === "graded"
          ? `Scored ${latestSubmittedAttempt?.score}/${latestSubmittedAttempt?.totalPoints ?? assessment.totalPoints ?? 0}`
          : status === "submitted"
            ? `Submitted ${formatShortDate(latestSubmittedAttempt?.submittedAt || newestAttempt?.createdAt)}`
            : `Due ${formatDate(assessment.dueDate)}`;

      return {
        id: assessment.id,
        title: assessment.title,
        meta: `${assessment.type.replaceAll("_", " ")} · ${formatTeacher(classItem)}`,
        dueLabel,
        pointsLabel: `${assessment.totalPoints ?? 0} pts`,
        status,
      };
    });
  }, [assessments, attemptQueries, classItem]);

  const pendingAssignments = assignmentCards.filter((card) => card.status === "pending").length;

  const gradeSummaryRows = useMemo(() => {
    const rows: GradeCategorySummary[] = [];

    for (const category of gradeCategoryOrder) {
      const categoryAssessments = assessments.filter((assessment) => category.types.includes(assessment.type));
      if (categoryAssessments.length === 0) {
        continue;
      }

      const scoredPercents = categoryAssessments
        .map((assessment) => {
          const attempts = attemptMap[assessment.id] ?? [];
          const latestSubmittedAttempt = getLatestSubmittedAttempt(attempts);
          const possiblePoints = latestSubmittedAttempt?.totalPoints ?? assessment.totalPoints ?? 0;
          if (typeof latestSubmittedAttempt?.score !== "number" || possiblePoints <= 0) {
            return null;
          }

          return (latestSubmittedAttempt.score / possiblePoints) * 100;
        })
        .filter((value): value is number => value !== null);

      if (scoredPercents.length === 0) {
        rows.push({ id: category.id, label: category.label, scoreText: "—", tone: "pending" });
        continue;
      }

      const average = scoredPercents.reduce((sum, value) => sum + value, 0) / scoredPercents.length;
      rows.push({
        id: category.id,
        label: category.label,
        scoreText: average % 1 === 0 ? `${average.toFixed(0)}` : average.toFixed(1),
        tone: average >= 85 ? "high" : "mid",
      });
    }

    const allScoredPercents = assessments
      .map((assessment) => {
        const attempts = attemptMap[assessment.id] ?? [];
        const latestSubmittedAttempt = getLatestSubmittedAttempt(attempts);
        const possiblePoints = latestSubmittedAttempt?.totalPoints ?? assessment.totalPoints ?? 0;
        if (typeof latestSubmittedAttempt?.score !== "number" || possiblePoints <= 0) {
          return null;
        }

        return (latestSubmittedAttempt.score / possiblePoints) * 100;
      })
      .filter((value): value is number => value !== null);

    rows.push({
      id: "running-average",
      label: "Running Average",
      scoreText:
        allScoredPercents.length > 0
          ? (allScoredPercents.reduce((sum, value) => sum + value, 0) / allScoredPercents.length).toFixed(1)
          : "—",
      tone:
        allScoredPercents.length === 0
          ? "pending"
          : allScoredPercents.reduce((sum, value) => sum + value, 0) / allScoredPercents.length >= 85
            ? "high"
            : "mid",
    });

    return rows;
  }, [assessments, attemptMap]);

  const detailedGradeRows = useMemo(
    () =>
      assessments.map((assessment, index) => {
        const attemptQuery = attemptQueries[index];
        const attempts = attemptQuery?.data ?? [];
        const latestSubmittedAttempt = getLatestSubmittedAttempt(attempts);
        const possiblePoints = latestSubmittedAttempt?.totalPoints ?? assessment.totalPoints ?? 0;
        const hasScore = typeof latestSubmittedAttempt?.score === "number";
        const percent =
          hasScore && possiblePoints > 0 ? Math.round(((latestSubmittedAttempt?.score as number) / possiblePoints) * 100) : null;

        const newestAttempt = sortAttemptsByNewest(attempts)[0];
        const hasOnlyInProgressAttempts = Boolean(newestAttempt) && !latestSubmittedAttempt;
        const isAttemptStateUnresolved = typeof attemptQuery?.data === "undefined" || Boolean(attemptQuery?.isRefetching);
        const hasAttemptError = Boolean(attemptQuery?.error);

        let scoreText = "Pending";
        let metaText = `${assessment.totalPoints ?? 0} pts · ${formatDate(assessment.dueDate)}`;
        let pending = true;

        if (hasScore) {
          scoreText = `${latestSubmittedAttempt?.score}/${possiblePoints}`;
          metaText = `${percent}% · ${formatDate(latestSubmittedAttempt?.submittedAt || assessment.dueDate)}`;
          pending = false;
        } else if (hasAttemptError && !hasOnlyInProgressAttempts) {
          scoreText = getAttemptErrorMessage(attemptQuery?.error);
        } else if (isAttemptStateUnresolved && !hasOnlyInProgressAttempts) {
          scoreText = "Checking submissions";
          metaText = "Latest submitted score is still loading";
        }

        return {
          id: assessment.id,
          title: assessment.title,
          scoreText,
          metaText,
          pending,
        };
      }),
    [assessments, attemptQueries],
  );

  const breakdownRows = useMemo(() => {
    const total = assessments.length || 1;
    return gradeCategoryOrder
      .map((category) => {
        const count = assessments.filter((assessment) => category.types.includes(assessment.type)).length;
        if (count === 0) return null;
        return {
          id: category.id,
          label: category.label,
          value: `${Math.round((count / total) * 100)}%`,
        } satisfies BreakdownSummary;
      })
      .filter((value): value is BreakdownSummary => value !== null);
  }, [assessments]);

  const eventRows = useMemo(() => buildEventRows(classItem, assessments), [classItem, assessments]);
  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth, classItem, assessments), [assessments, calendarMonth, classItem]);
  const classBadge = buildBadgeText(classItem);

  useEffect(() => {
    setActiveTab(initialTab ?? "modules");
    setSheetOpen(false);
  }, [classId, initialTab]);

  const registerDiscussionRefetch = useCallback((refetcher: () => Promise<unknown>) => {
    discussionRefetchRef.current = refetcher;
  }, []);

  const handleRefresh = () => {
    void Promise.all([
      classQuery.refetch(),
      modulesQuery.refetch(),
      lessonCompletionsQuery.refetch(),
      assessmentsQuery.refetch(),
      announcementsQuery.refetch(),
      refetchWithConcurrency([
        ...(activeTab === "discussion" ? [discussionRefetchRef.current] : []),
        ...attemptQueries.map((query) => query.refetch),
      ]),
    ]);
  };

  const openOverflowTab = (tab: DetailTab) => {
    setActiveTab(tab);
    setSheetOpen(false);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModuleId((current) => (current === moduleId ? null : moduleId));
  };

  const currentMonthLabel = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const showOverflowActive = overflowTabs.includes(activeTab);

  if (!classItem && classQuery.isLoading) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 48, paddingHorizontal: 20 }}>
          <EmptyState emoji=".." title="Loading class detail" subtitle="Preparing the student class view." />
        </View>
      </ScreenScroll>
    );
  }

  if (classNotFound) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 48, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Class not found" subtitle="This class is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  if (!classItem && primaryError) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <DarkEmptyPanel title="Class data is partially unavailable" subtitle={peekAppError(primaryError).message} />
      </ScreenScroll>
    );
  }

  if (!classItem) {
    return (
      <ScreenScroll backgroundColor={theme.bg}>
        <View style={{ paddingTop: 48, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Class not found" subtitle="This class is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenScroll backgroundColor={theme.bg} refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={{ backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <Pressable
                accessibilityLabel="Go back"
                onPress={() => navigation.goBack()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.active,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color={theme.text} />
              </Pressable>

              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.red,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>{classBadge}</Text>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 10, letterSpacing: 0.5, color: theme.muted }}>
                  {`${classItem.subjectCode || "CLASS"} · ${classItem.section?.name || "Section"}`}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "700", color: theme.text }}>
                  {classItem.subjectName || "Class Detail"}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Open class overflow"
                onPress={() => setSheetOpen(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.active,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={16}
                  color={showOverflowActive ? theme.red : theme.text}
                />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <MaterialCommunityIcons name="clock-outline" size={11} color={theme.muted} />
                <Text style={{ fontSize: 11, color: theme.muted }}>{formatScheduleLabel(classItem.schedules?.[0])}</Text>
              </View>
              <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: theme.dim }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <MaterialCommunityIcons name="office-building-outline" size={11} color={theme.muted} />
                <Text style={{ fontSize: 11, color: theme.muted }}>{classItem.room || "Room TBA"}</Text>
              </View>
              <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: theme.dim }} />
              <Text style={{ fontSize: 11, color: theme.muted }}>{formatTeacher(classItem)}</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <View
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  overflow: "hidden",
                  backgroundColor: theme.active,
                }}
              >
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, lessonProgress))}%`,
                    height: "100%",
                    borderRadius: 2,
                    backgroundColor: theme.green,
                  }}
                />
              </View>
              <Text style={{ fontSize: 10, fontWeight: "600", color: theme.green }}>{lessonProgress}% progress</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "stretch", borderTopWidth: 1, borderTopColor: theme.border }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              style={{ flex: 1 }}
            >
              {primaryTabs.map((tab) => {
                const active = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      setSheetOpen(false);
                      setActiveTab(tab);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderBottomWidth: 2,
                      borderBottomColor: active ? theme.red : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "500", color: active ? theme.red : theme.muted }}>
                      {tabLabels[tab]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              accessibilityLabel="Open more class tabs"
              onPress={() => setSheetOpen(true)}
              style={{
                borderLeftWidth: 1,
                borderLeftColor: theme.border,
                paddingHorizontal: 14,
                alignItems: "center",
                justifyContent: "center",
                borderBottomWidth: 2,
                borderBottomColor: showOverflowActive ? theme.red : "transparent",
              }}
            >
              <Text style={{ fontSize: 15, letterSpacing: 2, color: showOverflowActive ? theme.red : theme.muted }}>···</Text>
            </Pressable>
          </View>
        </View>

        {primaryError ? (
          <DarkEmptyPanel title="Class data is partially unavailable" subtitle={peekAppError(primaryError).message} />
        ) : null}

        {activeTab === "modules" ? (
          <View>
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: "hidden",
                backgroundColor: theme.surface,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>Class Snapshot</Text>
                <Text style={{ fontSize: 11, fontWeight: "600", color: theme.green }}>{lessonProgress}% progress</Text>
              </View>
              <View style={{ height: 2, backgroundColor: theme.active }}>
                <View style={{ width: `${Math.max(0, Math.min(100, lessonProgress))}%`, height: "100%", backgroundColor: theme.green }} />
              </View>
              <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12 }}>
                {[
                  { label: "Modules", value: String(modules.length) },
                  { label: "Lessons", value: String(visibleLessons.length) },
                  { label: "Tasks", value: String(assessments.length) },
                ].map((item, index) => (
                  <View
                    key={item.label}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      borderRightWidth: index === 2 ? 0 : 1,
                      borderRightColor: theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text }}>{item.value}</Text>
                    <Text style={{ marginTop: 2, fontSize: 10, color: theme.muted }}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.muted }}>
                  {completedLessonCount}/{visibleLessons.length} lessons completed
                </Text>
                <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: theme.dim }} />
                <Text style={{ fontSize: 11, color: theme.muted }}>{memberCount} classmates</Text>
              </View>
            </View>

            <DarkSectionLabel title="Modules" meta={String(modules.length)} metaColor={theme.red} />

            {modules.length === 0 ? (
              <DarkEmptyPanel title="No modules yet" subtitle="Your teacher has not published any class modules." />
            ) : (
              modules.map((moduleEntry, index) => {
                const summary = summarizeModule(moduleEntry, completedLessonIds);
                const expanded = expandedModuleId === moduleEntry.id;

                return (
                  <View
                    key={moduleEntry.id}
                    style={{
                      marginHorizontal: 16,
                      marginTop: index === 0 ? 6 : 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      overflow: "hidden",
                      backgroundColor: theme.surface,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 12 }}>
                      <Pressable
                        onPress={() => navigation.navigate("ModuleDetail", { classId, moduleId: moduleEntry.id })}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 11 }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: theme.redSoft,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.red }}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>
                            {moduleEntry.title}
                          </Text>
                          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>
                            {moduleEntry.isLocked
                              ? "Locked module"
                              : `${summary.lessonCount} lessons · ${summary.completedCount} completed`}
                          </Text>
                        </View>
                      </Pressable>

                      <Pressable
                        accessibilityLabel={`Toggle ${moduleEntry.title}`}
                        onPress={() => toggleModule(moduleEntry.id)}
                        style={{ padding: 4 }}
                      >
                        <MaterialCommunityIcons
                          name={expanded ? "chevron-down" : "chevron-right"}
                          size={14}
                          color={theme.dim}
                        />
                      </Pressable>
                    </View>

                    {expanded ? (
                      <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                        {summary.lessons.length === 0 ? (
                          <View style={{ paddingHorizontal: 46, paddingVertical: 14 }}>
                            <Text style={{ fontSize: 12, color: theme.muted }}>This module does not have visible lessons yet.</Text>
                          </View>
                        ) : (
                          summary.lessons.map((lesson, lessonIndex) => {
                            const completed = completedLessonIds.has(lesson.id);
                            return (
                              <Pressable
                                key={lesson.id}
                                onPress={() => navigation.navigate("LessonDetail", { lessonId: lesson.id, classId })}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 10,
                                  paddingLeft: 46,
                                  paddingRight: 14,
                                  paddingVertical: 10,
                                  borderBottomWidth: lessonIndex === summary.lessons.length - 1 ? 0 : 1,
                                  borderBottomColor: theme.border,
                                }}
                              >
                                <View
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: 999,
                                    borderWidth: 1.5,
                                    borderColor: completed ? theme.green : theme.dim,
                                    backgroundColor: completed ? theme.green : "transparent",
                                  }}
                                />
                                <Text style={{ flex: 1, fontSize: 12, color: theme.subtext }}>{lesson.title}</Text>
                                <Text style={{ fontSize: 10, color: completed ? theme.green : theme.muted }}>
                                  {completed ? "Done" : "Open"}
                                </Text>
                              </Pressable>
                            );
                          })
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {activeTab === "assignments" ? (
          <View>
            <DarkSectionLabel title="Assignments" meta={`${pendingAssignments} pending`} metaColor={theme.amber} />

            {assignmentCards.length === 0 ? (
              <DarkEmptyPanel title="No assignments yet" subtitle="Published class assessments will appear here." />
            ) : (
              assignmentCards.map((assessment) => (
                <Pressable
                  key={assessment.id}
                  onPress={() => navigation.navigate("AssessmentDetail", { assessmentId: assessment.id, classId })}
                  style={{
                    marginHorizontal: 16,
                    marginTop: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.amberSoft,
                      }}
                    >
                      <MaterialCommunityIcons name="file-document-outline" size={16} color={theme.amber} />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>{assessment.title}</Text>
                      <Text style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>{assessment.meta}</Text>
                    </View>

                    <ToneTag
                      label={assessment.status === "graded" ? "Graded" : assessment.status === "submitted" ? "Submitted" : "Pending"}
                      tone={assessment.status === "graded" ? "green" : assessment.status === "submitted" ? "blue" : "amber"}
                    />
                  </View>

                  <View
                    style={{
                      marginTop: 10,
                      paddingTop: 9,
                      borderTopWidth: 1,
                      borderTopColor: theme.border,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "500", color: theme.amber }}>{assessment.dueLabel}</Text>
                    <Text style={{ fontSize: 11, color: theme.muted }}>{assessment.pointsLabel}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {activeTab === "announcements" ? (
          <View>
            <DarkSectionLabel title="Announcements" meta={`${announcements.length} new`} metaColor={theme.red} />

            {announcements.length === 0 ? (
              <DarkEmptyPanel title="No announcements yet" subtitle="Your teacher has not posted any class announcements yet." />
            ) : (
              announcements.map((entry) => (
                <View
                  key={entry.id}
                  style={{
                    marginHorizontal: 16,
                    marginTop: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 9 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.red,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>
                        {buildInitials(entry.author?.firstName, entry.author?.lastName)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>
                        {[entry.author?.firstName || "Teacher", entry.author?.lastName || ""].join(" ").trim()}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.muted }}>{formatDateTime(entry.createdAt)}</Text>
                    </View>

                    {entry.isPinned ? <ToneTag label="New" tone="red" /> : null}
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>{entry.title}</Text>
                  <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 19, color: theme.muted }}>{entry.content}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === "discussion" ? (
          <StudentDiscussionBoard classId={classId} registerRefetch={registerDiscussionRefetch} />
        ) : null}

        {activeTab === "classmates" ? (
          <View>
            <DarkSectionLabel title="Classmates" meta={`${memberCount} members`} metaColor={theme.blue} />

            {classItem.teacher ? (
              <View
                style={{
                  marginHorizontal: 16,
                  borderBottomWidth: classmates.length === 0 ? 0 : 1,
                  borderBottomColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.red,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>
                    {buildInitials(classItem.teacher.firstName, classItem.teacher.lastName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: theme.text }}>{formatTeacher(classItem)}</Text>
                  <Text style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>Teacher · {classItem.subjectName}</Text>
                </View>
                <ToneTag label="Teacher" tone="red" />
              </View>
            ) : null}

            {classmates.length === 0 ? (
              <DarkEmptyPanel title="No classmates available" subtitle="Classmate details are unavailable right now." />
            ) : (
              classmates.map((entry) => {
                const fullName = [entry.student?.firstName || "Student", entry.student?.lastName || ""].join(" ").trim();
                const isCurrentStudent = entry.student?.id === user?.id || entry.student?.id === user?.userId;
                const completedShare = visibleLessons.length > 0 ? `${completedLessonCount}/${visibleLessons.length} lessons` : "No lessons yet";

                return (
                  <View
                    key={entry.id}
                    style={{
                      marginHorizontal: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isCurrentStudent ? theme.blue : theme.green,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>
                        {buildInitials(entry.student?.firstName, entry.student?.lastName)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: theme.text }}>{fullName}</Text>
                      <Text style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>
                        Student · {isCurrentStudent ? `${lessonProgress}% complete` : completedShare}
                      </Text>
                    </View>

                    {isCurrentStudent ? <ToneTag label="You" tone="blue" /> : <ToneTag label="Active" tone="green" />}
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {activeTab === "grades" ? (
          <View>
            <DarkSectionLabel
              title="Grades"
              meta={
                gradeSummaryRows.find((row) => row.id === "running-average")?.scoreText === "—"
                  ? "No scores yet"
                  : `${gradeSummaryRows.find((row) => row.id === "running-average")?.scoreText} avg`
              }
              metaColor={theme.green}
            />

            <View
              style={{
                marginHorizontal: 16,
                marginTop: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: "hidden",
                backgroundColor: theme.surface,
              }}
            >
              {gradeSummaryRows.length === 0 ? (
                <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Text style={{ fontSize: 12, color: theme.muted }}>No graded assessments are available yet.</Text>
                </View>
              ) : (
                gradeSummaryRows.map((row, index) => (
                  <View
                    key={row.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      borderBottomWidth: index === gradeSummaryRows.length - 1 ? 0 : 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: row.id === "running-average" ? theme.text : theme.muted, fontWeight: row.id === "running-average" ? "600" : "400" }}>
                      {row.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: row.tone === "high" ? theme.green : row.tone === "mid" ? theme.amber : theme.dim,
                      }}
                    >
                      {row.scoreText}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {breakdownRows.length > 0 ? (
              <>
                <DarkSectionLabel title="Grading Breakdown" />
                <View
                  style={{
                    marginHorizontal: 16,
                    marginTop: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    overflow: "hidden",
                    backgroundColor: theme.surface,
                  }}
                >
                  {breakdownRows.map((row, index) => (
                    <View
                      key={row.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        borderBottomWidth: index === breakdownRows.length - 1 ? 0 : 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: theme.muted }}>{row.label}</Text>
                      <Text style={{ fontSize: 12, color: theme.muted }}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {detailedGradeRows.length > 0 ? (
              <>
                <DarkSectionLabel title="Assessment Status" />
                <View
                  style={{
                    marginHorizontal: 16,
                    marginTop: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    overflow: "hidden",
                    backgroundColor: theme.surface,
                  }}
                >
                  {detailedGradeRows.map((grade, index) => (
                    <View
                      key={grade.id}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        borderBottomWidth: index === detailedGradeRows.length - 1 ? 0 : 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>{grade.title}</Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: grade.pending ? theme.muted : theme.green }}>
                        {grade.scoreText}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>{grade.metaText}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {activeTab === "calendar" ? (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>{currentMonthLabel}</Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                <Pressable
                  accessibilityLabel="Open full calendar"
                  onPress={() => navigation.navigate("Calendar", { classId })}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: theme.text }}>Open Full Calendar</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Previous month"
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.active,
                  }}
                >
                  <MaterialCommunityIcons name="chevron-left" size={14} color={theme.muted} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Next month"
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.active,
                  }}
                >
                  <MaterialCommunityIcons name="chevron-right" size={14} color={theme.muted} />
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 14 }}>
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((label) => (
                <View key={label} style={{ width: "14.2857%", paddingVertical: 4, alignItems: "center" }}>
                  <Text style={{ fontSize: 9, fontWeight: "600", letterSpacing: 0.5, color: theme.dim }}>{label}</Text>
                </View>
              ))}

              {calendarCells.map((cell) => (
                <View key={cell.key} style={{ width: "14.2857%", padding: 1 }}>
                  <View
                    style={{
                      aspectRatio: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      backgroundColor: cell.isToday ? theme.red : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: cell.isToday || cell.isDueDay ? "700" : cell.isClassDay ? "600" : "400",
                        color: !cell.inMonth
                          ? "transparent"
                          : cell.isToday
                            ? "#FFFFFF"
                            : cell.isClassDay
                              ? theme.blue
                              : theme.muted,
                      }}
                    >
                      {cell.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <DarkSectionLabel title="Upcoming" />

            {eventRows.length === 0 ? (
              <DarkEmptyPanel title="No upcoming items" subtitle="No class sessions or due tasks were found for this class yet." />
            ) : (
              eventRows.map((row) => (
                <View
                  key={row.id}
                  style={{
                    marginHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 10,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: row.tone === "blue" ? theme.blue : theme.amber,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: theme.text }}>{row.title}</Text>
                    <Text style={{ marginTop: 1, fontSize: 11, color: theme.muted }}>{row.subtitle}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScreenScroll>

      {sheetOpen ? (
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pressable
            accessibilityLabel="Close class overflow"
            onPress={() => setSheetOpen(false)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.65)" }}
          />

          <View
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              left: 0,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              backgroundColor: theme.surface,
              paddingBottom: 20,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                alignSelf: "center",
                marginTop: 10,
                marginBottom: 4,
                backgroundColor: theme.border,
              }}
            />

            <Text
              style={{
                paddingHorizontal: 18,
                paddingTop: 10,
                paddingBottom: 8,
                fontSize: 10,
                fontWeight: "600",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: theme.muted,
              }}
            >
              More in This Class
            </Text>

            {[
              {
                key: "classmates" as const,
                tone: "blue" as const,
                icon: "account-group-outline" as const,
                subtitle: `${memberCount} members · ${formatTeacher(classItem)}`,
              },
              {
                key: "grades" as const,
                tone: "green" as const,
                icon: "chart-line" as const,
                subtitle:
                  gradeSummaryRows.find((row) => row.id === "running-average")?.scoreText === "—"
                    ? "No running average yet"
                    : `Running average: ${gradeSummaryRows.find((row) => row.id === "running-average")?.scoreText}`,
              },
              {
                key: "calendar" as const,
                tone: "purple" as const,
                icon: "calendar-month-outline" as const,
                subtitle: classItem.schedules?.[0]
                  ? `Next class pattern: ${classItem.schedules[0].days.join("/")} · ${formatTime(classItem.schedules[0].startTime)}`
                  : "No schedule available",
              },
            ].map((item, index, array) => {
              const iconTone =
                item.tone === "blue"
                  ? { backgroundColor: theme.blueSoft, color: theme.blue }
                  : item.tone === "green"
                    ? { backgroundColor: theme.greenSoft, color: theme.green }
                    : { backgroundColor: theme.purpleSoft, color: theme.purple };

              return (
                <Pressable
                  key={item.key}
                  onPress={() => openOverflowTab(item.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 13,
                    paddingHorizontal: 18,
                    paddingVertical: 13,
                    borderBottomWidth: index === array.length - 1 ? 0 : 1,
                    borderBottomColor: theme.border,
                    backgroundColor: activeTab === item.key ? theme.active : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: iconTone.backgroundColor,
                    }}
                  >
                    <MaterialCommunityIcons name={item.icon} size={18} color={iconTone.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: theme.text }}>{tabLabels[item.key]}</Text>
                    <Text style={{ marginTop: 2, fontSize: 11, color: theme.muted }}>{item.subtitle}</Text>
                  </View>

                  <MaterialCommunityIcons name="chevron-right" size={16} color={theme.dim} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function ClassDetailScreen({ route, navigation }: Props) {
  return (
    <StudentClassDetailContent
      classId={route.params.classId}
      navigation={navigation}
      initialTab={route.params.initialTab}
    />
  );
}

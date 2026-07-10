import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { AnimatedEntrance, Refreshable, ScreenScroll } from "../components/ui/primitives";
import { peekAppError } from "../api/http";
import {
  useAssessments,
  useAssessmentAttempts,
  useLessonCompletions,
  useLessons,
  usePerformanceSummary,
  useProfile,
  useSchoolEvents,
  useStudentClasses,
} from "../api/hooks";
import { findContinueLearning, toAssessmentCard, toLessonCards, toSubjectCard } from "../data/mappers";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { useLiveNotifications } from "../providers/LiveNotificationContext";
import { computeProfileReadiness } from "./screen-flow";
import type { Assessment, AssessmentAttempt } from "../types/assessment";
import type { ClassItem } from "../types/class";
import type { Lesson, LessonCompletion } from "../types/lesson";
import type { SchoolEvent } from "../types/school-event";
import { studentDarkTheme } from "../theme/studentDark";
import { shadow } from "../theme/tokens";
import { refetchWithConcurrency } from "../utils/refetchWithConcurrency";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Dashboard">,
  NativeStackScreenProps<RootStackParamList>
>;

type ScheduleEntry = {
  id: string;
  classId: string;
  subjectName: string;
  teacherName: string;
  sectionName: string;
  startTime: string;
  endTime: string;
  room?: string;
};

type ClassDashboardSnapshot = {
  lessons: Lesson[];
  completions: LessonCompletion[];
  assessments: Assessment[];
  assessmentAttempts: Record<string, AssessmentAttemptSnapshot>;
  error: unknown;
  isRefetching: boolean;
};

type SchoolEventsSnapshot = {
  events: SchoolEvent[];
  error: unknown;
  isRefetching: boolean;
};

type PendingAssessmentItem = {
  assessment: Assessment;
  subject: ReturnType<typeof toSubjectCard>;
  dueTime: number;
  status: ReturnType<typeof toAssessmentCard>["status"];
};

type AssessmentAttemptSnapshot = {
  attempts: AssessmentAttempt[];
  error: unknown;
  isRefetching: boolean;
  isResolved: boolean;
};

type CalendarCell = {
  key: string;
  label: string;
  inMonth: boolean;
  isToday: boolean;
  isClassDay: boolean;
  hasEvent: boolean;
};

type TimelineItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: "blue" | "amber" | "purple";
  sortValue: number;
};

const theme = studentDarkTheme;

const DAY_TO_INDEX: Record<string, number> = {
  SU: 0,
  SUN: 0,
  M: 1,
  MON: 1,
  T: 2,
  TU: 2,
  TUE: 2,
  W: 3,
  WED: 3,
  TH: 4,
  THU: 4,
  F: 5,
  FRI: 5,
  SA: 6,
  SAT: 6,
};

function getErrorSignature(error: unknown) {
  if (!error) return "";

  if (error instanceof Error) {
    return `${error.name}:${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function areClassSnapshotsEqual(left: ClassDashboardSnapshot | undefined, right: ClassDashboardSnapshot) {
  if (!left) return false;

  return (
    getErrorSignature(left.error) === getErrorSignature(right.error) &&
    left.isRefetching === right.isRefetching &&
    JSON.stringify(left.lessons) === JSON.stringify(right.lessons) &&
    JSON.stringify(left.completions) === JSON.stringify(right.completions) &&
    JSON.stringify(left.assessments) === JSON.stringify(right.assessments) &&
    JSON.stringify(left.assessmentAttempts) === JSON.stringify(right.assessmentAttempts)
  );
}

function formatDueDate(value?: string | null) {
  if (!value) return "No due date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCalendarMonth(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatWeekdayMonthDay(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatEventDate(value?: string | null, allDay?: boolean) {
  if (!value) return "Date to be announced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  if (allDay) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

function formatTimeRange(startTime: string, endTime: string) {
  return `${formatClock(startTime)}-${formatClock(endTime)}`;
}

function formatDurationLabel(startTime: string, endTime: string) {
  const [startHoursText = "0", startMinutesText = "0"] = startTime.split(":");
  const [endHoursText = "0", endMinutesText = "0"] = endTime.split(":");
  const startHours = Number.parseInt(startHoursText, 10) || 0;
  const startMinutes = Number.parseInt(startMinutesText, 10) || 0;
  const endHours = Number.parseInt(endHoursText, 10) || 0;
  const endMinutes = Number.parseInt(endMinutesText, 10) || 0;

  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  const duration = Math.max(endTotal - startTotal, 0);

  if (!duration) {
    return "0 min";
  }

  return `${duration} min`;
}

function getDayIndexToken(day: string) {
  return DAY_TO_INDEX[day.trim().toUpperCase()];
}

function getSchoolYearRank(value?: string | null) {
  if (!value) return 0;
  const match = value.match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function selectDashboardClasses(classes: NonNullable<ReturnType<typeof useStudentClasses>["data"]>) {
  const activeClasses = classes.filter((classItem) => classItem.isActive !== false);
  const candidateClasses = activeClasses.length > 0 ? activeClasses : classes;

  if (candidateClasses.length <= 1) {
    return candidateClasses;
  }

  const latestSchoolYearRank = Math.max(
    ...candidateClasses.map((classItem) => getSchoolYearRank(classItem.schoolYear)),
  );
  const scopedClasses = candidateClasses.filter(
    (classItem) => getSchoolYearRank(classItem.schoolYear) === latestSchoolYearRank,
  );

  return scopedClasses.length > 0 ? scopedClasses : candidateClasses;
}

function buildTodaySchedule(
  classes: NonNullable<ReturnType<typeof useStudentClasses>["data"]>,
  now = new Date(),
): ScheduleEntry[] {
  const todayIndex = now.getDay();

  return classes
    .flatMap((classItem) =>
      (classItem.schedules ?? [])
        .filter((schedule) => (schedule.days ?? []).some((day) => getDayIndexToken(day) === todayIndex))
        .map((schedule) => ({
          id: `${classItem.id}-${schedule.id}`,
          classId: classItem.id,
          subjectName: classItem.subjectName || classItem.className || classItem.name || "Class",
          teacherName:
            [classItem.teacher?.firstName, classItem.teacher?.lastName].filter(Boolean).join(" ") || "Assigned teacher",
          sectionName: classItem.section?.name || "Assigned section",
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          room: classItem.room,
        })),
    )
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .slice(0, 4);
}

function resolveInitials(firstName?: string, lastName?: string, email?: string) {
  const fromNames = [firstName, lastName]
    .filter(Boolean)
    .map((value) => value?.trim()?.[0] ?? "")
    .join("")
    .toUpperCase();

  if (fromNames.length >= 2) {
    return fromNames.slice(0, 2);
  }

  if (fromNames.length === 1) {
    return `${fromNames}R`;
  }

  return (email?.slice(0, 2) || "NR").toUpperCase();
}

function resolveGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning!";
  if (hour < 18) return "Good afternoon!";
  return "Good evening!";
}

function buildDashboardCalendar(
  monthDate: Date,
  classes: ClassItem[],
  pendingAssessments: PendingAssessmentItem[],
  schoolEvents: SchoolEvent[],
) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const mondayFirstOffset = (monthStart.getDay() + 6) % 7;
  const classDays = new Set<number>();

  classes.forEach((classItem) => {
    (classItem.schedules ?? []).forEach((schedule) => {
      schedule.days.forEach((day) => {
        const normalized = getDayIndexToken(day);
        if (normalized != null) {
          classDays.add(normalized);
        }
      });
    });
  });

  const eventDateKeys = new Set<string>();
  pendingAssessments.forEach(({ assessment }) => {
    if (!assessment.dueDate) return;
    const dueDate = new Date(assessment.dueDate);
    if (!Number.isNaN(dueDate.getTime())) {
      eventDateKeys.add(dueDate.toDateString());
    }
  });
  schoolEvents.forEach((event) => {
    const startsAt = new Date(event.startsAt);
    if (!Number.isNaN(startsAt.getTime())) {
      eventDateKeys.add(startsAt.toDateString());
    }
  });

  const today = new Date();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < mondayFirstOffset; index += 1) {
    cells.push({
      key: `blank-${index}`,
      label: "",
      inMonth: false,
      isToday: false,
      isClassDay: false,
      hasEvent: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);

    cells.push({
      key: cellDate.toISOString(),
      label: String(day),
      inMonth: true,
      isToday:
        cellDate.getFullYear() === today.getFullYear() &&
        cellDate.getMonth() === today.getMonth() &&
        cellDate.getDate() === today.getDate(),
      isClassDay: classDays.has(cellDate.getDay()),
      hasEvent: eventDateKeys.has(cellDate.toDateString()),
    });
  }

  return cells;
}

function isScheduleActive(entry: ScheduleEntry, now = new Date()) {
  const [startHours = "0", startMinutes = "0"] = entry.startTime.split(":");
  const [endHours = "0", endMinutes = "0"] = entry.endTime.split(":");
  const start = new Date(now);
  start.setHours(Number.parseInt(startHours, 10), Number.parseInt(startMinutes, 10), 0, 0);
  const end = new Date(now);
  end.setHours(Number.parseInt(endHours, 10), Number.parseInt(endMinutes, 10), 0, 0);
  return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
}

function buildUpcomingTimeline(
  todaySchedule: ScheduleEntry[],
  pendingAssessments: PendingAssessmentItem[],
  schoolEvents: SchoolEvent[],
  now = new Date(),
) {
  const todayKey = formatWeekdayMonthDay(now);

  const timeline: TimelineItem[] = [
    ...todaySchedule.map((entry) => ({
      id: entry.id,
      title: `${entry.subjectName} - Class Session`,
      subtitle: `${todayKey} · ${formatTimeRange(entry.startTime, entry.endTime)}`,
      tone: "blue" as const,
      sortValue: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        Number.parseInt(entry.startTime.split(":")[0] || "0", 10),
        Number.parseInt(entry.startTime.split(":")[1] || "0", 10),
      ).getTime(),
    })),
    ...pendingAssessments
      .filter(({ assessment }) => assessment.dueDate)
      .map(({ assessment }) => ({
        id: assessment.id,
        title: `${assessment.title} Due`,
        subtitle: new Date(assessment.dueDate || 0).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        tone: "amber" as const,
        sortValue: new Date(assessment.dueDate || 0).getTime(),
      })),
    ...schoolEvents.map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: event.allDay
        ? formatEventDate(event.startsAt, true)
        : new Date(event.startsAt).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
      tone: "purple" as const,
      sortValue: new Date(event.startsAt).getTime(),
    })),
  ];

  return timeline
    .filter((item) => Number.isFinite(item.sortValue))
    .sort((left, right) => left.sortValue - right.sortValue)
    .slice(0, 4);
}

function DashboardSchoolEventsBridge({
  schoolYear,
  onChange,
  onRefreshReady,
}: {
  schoolYear: string;
  onChange: (snapshot: SchoolEventsSnapshot) => void;
  onRefreshReady: (refresh: () => Promise<unknown>) => void;
}) {
  const schoolEventsQuery = useSchoolEvents({ schoolYear });

  const refetchEvents = useCallback(() => schoolEventsQuery.refetch(), [schoolEventsQuery]);

  const snapshot = useMemo<SchoolEventsSnapshot>(
    () => ({
      events: schoolEventsQuery.data ?? [],
      error: schoolEventsQuery.error,
      isRefetching: schoolEventsQuery.isRefetching,
    }),
    [schoolEventsQuery.data, schoolEventsQuery.error, schoolEventsQuery.isRefetching],
  );

  useEffect(() => {
    onRefreshReady(refetchEvents);
  }, [onRefreshReady, refetchEvents]);

  useEffect(() => {
    onChange(snapshot);
  }, [onChange, snapshot]);

  return null;
}

function DashboardAssessmentAttemptBridge({
  assessmentId,
  onChange,
  onRemove,
  onRefreshReady,
}: {
  assessmentId: string;
  onChange: (assessmentId: string, snapshot: AssessmentAttemptSnapshot) => void;
  onRemove: (assessmentId: string) => void;
  onRefreshReady: (assessmentId: string, refresh: () => Promise<unknown>) => void;
}) {
  const attemptsQuery = useAssessmentAttempts(assessmentId);

  const refetchAttempts = useCallback(() => attemptsQuery.refetch(), [attemptsQuery]);

  const snapshot = useMemo<AssessmentAttemptSnapshot>(
    () => ({
      attempts: attemptsQuery.data ?? [],
      error: attemptsQuery.error,
      isRefetching: attemptsQuery.isRefetching,
      isResolved: attemptsQuery.data !== undefined && attemptsQuery.error == null,
    }),
    [attemptsQuery.data, attemptsQuery.error, attemptsQuery.isRefetching],
  );

  useEffect(() => {
    onRefreshReady(assessmentId, refetchAttempts);
  }, [assessmentId, onRefreshReady, refetchAttempts]);

  useEffect(() => {
    onChange(assessmentId, snapshot);
  }, [assessmentId, onChange, snapshot]);

  useEffect(
    () => () => {
      onRemove(assessmentId);
    },
    [assessmentId, onRemove],
  );

  return null;
}

function DashboardClassDataBridge({
  classId,
  onChange,
  onRemove,
  onRefreshReady,
}: {
  classId: string;
  onChange: (classId: string, snapshot: ClassDashboardSnapshot) => void;
  onRemove: (classId: string) => void;
  onRefreshReady: (classId: string, refresh: () => Promise<unknown>) => void;
}) {
  const lessonsQuery = useLessons(classId);
  const completionsQuery = useLessonCompletions(classId);
  const assessmentsQuery = useAssessments(classId);
  const [assessmentAttemptMap, setAssessmentAttemptMap] = useState<Record<string, AssessmentAttemptSnapshot>>({});
  const assessmentRefreshersRef = useRef<Record<string, () => Promise<unknown>>>({});
  const assessmentIds = useMemo(
    () => (assessmentsQuery.data ?? []).map((assessment) => assessment.id),
    [assessmentsQuery.data],
  );

  const refetchAll = useCallback(
    () =>
      Promise.all([
        lessonsQuery.refetch(),
        completionsQuery.refetch(),
        assessmentsQuery.refetch(),
        ...Object.values(assessmentRefreshersRef.current).map((refresh) => refresh()),
      ]),
    [assessmentsQuery, completionsQuery, lessonsQuery],
  );

  const handleAttemptChange = useCallback((assessmentId: string, snapshot: AssessmentAttemptSnapshot) => {
    setAssessmentAttemptMap((current) => {
      const previous = current[assessmentId];
      if (
        getErrorSignature(previous?.error) === getErrorSignature(snapshot.error) &&
        previous?.isRefetching === snapshot.isRefetching &&
        previous?.isResolved === snapshot.isResolved &&
        JSON.stringify(previous?.attempts ?? []) === JSON.stringify(snapshot.attempts)
      ) {
        return current;
      }

      return {
        ...current,
        [assessmentId]: snapshot,
      };
    });
  }, []);

  const handleAttemptRemove = useCallback((assessmentId: string) => {
    delete assessmentRefreshersRef.current[assessmentId];
    setAssessmentAttemptMap((current) => {
      if (!(assessmentId in current)) return current;
      const next = { ...current };
      delete next[assessmentId];
      return next;
    });
  }, []);

  const handleAttemptRefreshReady = useCallback((assessmentId: string, refresh: () => Promise<unknown>) => {
    assessmentRefreshersRef.current[assessmentId] = refresh;
  }, []);

  useEffect(() => {
    setAssessmentAttemptMap((current) => {
      const activeIds = new Set(assessmentIds);
      let changed = false;
      const next: Record<string, AssessmentAttemptSnapshot> = {};

      Object.entries(current).forEach(([assessmentId, snapshot]) => {
        if (activeIds.has(assessmentId)) {
          next[assessmentId] = snapshot;
        } else {
          delete assessmentRefreshersRef.current[assessmentId];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [assessmentIds]);

  const snapshot = useMemo<ClassDashboardSnapshot>(
    () => ({
      lessons: lessonsQuery.data ?? [],
      completions: completionsQuery.data ?? [],
      assessments: assessmentsQuery.data ?? [],
      assessmentAttempts: assessmentAttemptMap,
      error:
        lessonsQuery.error ||
        completionsQuery.error ||
        assessmentsQuery.error ||
        Object.values(assessmentAttemptMap).find((entry) => entry.error)?.error,
      isRefetching:
        lessonsQuery.isRefetching ||
        completionsQuery.isRefetching ||
        assessmentsQuery.isRefetching ||
        Object.values(assessmentAttemptMap).some((entry) => entry.isRefetching),
    }),
    [
      assessmentAttemptMap,
      assessmentsQuery.data,
      assessmentsQuery.error,
      assessmentsQuery.isRefetching,
      completionsQuery.data,
      completionsQuery.error,
      completionsQuery.isRefetching,
      lessonsQuery.data,
      lessonsQuery.error,
      lessonsQuery.isRefetching,
    ],
  );

  useEffect(() => {
    onRefreshReady(classId, refetchAll);
  }, [classId, onRefreshReady, refetchAll]);

  useEffect(() => {
    onChange(classId, snapshot);
  }, [classId, onChange, snapshot]);

  useEffect(
    () => () => {
      onRemove(classId);
    },
    [classId, onRemove],
  );

  return (
    <>
      {assessmentIds.map((assessmentId) => (
        <DashboardAssessmentAttemptBridge
          key={assessmentId}
          assessmentId={assessmentId}
          onChange={handleAttemptChange}
          onRemove={handleAttemptRemove}
          onRefreshReady={handleAttemptRefreshReady}
        />
      ))}
    </>
  );
}

function SectionLabel({
  title,
  actionLabel,
  onPressAction,
  actionColor = theme.red,
}: {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
  actionColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
      }}
    >
      <Text
        style={{
          color: theme.muted,
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      {actionLabel ? (
        <Pressable onPress={onPressAction} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: actionColor, fontSize: 10, fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DarkPanel({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        backgroundColor: theme.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: "hidden",
        ...shadow.card,
      }}
    >
      {children}
    </View>
  );
}

function DashboardNotice({
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
        marginTop: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        padding: 14,
        ...shadow.card,
      }}
    >
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}>{title}</Text>
      <Text style={{ marginTop: 5, color: theme.muted, fontSize: 11, lineHeight: 16 }}>{subtitle}</Text>
    </View>
  );
}

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { unreadCount } = useLiveNotifications();
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const profileQuery = useProfile();
  const performanceQuery = usePerformanceSummary();
  const [classDataMap, setClassDataMap] = useState<Record<string, ClassDashboardSnapshot>>({});
  const classRefreshersRef = useRef<Record<string, () => Promise<unknown>>>({});
  const [schoolEventsSnapshot, setSchoolEventsSnapshot] = useState<SchoolEventsSnapshot | null>(null);
  const schoolEventsRefresherRef = useRef<(() => Promise<unknown>) | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const dashboardClasses = useMemo(
    () => selectDashboardClasses(classesQuery.data ?? []),
    [classesQuery.data],
  );
  const schoolYear = dashboardClasses[0]?.schoolYear ?? null;

  const classIds = useMemo(() => dashboardClasses.map((classItem) => classItem.id), [dashboardClasses]);

  const handleClassDataChange = useCallback((classId: string, snapshot: ClassDashboardSnapshot) => {
    setClassDataMap((current) => {
      const previous = current[classId];
      if (areClassSnapshotsEqual(previous, snapshot)) {
        return current;
      }

      return {
        ...current,
        [classId]: snapshot,
      };
    });
  }, []);

  const handleClassDataRemove = useCallback((classId: string) => {
    delete classRefreshersRef.current[classId];
    setClassDataMap((current) => {
      if (!(classId in current)) return current;
      const next = { ...current };
      delete next[classId];
      return next;
    });
  }, []);

  const handleClassRefreshReady = useCallback((classId: string, refresh: () => Promise<unknown>) => {
    classRefreshersRef.current[classId] = refresh;
  }, []);

  useEffect(() => {
    setClassDataMap((current) => {
      const activeIds = new Set(classIds);
      let changed = false;
      const next: Record<string, ClassDashboardSnapshot> = {};

      Object.entries(current).forEach(([classId, snapshot]) => {
        if (activeIds.has(classId)) {
          next[classId] = snapshot;
        } else {
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [classIds]);

  const handleSchoolEventsChange = useCallback((snapshot: SchoolEventsSnapshot) => {
    setSchoolEventsSnapshot((current) => {
      if (
        current &&
        getErrorSignature(current.error) === getErrorSignature(snapshot.error) &&
        current.isRefetching === snapshot.isRefetching &&
        JSON.stringify(current.events) === JSON.stringify(snapshot.events)
      ) {
        return current;
      }

      return snapshot;
    });
  }, []);

  const handleSchoolEventsRefreshReady = useCallback((refresh: () => Promise<unknown>) => {
    schoolEventsRefresherRef.current = refresh;
  }, []);

  useEffect(() => {
    if (schoolYear) return;
    schoolEventsRefresherRef.current = null;
    setSchoolEventsSnapshot(null);
  }, [schoolYear]);

  const subjects = useMemo(
    () =>
      dashboardClasses.map((classItem) =>
        toSubjectCard(
          classItem,
          classDataMap[classItem.id]?.lessons ?? [],
          classDataMap[classItem.id]?.completions ?? [],
          performanceQuery.data?.classes.find((entry) => entry.classId === classItem.id),
        ),
      ),
    [classDataMap, dashboardClasses, performanceQuery.data?.classes],
  );

  const lessonMap = useMemo(
    () =>
      Object.fromEntries(
        subjects.map((subject) => [
          subject.id,
          toLessonCards(
            classDataMap[subject.id]?.lessons ?? [],
            classDataMap[subject.id]?.completions ?? [],
            subject,
          ),
        ]),
      ),
    [classDataMap, subjects],
  );

  const continueLearning = useMemo(() => findContinueLearning(subjects, lessonMap), [lessonMap, subjects]);
  const recentLessons = useMemo(
    () =>
      subjects
        .flatMap((subject) =>
          (lessonMap[subject.id] ?? [])
            .filter((lesson) => lesson.status !== "locked")
            .map((lesson) => ({ ...lesson, subject })),
        )
        .slice(0, 3),
    [lessonMap, subjects],
  );

  const pendingAssessmentState = useMemo(() => {
    const subjectByClassId = new Map(subjects.map((subject) => [subject.id, subject]));
    const actionableItems: PendingAssessmentItem[] = [];
    let unresolvedCount = 0;

    Object.values(classDataMap).forEach((entry) => {
      entry.assessments
        .filter((assessment) => assessment.isPublished)
        .forEach((assessment) => {
          const subject = subjectByClassId.get(assessment.classId);
          if (!subject) return;

          const attemptSnapshot = entry.assessmentAttempts[assessment.id];
          if (!attemptSnapshot || !attemptSnapshot.isResolved || attemptSnapshot.error) {
            unresolvedCount += 1;
            return;
          }

          const card = toAssessmentCard(assessment, subject, attemptSnapshot.attempts);
          if (card.status === "completed") {
            return;
          }

          actionableItems.push({
            assessment,
            subject,
            dueTime: assessment.dueDate ? new Date(assessment.dueDate).getTime() : Number.POSITIVE_INFINITY,
            status: card.status,
          });
        });
    });

    return {
      items: actionableItems.sort((left, right) => left.dueTime - right.dueTime).slice(0, 4),
      unresolvedCount,
    };
  }, [classDataMap, subjects]);

  const pendingAssessments = pendingAssessmentState.items;
  const pendingAssessmentStatusCount = pendingAssessmentState.unresolvedCount;
  const hasPendingAssessmentSync = pendingAssessmentStatusCount > 0;
  const todaySchedule = useMemo(() => buildTodaySchedule(dashboardClasses), [dashboardClasses]);
  const schoolEvents = schoolEventsSnapshot?.events ?? [];

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Student";
  const firstName = user?.firstName || fullName;
  const profileReadiness = computeProfileReadiness({
    phone: profileQuery.data?.phone,
    address: profileQuery.data?.address,
    familyName: profileQuery.data?.familyName,
    familyContact: profileQuery.data?.familyContact,
    profilePicture: profileQuery.data?.profilePicture || user?.profilePicture || null,
  });
  const averageScore = Math.round(performanceQuery.data?.overall.averageBlendedScore ?? 0);
  const primaryError =
    classesQuery.error ||
    profileQuery.error ||
    performanceQuery.error ||
    schoolEventsSnapshot?.error ||
    Object.values(classDataMap).find((entry) => entry.error)?.error;
  const refreshing =
    classesQuery.isRefetching ||
    profileQuery.isRefetching ||
    performanceQuery.isRefetching ||
    (schoolEventsSnapshot?.isRefetching ?? false) ||
    Object.values(classDataMap).some((entry) => entry.isRefetching);

  const handleRefresh = () => {
    void Promise.all([
      classesQuery.refetch(),
      profileQuery.refetch(),
      performanceQuery.refetch(),
      refetchWithConcurrency([
        schoolEventsRefresherRef.current,
        ...Object.values(classRefreshersRef.current),
      ]),
    ]);
  };

  const initials = resolveInitials(user?.firstName, user?.lastName, user?.email);
  const heroTaskCount =
    hasPendingAssessmentSync && pendingAssessments.length === 0
      ? pendingAssessmentStatusCount
      : pendingAssessments.length;
  const heroTaskLabel = heroTaskCount === 1 ? "task needs attention" : "tasks need attention";
  const dayScheduleLabel =
    todaySchedule.length === 0
      ? "No classes today"
      : todaySchedule.length === 1
        ? "1 block today"
        : `${todaySchedule.length} blocks today`;
  const heroSummaryText =
    hasPendingAssessmentSync && pendingAssessments.length === 0
      ? `Checking ${pendingAssessmentStatusCount} assessment status${pendingAssessmentStatusCount === 1 ? "" : "es"}`
      : `${heroTaskCount} task${heroTaskCount === 1 ? "" : "s"} still need${heroTaskCount === 1 ? "s" : ""} attention`;

  const calendarCells = useMemo(
    () => buildDashboardCalendar(calendarMonth, dashboardClasses, pendingAssessments, schoolEvents),
    [calendarMonth, dashboardClasses, pendingAssessments, schoolEvents],
  );
  const upcomingTimeline = useMemo(
    () => buildUpcomingTimeline(todaySchedule, pendingAssessments, schoolEvents),
    [pendingAssessments, schoolEvents, todaySchedule],
  );

  const handleContinueLearning = () => {
    const nextClassId = continueLearning[0]?.subject.id ?? dashboardClasses[0]?.id;
    if (nextClassId) {
      navigation.navigate("ClassWorkspace", { classId: nextClassId });
      return;
    }

    navigation.navigate("Classes");
  };

  const handleOpenNotifications = () => {
    navigation.navigate("Announcements");
  };

  const handleOpenProfile = () => {
    navigation.navigate("Profile");
  };

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {schoolYear ? (
        <DashboardSchoolEventsBridge
          schoolYear={schoolYear}
          onChange={handleSchoolEventsChange}
          onRefreshReady={handleSchoolEventsRefreshReady}
        />
      ) : null}
      {classIds.map((classId) => (
        <DashboardClassDataBridge
          key={classId}
          classId={classId}
          onChange={handleClassDataChange}
          onRemove={handleClassDataRemove}
          onRefreshReady={handleClassRefreshReady}
        />
      ))}

      <View style={{ backgroundColor: theme.bg, paddingBottom: 88 }}>
        <View
          style={{
            backgroundColor: theme.topbar,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: theme.red,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>N</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}>Student Home</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                accessibilityLabel="Open notifications"
                onPress={handleOpenNotifications}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons name="bell-outline" size={18} color={theme.text} />
                {unreadCount > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -2,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: theme.red,
                      borderWidth: 2,
                      borderColor: theme.topbar,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "900" }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>

              <Pressable
                accessibilityLabel="Open profile"
                onPress={handleOpenProfile}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  backgroundColor: theme.red,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>{initials}</Text>
              </Pressable>
            </View>
          </View>

          <Text style={{ color: theme.subtext, fontSize: 11 }}>
            Ready for today, <Text style={{ color: theme.text, fontWeight: "600" }}>{firstName}</Text>?
          </Text>
        </View>

        <AnimatedEntrance delay={20}>
          <View
            style={{
              marginTop: 14,
              marginHorizontal: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 16,
              overflow: "hidden",
              backgroundColor: theme.surface,
              ...shadow.card,
            }}
          >
            <View
              style={{
                position: "absolute",
                top: -30,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: 999,
                backgroundColor: theme.blueSoft,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -40,
                right: 30,
                width: 80,
                height: 80,
                borderRadius: 999,
                backgroundColor: theme.redSoft,
              }}
            />

            <View style={{ position: "relative" }}>
              <Text style={{ color: theme.red, fontSize: 11, marginBottom: 3, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" }}>Today</Text>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900", marginBottom: 4 }}>{resolveGreeting()}, {firstName}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 14 }}>
                {heroTaskCount === 0
                  ? "You are all caught up today"
                  : `You have ${heroTaskCount} pending ${heroTaskCount === 1 ? "task" : "tasks"} today`}
              </Text>

              <View
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  paddingHorizontal: 13,
                  paddingVertical: 11,
                  marginBottom: 13,
                }}
              >
                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 10,
                    fontWeight: "500",
                    letterSpacing: 0.4,
                    marginBottom: 4,
                  }}
                >
                  Weekly Progress
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", flex: 1, paddingRight: 10 }}>{heroSummaryText}</Text>
                  <Text style={{ color: theme.blue, fontSize: 22, fontWeight: "900" }}>{averageScore}%</Text>
                </View>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.channel, overflow: "hidden", marginTop: 12 }}>
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.max(0, Math.min(100, averageScore))}%`,
                      borderRadius: 999,
                      backgroundColor: theme.blue,
                    }}
                  />
                </View>
                <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
                  {hasPendingAssessmentSync && pendingAssessments.length === 0
                    ? "We are syncing your latest assessment submissions before finalizing what still needs attention."
                    : "Keep your streak moving by finishing the next lesson and clearing due work."}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 9 }}>
                <Pressable
                  onPress={handleContinueLearning}
                  style={{
                    flex: 1,
                    borderRadius: 9,
                    backgroundColor: theme.red,
                    alignItems: "center",
                    minHeight: 44,
                    justifyContent: "center",
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>Continue Learning</Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate("Courses")}
                  style={{
                    flex: 1,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    alignItems: "center",
                    minHeight: 44,
                    justifyContent: "center",
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: "500" }}>My Courses</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance delay={40}>
          <View style={{ flexDirection: "row", gap: 9, marginHorizontal: 16, marginTop: 12 }}>
            {[
              {
                label: "Classes",
                value: dashboardClasses.length,
                icon: "book-open-page-variant-outline" as const,
                color: theme.blue,
                onPress: () => navigation.navigate("Classes"),
              },
              {
                label: "Average",
                value: `${averageScore}%`,
                icon: "chart-line" as const,
                color: theme.green,
                onPress: () => navigation.navigate("Performance"),
              },
              {
                label: "Profile",
                value: `${profileReadiness}%`,
                icon: "account-outline" as const,
                color: theme.purple,
                onPress: handleOpenProfile,
              },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  minHeight: 84,
                  justifyContent: "center",
                  ...shadow.card,
                }}
              >
                <MaterialCommunityIcons name={item.icon} size={16} color={item.color} style={{ opacity: 0.8 }} />
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700", marginTop: 6 }}>{item.value}</Text>
                <Text style={{ color: theme.muted, fontSize: 10, marginTop: 2 }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </AnimatedEntrance>

        {primaryError ? (
          <DashboardNotice title="Some dashboard data could not load" subtitle={peekAppError(primaryError).message} />
        ) : null}

        <AnimatedEntrance delay={60}>
          <SectionLabel title="Day Schedule" actionLabel="See All" onPressAction={() => navigation.navigate("Classes")} />
        </AnimatedEntrance>

        <AnimatedEntrance delay={80}>
          <DarkPanel>
            {todaySchedule.length === 0 ? (
              <View style={{ paddingHorizontal: 14, paddingVertical: 16 }}>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>No scheduled classes today</Text>
                <Text style={{ color: theme.muted, fontSize: 11, marginTop: 3 }}>{dayScheduleLabel}</Text>
              </View>
            ) : (
              todaySchedule.map((entry, index) => {
                const active = isScheduleActive(entry);

                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => navigation.navigate("ClassWorkspace", { classId: entry.classId })}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      minHeight: 64,
                      borderBottomWidth: index === todaySchedule.length - 1 ? 0 : 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View style={{ minWidth: 52, alignItems: "flex-end" }}>
                      <Text style={{ color: theme.blue, fontSize: 11, fontWeight: "600" }}>{formatClock(entry.startTime)}</Text>
                      <Text style={{ color: theme.muted, fontSize: 10, marginTop: 1 }}>
                        {formatDurationLabel(entry.startTime, entry.endTime)}
                      </Text>
                    </View>

                    <View
                      style={{
                        width: 1,
                        height: 32,
                        backgroundColor: theme.blueLine,
                        flexShrink: 0,
                      }}
                    />

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>{entry.subjectName}</Text>
                      <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>
                        {[entry.teacherName, entry.room ? `Room ${entry.room}` : null].filter(Boolean).join(" · ")}
                      </Text>
                    </View>

                    <View
                      style={{
                        borderRadius: 4,
                        backgroundColor: theme.blueSoft,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: theme.blue, fontSize: 10, fontWeight: "700" }}>{active ? "Now" : "Today"}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </DarkPanel>
        </AnimatedEntrance>

        <AnimatedEntrance delay={100}>
          <SectionLabel
            title="Pending Tasks"
            actionLabel={hasPendingAssessmentSync && pendingAssessments.length === 0 ? "Syncing" : `${pendingAssessments.length} due`}
            actionColor={theme.amber}
          />
        </AnimatedEntrance>

        <AnimatedEntrance delay={120}>
          {pendingAssessments.length === 0 && hasPendingAssessmentSync ? (
            <DashboardNotice
              title="Checking assessment submissions"
              subtitle={`We are verifying ${pendingAssessmentStatusCount} assessment status${pendingAssessmentStatusCount === 1 ? "" : "es"} before listing what is still due.`}
            />
          ) : pendingAssessments.length === 0 ? (
            <DarkPanel>
              <View style={{ alignItems: "center", paddingHorizontal: 16, paddingVertical: 18 }}>
                <Text style={{ fontSize: 22, marginBottom: 6 }}>✓</Text>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", marginBottom: 3 }}>You are all caught up</Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>No published assessments right now.</Text>
              </View>
            </DarkPanel>
          ) : (
            <View style={{ gap: 8 }}>
              {pendingAssessments.map(({ assessment, subject }, index) => (
                <AnimatedEntrance key={assessment.id} delay={140 + index * 20}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate("AssessmentDetail", {
                        assessmentId: assessment.id,
                        classId: assessment.classId,
                      })
                    }
                    style={{
                      marginHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 64,
                      ...shadow.card,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 1.5,
                        borderColor: assessment.dueDate ? theme.amber : theme.dim,
                        backgroundColor: assessment.dueDate ? theme.amberSoft : "transparent",
                      }}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
                        {assessment.title}
                      </Text>
                      <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        {subject.name} · {(assessment.type || "Task").replace(/_/g, " ")} · {(assessment.totalPoints ?? 100)} pts
                      </Text>
                    </View>
                    <Text style={{ color: theme.amber, fontSize: 10, fontWeight: "600" }}>{formatDueDate(assessment.dueDate)}</Text>
                  </Pressable>
                </AnimatedEntrance>
              ))}
            </View>
          )}
        </AnimatedEntrance>

        <AnimatedEntrance delay={160}>
          <SectionLabel title="Recent Lessons" actionLabel="View All" onPressAction={() => navigation.navigate("Classes")} />
        </AnimatedEntrance>

        <AnimatedEntrance delay={180}>
          {recentLessons.length === 0 ? (
            <DashboardNotice
              title="No lessons available yet"
              subtitle="When your classes publish lesson content, the newest lessons will show up here."
            />
          ) : (
            <View style={{ gap: 8 }}>
              {recentLessons.map(({ id, title, status, subject, order }, index) => {
                const completed = status === "completed";

                return (
                  <AnimatedEntrance key={id} delay={190 + index * 20}>
                    <Pressable
                      onPress={() => navigation.navigate("ClassWorkspace", { classId: subject.id })}
                      style={{
                        marginHorizontal: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.surface,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        minHeight: 64,
                        ...shadow.card,
                      }}
                    >
                      <View
                        style={{
                        width: 28,
                        height: 28,
                          borderRadius: 7,
                          backgroundColor: theme.redSoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: theme.red, fontSize: 12, fontWeight: "700" }}>{order ?? index + 1}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
                          {title}
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                          {subject.name} · Lesson {order ?? index + 1} {completed ? "· Done" : ""}
                        </Text>
                      </View>
                      <View
                        style={{
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          backgroundColor: completed ? theme.greenSoft : theme.blueSoft,
                        }}
                      >
                        <Text
                          style={{
                            color: completed ? theme.green : theme.blue,
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {completed ? "Done" : "Open"}
                        </Text>
                      </View>
                    </Pressable>
                  </AnimatedEntrance>
                );
              })}
            </View>
          )}
        </AnimatedEntrance>

        <AnimatedEntrance delay={220}>
          <SectionLabel
            title={formatCalendarMonth(calendarMonth)}
            actionLabel="Open Calendar"
            onPressAction={() => navigation.navigate("Calendar")}
          />
        </AnimatedEntrance>

        <AnimatedEntrance delay={240}>
          <DarkPanel>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 8,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700" }}>{formatCalendarMonth(calendarMonth)}</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  onPress={() =>
                    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                  }
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    backgroundColor: theme.active,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons name="chevron-left" size={14} color={theme.muted} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                  }
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    backgroundColor: theme.active,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons name="chevron-right" size={14} color={theme.muted} />
                </Pressable>
              </View>
            </View>

            <View style={{ paddingHorizontal: 10, paddingBottom: 12 }}>
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
                  <Text
                    key={`${label}-${index}`}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 9,
                      fontWeight: "600",
                      color: theme.dim,
                      paddingVertical: 4,
                    }}
                  >
                    {label}
                  </Text>
                ))}
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 1 }}>
                {calendarCells.map((cell) => (
                  <View
                    key={cell.key}
                    style={{
                      width: "14.2857%",
                      aspectRatio: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {cell.label ? (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: cell.isToday ? 16 : 6,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: cell.isToday ? theme.red : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            color: cell.isToday
                              ? "#FFFFFF"
                              : cell.isClassDay
                                ? theme.blue
                                : cell.inMonth
                                  ? cell.hasEvent
                                    ? theme.text
                                    : theme.muted
                                  : theme.dim,
                            fontSize: 11,
                            fontWeight: cell.isToday || cell.isClassDay ? "700" : "500",
                          }}
                        >
                          {cell.label}
                        </Text>
                        {cell.hasEvent && !cell.isToday ? (
                          <View
                            style={{
                              position: "absolute",
                              bottom: 3,
                              width: 4,
                              height: 4,
                              borderRadius: 999,
                              backgroundColor: theme.amber,
                            }}
                          />
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, paddingBottom: 4 }}>
              <SectionLabel title="Upcoming" actionLabel="See All" onPressAction={() => navigation.navigate("Calendar")} />
            </View>

            {upcomingTimeline.length === 0 ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600" }}>No upcoming items</Text>
                <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>Class sessions and due work will appear here.</Text>
              </View>
            ) : (
              upcomingTimeline.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: theme.border,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor:
                        item.tone === "blue" ? theme.blue : item.tone === "amber" ? theme.amber : theme.purple,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: "500" }}>{item.title}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11, marginTop: 1 }}>{item.subtitle}</Text>
                  </View>
                </View>
              ))
            )}
          </DarkPanel>
        </AnimatedEntrance>

        <AnimatedEntrance delay={260}>
          <SectionLabel title="Student Tools" />
        </AnimatedEntrance>

        <AnimatedEntrance delay={280}>
          <Pressable
            onPress={handleOpenProfile}
            style={{
              marginHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 14,
              paddingVertical: 13,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              minHeight: 64,
              ...shadow.card,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: theme.purpleSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="account-outline" size={18} color={theme.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", marginBottom: 3 }}>
                {profileReadiness >= 100 ? "Learner profile ready" : "Complete your learner profile"}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16 }}>
                {profileReadiness >= 100
                  ? `${fullName} has the key learner details filled in.`
                  : "Add your phone, address, and guardian details so class updates stay accurate."}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.dim} />
          </Pressable>
        </AnimatedEntrance>

        <View style={{ height: 8 }} />
      </View>
    </ScreenScroll>
  );
}

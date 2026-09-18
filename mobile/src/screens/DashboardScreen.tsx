import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import {
  findContinueLearning,
  toAssessmentCard,
  toLessonCards,
  toSubjectCard,
} from "../data/mappers";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { useLiveNotifications } from "../providers/LiveNotificationContext";
import { computeProfileReadiness } from "./screen-flow";
import type { Assessment, AssessmentAttempt } from "../types/assessment";
import type { Lesson, LessonCompletion } from "../types/lesson";
import type { SchoolEvent } from "../types/school-event";
import { refetchWithConcurrency } from "../utils/refetchWithConcurrency";
import { StudentHomeView } from "./student-home/StudentHomeView";

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

type TimelineItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: "blue" | "amber" | "purple";
  sortValue: number;
};

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

function areClassSnapshotsEqual(
  left: ClassDashboardSnapshot | undefined,
  right: ClassDashboardSnapshot,
) {
  if (!left) return false;

  return (
    getErrorSignature(left.error) === getErrorSignature(right.error) &&
    left.isRefetching === right.isRefetching &&
    JSON.stringify(left.lessons) === JSON.stringify(right.lessons) &&
    JSON.stringify(left.completions) === JSON.stringify(right.completions) &&
    JSON.stringify(left.assessments) === JSON.stringify(right.assessments) &&
    JSON.stringify(left.assessmentAttempts) ===
      JSON.stringify(right.assessmentAttempts)
  );
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

function getDayIndexToken(day: string) {
  return DAY_TO_INDEX[day.trim().toUpperCase()];
}

function getSchoolYearRank(value?: string | null) {
  if (!value) return 0;
  const match = value.match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function selectDashboardClasses(
  classes: NonNullable<ReturnType<typeof useStudentClasses>["data"]>,
) {
  const activeClasses = classes.filter(
    (classItem) => classItem.isActive !== false,
  );
  const candidateClasses = activeClasses.length > 0 ? activeClasses : classes;

  if (candidateClasses.length <= 1) {
    return candidateClasses;
  }

  const latestSchoolYearRank = Math.max(
    ...candidateClasses.map((classItem) =>
      getSchoolYearRank(classItem.schoolYear),
    ),
  );
  const scopedClasses = candidateClasses.filter(
    (classItem) =>
      getSchoolYearRank(classItem.schoolYear) === latestSchoolYearRank,
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
        .filter((schedule) =>
          (schedule.days ?? []).some(
            (day) => getDayIndexToken(day) === todayIndex,
          ),
        )
        .map((schedule) => ({
          id: `${classItem.id}-${schedule.id}`,
          classId: classItem.id,
          subjectName:
            classItem.subjectName ||
            classItem.className ||
            classItem.name ||
            "Class",
          teacherName:
            [classItem.teacher?.firstName, classItem.teacher?.lastName]
              .filter(Boolean)
              .join(" ") || "Assigned teacher",
          sectionName: classItem.section?.name || "Assigned section",
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          room: classItem.room,
        })),
    )
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .slice(0, 4);
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

  const refetchEvents = useCallback(
    () => schoolEventsQuery.refetch(),
    [schoolEventsQuery],
  );

  const snapshot = useMemo<SchoolEventsSnapshot>(
    () => ({
      events: schoolEventsQuery.data ?? [],
      error: schoolEventsQuery.error,
      isRefetching: schoolEventsQuery.isRefetching,
    }),
    [
      schoolEventsQuery.data,
      schoolEventsQuery.error,
      schoolEventsQuery.isRefetching,
    ],
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
  onRefreshReady: (
    assessmentId: string,
    refresh: () => Promise<unknown>,
  ) => void;
}) {
  const attemptsQuery = useAssessmentAttempts(assessmentId);

  const refetchAttempts = useCallback(
    () => attemptsQuery.refetch(),
    [attemptsQuery],
  );

  const snapshot = useMemo<AssessmentAttemptSnapshot>(
    () => ({
      attempts: attemptsQuery.data ?? [],
      error: attemptsQuery.error,
      isRefetching: attemptsQuery.isRefetching,
      isResolved:
        attemptsQuery.data !== undefined && attemptsQuery.error == null,
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
  const [assessmentAttemptMap, setAssessmentAttemptMap] = useState<
    Record<string, AssessmentAttemptSnapshot>
  >({});
  const assessmentRefreshersRef = useRef<
    Record<string, () => Promise<unknown>>
  >({});
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
        ...Object.values(assessmentRefreshersRef.current).map((refresh) =>
          refresh(),
        ),
      ]),
    [assessmentsQuery, completionsQuery, lessonsQuery],
  );

  const handleAttemptChange = useCallback(
    (assessmentId: string, snapshot: AssessmentAttemptSnapshot) => {
      setAssessmentAttemptMap((current) => {
        const previous = current[assessmentId];
        if (
          getErrorSignature(previous?.error) ===
            getErrorSignature(snapshot.error) &&
          previous?.isRefetching === snapshot.isRefetching &&
          previous?.isResolved === snapshot.isResolved &&
          JSON.stringify(previous?.attempts ?? []) ===
            JSON.stringify(snapshot.attempts)
        ) {
          return current;
        }

        return {
          ...current,
          [assessmentId]: snapshot,
        };
      });
    },
    [],
  );

  const handleAttemptRemove = useCallback((assessmentId: string) => {
    delete assessmentRefreshersRef.current[assessmentId];
    setAssessmentAttemptMap((current) => {
      if (!(assessmentId in current)) return current;
      const next = { ...current };
      delete next[assessmentId];
      return next;
    });
  }, []);

  const handleAttemptRefreshReady = useCallback(
    (assessmentId: string, refresh: () => Promise<unknown>) => {
      assessmentRefreshersRef.current[assessmentId] = refresh;
    },
    [],
  );

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

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { unreadCount } = useLiveNotifications();
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const profileQuery = useProfile();
  const performanceQuery = usePerformanceSummary();
  const [classDataMap, setClassDataMap] = useState<
    Record<string, ClassDashboardSnapshot>
  >({});
  const classRefreshersRef = useRef<Record<string, () => Promise<unknown>>>({});
  const [schoolEventsSnapshot, setSchoolEventsSnapshot] =
    useState<SchoolEventsSnapshot | null>(null);
  const schoolEventsRefresherRef = useRef<(() => Promise<unknown>) | null>(
    null,
  );
  const dashboardClasses = useMemo(
    () => selectDashboardClasses(classesQuery.data ?? []),
    [classesQuery.data],
  );
  const schoolYear = dashboardClasses[0]?.schoolYear ?? null;

  const classIds = useMemo(
    () => dashboardClasses.map((classItem) => classItem.id),
    [dashboardClasses],
  );

  const handleClassDataChange = useCallback(
    (classId: string, snapshot: ClassDashboardSnapshot) => {
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
    },
    [],
  );

  const handleClassDataRemove = useCallback((classId: string) => {
    delete classRefreshersRef.current[classId];
    setClassDataMap((current) => {
      if (!(classId in current)) return current;
      const next = { ...current };
      delete next[classId];
      return next;
    });
  }, []);

  const handleClassRefreshReady = useCallback(
    (classId: string, refresh: () => Promise<unknown>) => {
      classRefreshersRef.current[classId] = refresh;
    },
    [],
  );

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

  const handleSchoolEventsChange = useCallback(
    (snapshot: SchoolEventsSnapshot) => {
      setSchoolEventsSnapshot((current) => {
        if (
          current &&
          getErrorSignature(current.error) ===
            getErrorSignature(snapshot.error) &&
          current.isRefetching === snapshot.isRefetching &&
          JSON.stringify(current.events) === JSON.stringify(snapshot.events)
        ) {
          return current;
        }

        return snapshot;
      });
    },
    [],
  );

  const handleSchoolEventsRefreshReady = useCallback(
    (refresh: () => Promise<unknown>) => {
      schoolEventsRefresherRef.current = refresh;
    },
    [],
  );

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
          performanceQuery.data?.classes.find(
            (entry) => entry.classId === classItem.id,
          ),
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

  const continueLearning = useMemo(
    () => findContinueLearning(subjects, lessonMap),
    [lessonMap, subjects],
  );
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
    const subjectByClassId = new Map(
      subjects.map((subject) => [subject.id, subject]),
    );
    const actionableItems: PendingAssessmentItem[] = [];
    let unresolvedCount = 0;

    Object.values(classDataMap).forEach((entry) => {
      entry.assessments
        .filter((assessment) => assessment.isPublished)
        .forEach((assessment) => {
          const subject = subjectByClassId.get(assessment.classId);
          if (!subject) return;

          const attemptSnapshot = entry.assessmentAttempts[assessment.id];
          if (
            !attemptSnapshot ||
            !attemptSnapshot.isResolved ||
            attemptSnapshot.error
          ) {
            unresolvedCount += 1;
            return;
          }

          const card = toAssessmentCard(
            assessment,
            subject,
            attemptSnapshot.attempts,
          );
          if (card.status === "completed") {
            return;
          }

          actionableItems.push({
            assessment,
            subject,
            dueTime: assessment.dueDate
              ? new Date(assessment.dueDate).getTime()
              : Number.POSITIVE_INFINITY,
            status: card.status,
          });
        });
    });

    return {
      items: actionableItems
        .sort((left, right) => left.dueTime - right.dueTime)
        .slice(0, 4),
      unresolvedCount,
    };
  }, [classDataMap, subjects]);

  const pendingAssessments = pendingAssessmentState.items;
  const pendingAssessmentStatusCount = pendingAssessmentState.unresolvedCount;
  const hasPendingAssessmentSync = pendingAssessmentStatusCount > 0;
  const todaySchedule = useMemo(
    () => buildTodaySchedule(dashboardClasses),
    [dashboardClasses],
  );
  const schoolEvents = schoolEventsSnapshot?.events ?? [];

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Student";
  const firstName = user?.firstName || fullName;
  const profileReadiness = computeProfileReadiness({
    phone: profileQuery.data?.phone,
    address: profileQuery.data?.address,
    familyName: profileQuery.data?.familyName,
    familyContact: profileQuery.data?.familyContact,
    profilePicture:
      profileQuery.data?.profilePicture || user?.profilePicture || null,
  });
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

  const upcomingTimeline = useMemo(
    () =>
      buildUpcomingTimeline(todaySchedule, pendingAssessments, schoolEvents),
    [pendingAssessments, schoolEvents, todaySchedule],
  );

  return (
    <StudentHomeView
      navigation={navigation}
      bridges={
        <>
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
        </>
      }
      firstName={firstName}
      unreadCount={unreadCount}
      profileReadiness={profileReadiness}
      pendingAssessments={pendingAssessments}
      pendingAssessmentStatusCount={pendingAssessmentStatusCount}
      hasPendingAssessmentSync={hasPendingAssessmentSync}
      todaySchedule={todaySchedule}
      continueLearning={continueLearning}
      recentLessons={recentLessons}
      latestUpdate={
        schoolEvents[0]
          ? {
              id: schoolEvents[0].id,
              title: schoolEvents[0].title,
              subtitle: formatEventDate(
                schoolEvents[0].startsAt,
                schoolEvents[0].allDay,
              ),
            }
          : upcomingTimeline[0]
      }
      refreshing={refreshing}
      onRefresh={handleRefresh}
      errorMessage={
        primaryError ? peekAppError(primaryError).message : undefined
      }
    />
  );
}

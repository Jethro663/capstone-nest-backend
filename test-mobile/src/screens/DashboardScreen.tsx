import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import {
  AnimatedEntrance,
  Card,
  EmptyState,
  FloatingIconButton,
  GradientHeader,
  Pill,
  ProgressBar,
  Refreshable,
  ScreenScroll,
  SectionTitle,
  StatCard,
} from "../components/ui/primitives";
import { toAppError } from "../api/http";
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
import { computeProfileReadiness } from "./screen-flow";
import { colors, gradients } from "../theme/tokens";
import type { Assessment, AssessmentAttempt } from "../types/assessment";
import type { Lesson, LessonCompletion } from "../types/lesson";
import type { SchoolEvent } from "../types/school-event";

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

function formatDueDate(value?: string | null) {
  if (!value) return "No due date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
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

function buildTodaySchedule(classes: NonNullable<ReturnType<typeof useStudentClasses>["data"]>, now = new Date()): ScheduleEntry[] {
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
        })),
    )
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .slice(0, 4);
}

type AssessmentAttemptSnapshot = {
  attempts: AssessmentAttempt[];
  error: unknown;
  isRefetching: boolean;
  isResolved: boolean;
};

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

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const profileQuery = useProfile();
  const performanceQuery = usePerformanceSummary();
  const [classDataMap, setClassDataMap] = useState<Record<string, ClassDashboardSnapshot>>({});
  const classRefreshersRef = useRef<Record<string, () => Promise<unknown>>>({});
  const [schoolEventsSnapshot, setSchoolEventsSnapshot] = useState<SchoolEventsSnapshot | null>(null);
  const schoolEventsRefresherRef = useRef<(() => Promise<unknown>) | null>(null);
  const dashboardClasses = useMemo(
    () => selectDashboardClasses(classesQuery.data ?? []),
    [classesQuery.data],
  );
  const schoolYear = dashboardClasses[0]?.schoolYear ?? null;

  const classIds = useMemo(
    () => dashboardClasses.map((classItem) => classItem.id),
    [dashboardClasses],
  );
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
      subjects.flatMap((subject) =>
        (lessonMap[subject.id] ?? [])
          .filter((lesson) => lesson.status !== "locked")
          .map((lesson) => ({ ...lesson, subject })),
      ).slice(0, 4),
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

  const upcomingEvents = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return (schoolEventsSnapshot?.events ?? [])
      .filter((event) => {
        const endTime = new Date(event.endsAt).getTime();
        return Number.isFinite(endTime) ? endTime >= startOfToday.getTime() : true;
      })
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
      .slice(0, 4);
  }, [schoolEventsSnapshot?.events]);

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
      ...(schoolEventsRefresherRef.current ? [schoolEventsRefresherRef.current()] : []),
      ...Object.values(classRefreshersRef.current).map((refresh) => refresh()),
    ]);
  };

  const profileCueComplete = profileReadiness >= 100;

  return (
    <ScreenScroll refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}>
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
      <GradientHeader
        colors={gradients.assessments}
        eyebrow={`Ready for today, ${firstName}?`}
        title="Student Home"
        rightContent={<FloatingIconButton icon="refresh" onPress={handleRefresh} />}
      >
        <View
          style={{
            marginTop: 18,
            borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.18)",
            padding: 16,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 12, fontWeight: "800" }}>Profile and learning snapshot</Text>
          <Text style={{ marginTop: 6, color: colors.white, fontSize: 24, fontWeight: "900" }}>
            {hasPendingAssessmentSync && pendingAssessments.length === 0
              ? `Checking ${pendingAssessmentStatusCount} assessment status${pendingAssessmentStatusCount === 1 ? "" : "es"}`
              : `${pendingAssessments.length} task${pendingAssessments.length === 1 ? "" : "s"} still need attention`}
          </Text>
          <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.88)", fontSize: 12, lineHeight: 18 }}>
            {hasPendingAssessmentSync
              ? "We&apos;re syncing your latest assessment submissions before finalizing what still needs attention."
              : "Keep your streak moving by finishing the next lesson, checking today&apos;s schedule, and clearing due work."}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={() => {
                const nextClassId = continueLearning[0]?.subject.id ?? dashboardClasses[0]?.id;
                if (nextClassId) {
                  navigation.navigate("ClassWorkspace", { classId: nextClassId });
                } else {
                  navigation.navigate("Classes");
                }
              }}
              style={{
                flex: 1,
                borderRadius: 18,
                backgroundColor: colors.white,
                alignItems: "center",
                paddingVertical: 13,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>Continue Learning</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Profile")}
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.38)",
                paddingHorizontal: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>
                {profileCueComplete ? "View Profile" : "Complete Profile"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <StatCard icon="book-open-page-variant" iconColor={colors.white} value={dashboardClasses.length} label="Classes" translucent />
          <StatCard icon="chart-line" iconColor={colors.white} value={`${averageScore}%`} label="Average" translucent />
          <StatCard icon="account-check" iconColor={colors.white} value={`${profileReadiness}%`} label="Profile" translucent />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 18 }}>
        {primaryError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>Some dashboard data could not load</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(primaryError).message}
            </Text>
          </Card>
        ) : null}

        <AnimatedEntrance>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "900", color: colors.text }}>
                  {profileCueComplete ? "Profile is classroom ready" : "Complete your learner profile"}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                  {profileCueComplete
                    ? `${fullName} has the key contact and guardian fields filled in.`
                    : "Add your phone, address, and guardian details so class updates and support outreach stay accurate."}
                </Text>
              </View>
              <Pill
                label={profileCueComplete ? "Ready" : `${profileReadiness}%`}
                backgroundColor={profileCueComplete ? colors.paleGreen : colors.paleAmber}
                color={profileCueComplete ? colors.green : colors.orange}
              />
            </View>
            <View style={{ marginTop: 14 }}>
              <ProgressBar
                value={profileReadiness}
                color={profileCueComplete ? colors.green : colors.orange}
                trackColor="#EEF2F7"
                height={10}
              />
            </View>
          </Card>
        </AnimatedEntrance>

        <View>
          <SectionTitle
            title="Continue Learning"
            right={
              <Pill
                label={`${continueLearning.length || recentLessons.length} live`}
                backgroundColor={colors.paleIndigo}
                color={colors.indigo}
              />
            }
          />
          {continueLearning.length === 0 ? (
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>No active lesson cue yet.</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                Open your classes tab to start the next lesson and build a continuation card here.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              {continueLearning.map(({ lesson, subject }, index) => (
                <AnimatedEntrance key={lesson.id} delay={index * 80}>
                  <Pressable onPress={() => navigation.navigate("ClassWorkspace", { classId: subject.id })}>
                    <Card>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: subject.bgColor,
                          }}
                        >
                          <Text style={{ fontSize: 24 }}>{subject.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSecondary }}>{subject.name}</Text>
                          <Text style={{ marginTop: 2, fontSize: 15, fontWeight: "900", color: colors.text }}>{lesson.title}</Text>
                          <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>{lesson.description}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right-circle" size={24} color={subject.color} />
                      </View>
                    </Card>
                  </Pressable>
                </AnimatedEntrance>
              ))}
            </View>
          )}
        </View>

        <View>
          <SectionTitle
            title="Today's Schedule"
            right={
              <Pill
                label={todaySchedule.length ? `${todaySchedule.length} blocks` : "No classes"}
                backgroundColor={colors.paleBlue}
                color={colors.blueDeep}
              />
            }
          />
          {todaySchedule.length === 0 ? (
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>No scheduled classes today.</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                Use the time to finish lessons, review announcements, or update your profile.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {todaySchedule.map((entry, index) => (
                <AnimatedEntrance key={entry.id} delay={index * 70}>
                  <Pressable onPress={() => navigation.navigate("ClassWorkspace", { classId: entry.classId })}>
                    <Card>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 14,
                            backgroundColor: colors.paleAmber,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MaterialCommunityIcons name="clock-outline" size={20} color={colors.orange} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{entry.subjectName}</Text>
                          <Text style={{ marginTop: 2, fontSize: 12, color: colors.textSecondary }}>
                            {formatClock(entry.startTime)} - {formatClock(entry.endTime)} • {entry.sectionName}
                          </Text>
                          <Text style={{ marginTop: 4, fontSize: 11, color: colors.muted }}>{entry.teacherName}</Text>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                </AnimatedEntrance>
              ))}
            </View>
          )}
        </View>

        <View>
          <SectionTitle
            title="Pending Assessments"
            right={
              <Pill
                label={hasPendingAssessmentSync && pendingAssessments.length === 0 ? "Syncing" : `${pendingAssessments.length} due`}
                backgroundColor={colors.paleRed}
                color={colors.red}
              />
            }
          />
          {pendingAssessments.length === 0 && hasPendingAssessmentSync ? (
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Checking assessment submissions</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                We&apos;re verifying {pendingAssessmentStatusCount} assessment status{pendingAssessmentStatusCount === 1 ? "" : "es"} before listing what is still due.
              </Text>
            </Card>
          ) : pendingAssessments.length === 0 ? (
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>No published assessments right now.</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                New quizzes and tasks will appear here as teachers publish them.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {pendingAssessments.map(({ assessment, subject }, index) => (
                <AnimatedEntrance key={assessment.id} delay={index * 70}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate("AssessmentDetail", {
                        assessmentId: assessment.id,
                        classId: assessment.classId,
                      })
                    }
                  >
                    <Card>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            backgroundColor: colors.paleRed,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={colors.red} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{assessment.title}</Text>
                          <Text style={{ marginTop: 2, fontSize: 12, color: colors.textSecondary }}>
                            {subject?.name || "Assigned class"} • Due {formatDueDate(assessment.dueDate)}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
                      </View>
                    </Card>
                  </Pressable>
                </AnimatedEntrance>
              ))}
            </View>
          )}
        </View>

        <View>
          <SectionTitle
            title="Recent Lessons"
            right={
              <Pill
                label={`${recentLessons.length} ready`}
                backgroundColor={colors.paleGreen}
                color={colors.green}
              />
            }
          />
          {recentLessons.length === 0 ? (
            <EmptyState
              emoji="📚"
              title="No lessons available yet"
              subtitle="When your classes publish lesson content, the newest lessons will show up here."
            />
          ) : (
            <View style={{ gap: 10 }}>
              {recentLessons.map(({ id, title, description, duration, subject }, index) => (
                <AnimatedEntrance key={id} delay={index * 70}>
                  <Pressable onPress={() => navigation.navigate("ClassWorkspace", { classId: subject.id })}>
                    <Card>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            backgroundColor: subject.bgColor,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 22 }}>{subject.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{title}</Text>
                          <Text style={{ marginTop: 2, fontSize: 12, color: colors.textSecondary }}>
                            {subject.name} • {duration}
                          </Text>
                          <Text style={{ marginTop: 4, fontSize: 11, color: colors.muted }}>{description}</Text>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                </AnimatedEntrance>
              ))}
            </View>
          )}
        </View>

        <View style={{ marginBottom: 8 }}>
          <SectionTitle
            title="School Events"
            right={
              <Pill
                label={upcomingEvents.length ? `${upcomingEvents.length} upcoming` : "Stay tuned"}
                backgroundColor={colors.palePurple}
                color={colors.purpleDeep}
              />
            }
          />
          {upcomingEvents.length === 0 ? (
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>No school events yet.</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                Upcoming notices from the school calendar will appear here when they are scheduled.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {upcomingEvents.map((event, index) => (
                <AnimatedEntrance key={event.id} delay={index * 70}>
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: event.eventType === "holiday_break" ? colors.paleGreen : colors.palePurple,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialCommunityIcons
                          name={event.eventType === "holiday_break" ? "palm-tree" : "calendar-star"}
                          size={20}
                          color={event.eventType === "holiday_break" ? colors.green : colors.purpleDeep}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{event.title}</Text>
                        <Text style={{ marginTop: 2, fontSize: 12, color: colors.textSecondary }}>
                          {formatEventDate(event.startsAt, event.allDay)}
                        </Text>
                        <Text style={{ marginTop: 4, fontSize: 11, color: colors.muted }}>
                          {event.location || event.description || "School-wide notice"}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </AnimatedEntrance>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScreenScroll>
  );
}

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
<<<<<<< Updated upstream
import { Animated, AppState, Easing, Image, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notificationsApi } from "../api/services/notifications";
import { rootNavigationRef } from "../navigation/navigation-ref";
import { resolveMobileRole } from "../navigation/role-resolver";
import { colors, hexToRgba, radii, shadow } from "../theme/tokens";
=======
import { io, type Socket } from "socket.io-client";
import { AppState, Platform } from "react-native";
import { getAccessToken } from "../api/client";
import { SOCKET_ORIGIN } from "../api/config";
import { assessmentsApi } from "../api/services/assessments";
import { classesApi } from "../api/services/classes";
import { lxpApi } from "../api/services/lxp";
import { notificationsApi } from "../api/services/notifications";
import { rootNavigationRef } from "../navigation/navigation-ref";
import { resolveMobileRole } from "../navigation/role-resolver";
import type { Assessment, AssessmentAttempt } from "../types/assessment";
import type { ClassItem } from "../types/class";
import type { LxpPathSummary } from "../types/lxp";
>>>>>>> Stashed changes
import type { MobileNotification } from "../types/notification";
import {
  getMobileNotificationMessage,
  isMobileInterventionAlertNotification,
  openMobileNotification,
} from "../utils/mobile-notification-routing";
import { useAuth } from "./AuthProvider";

<<<<<<< Updated upstream
const INTERVENTION_TERMS = [
  "intervention",
  "at risk",
  "at-risk",
  "flagged",
  "learners path",
  "support plan",
  "checklist",
];
const ASSESSMENT_TYPES = new Set(["assessment_assigned", "assessment_due", "assessment_graded"]);
const NOTIFICATION_POLL_MS = 4000;
const AUTO_DISMISS_MS = 7800;
=======
const BLUE_REMINDER_TYPES = new Set(["student_pending_task_reminder", "student_pending_intervention_reminder"]);
const NOTIFICATION_POLL_MS = 4000;
const STUDENT_REMINDER_POLL_MS = 60_000;
const TEACHER_REMINDER_POLL_MS = 60_000;
const LOCAL_REMINDER_BUCKET_MS = 5 * 60 * 1000;
const STUDENT_REMINDER_CLASS_LIMIT = 6;
const STUDENT_REMINDER_ASSESSMENT_LIMIT = 16;
>>>>>>> Stashed changes
const NATIVE_NOTIFICATION_CHANNEL_ID = "nexora-live";
const NATIVE_NOTIFICATION_PREFIX = "nexora-notification";
const NOTIFICATION_TAP_RETRY_MS = 320;

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
} catch {
  // Expo notifications can be unavailable in lightweight test/runtime shells.
}

<<<<<<< Updated upstream
type LiveNotificationContextValue = {
  unreadCount: number;
  dismissActive: () => void;
};

const LiveNotificationContext = createContext<LiveNotificationContextValue | undefined>(undefined);

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

=======
>>>>>>> Stashed changes
function messageFromNotification(notification: Pick<MobileNotification, "message" | "body">) {
  return getMobileNotificationMessage(notification);
}

function readPayloadString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function notificationToNativeData(notification: MobileNotification, role: string | null) {
  return {
    source: NATIVE_NOTIFICATION_PREFIX,
    notificationId: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body || "",
    message: messageFromNotification(notification),
    referenceId: notification.referenceId || "",
    createdAt: notification.createdAt,
    role: role || "",
  };
}

function notificationFromNativeData(data: Record<string, unknown> | undefined): MobileNotification | null {
  if (!data || data.source !== NATIVE_NOTIFICATION_PREFIX) return null;

  const id = readPayloadString(data.notificationId) || readPayloadString(data.id);
  const title = readPayloadString(data.title);
  const type = readPayloadString(data.type);

  if (!id || !title || !type) return null;

  return {
    id,
    userId: readPayloadString(data.userId),
    type,
    title,
    body: readPayloadString(data.body),
    message: readPayloadString(data.message),
    isRead: false,
    referenceId: readPayloadString(data.referenceId) || null,
    createdAt: readPayloadString(data.createdAt) || new Date().toISOString(),
  };
}

<<<<<<< Updated upstream
function isInterventionAlertNotification(
  notification: Pick<MobileNotification, "type" | "title" | "message" | "body">,
) {
  const joined = normalizeText(
    `${notification.type} ${notification.title} ${notification.message ?? ""} ${notification.body ?? ""}`,
  );
  return INTERVENTION_TERMS.some((term) => joined.includes(term));
}

function shouldSurfaceNotificationOnHydration(notification: MobileNotification) {
  return !notification.isRead;
}

function navigateToMainTab(tabName: string) {
  if (!rootNavigationRef.isReady()) return false;
  (rootNavigationRef.navigate as unknown as (name: string, params?: unknown) => void)("MainTabs", { screen: tabName });
  return true;
}

function resolveNotificationNavigation(notification: MobileNotification, role: string | null) {
  const normalizedRole = String(role || "").toLowerCase();
  const referenceId = notification.referenceId || undefined;

  if (isInterventionAlertNotification(notification)) {
    if (normalizedRole === "teacher") {
      return referenceId
        ? () => rootNavigationRef.navigate("TeacherInterventionDetail", { caseId: referenceId })
        : () => rootNavigationRef.navigate("TeacherInterventions", undefined);
    }
    return () => rootNavigationRef.navigate("LXP", { tab: "case" });
  }

  if (ASSESSMENT_TYPES.has(notification.type)) {
    if (normalizedRole === "teacher") {
      return referenceId
        ? () => rootNavigationRef.navigate("TeacherAssessmentDetail", { assessmentId: referenceId })
        : () => navigateToMainTab("Assessments");
    }
    return () => rootNavigationRef.navigate("AssessmentHistory", referenceId ? { assessmentId: referenceId } : undefined);
  }

  if (notification.type === "announcement_posted") {
    if (normalizedRole === "teacher") {
      return () => rootNavigationRef.navigate("TeacherAnnouncements");
    }
    return () => navigateToMainTab("Announcements");
  }

  if (notification.type === "discussion_thread_posted" || notification.type === "discussion_comment_posted") {
    return () => navigateToMainTab("Classes");
  }

  if (notification.type === "grade_updated") {
    if (normalizedRole === "teacher") {
      return () => rootNavigationRef.navigate("TeacherClassRecord");
    }
    return () => rootNavigationRef.navigate("Performance");
  }

  return () => navigateToMainTab(normalizedRole === "teacher" ? "Home" : "Dashboard");
=======
type RealtimeNotificationPayload = {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
  referenceId?: unknown;
  createdAt?: unknown;
};

function getNotificationSeenKeys(notification: Pick<MobileNotification, "id" | "type" | "referenceId">) {
  return notification.id ? [notification.id] : [];
}

function hasSeenNotification(seen: Set<string>, notification: Pick<MobileNotification, "id" | "type" | "referenceId">) {
  return getNotificationSeenKeys(notification).some((key) => seen.has(key));
}

function markNotificationSeen(seen: Set<string>, notification: Pick<MobileNotification, "id" | "type" | "referenceId">) {
  getNotificationSeenKeys(notification).forEach((key) => seen.add(key));
}

function notificationFromRealtimePayload(payload: RealtimeNotificationPayload, userId: string): MobileNotification | null {
  const type = readPayloadString(payload.type);
  const title = readPayloadString(payload.title);
  const referenceId = readPayloadString(payload.referenceId) || null;
  const createdAt = readPayloadString(payload.createdAt) || new Date().toISOString();
  const id = readPayloadString(payload.id) || `${type}:${referenceId || "broadcast"}:${createdAt}`;

  if (!id || !type || !title) return null;

  const body = readPayloadString(payload.body);
  const message = readPayloadString(payload.message) || body;

  return {
    id,
    userId,
    type,
    title,
    body,
    message,
    isRead: false,
    referenceId,
    createdAt,
  };
}

function isLocalReminderId(value: string) {
  return value.startsWith("student-reminder:") || value.startsWith("teacher-reminder:");
}

function isLocalReminderNotification(notification: Pick<MobileNotification, "id" | "type">) {
  return isLocalReminderId(notification.id) || BLUE_REMINDER_TYPES.has(notification.type);
}

function resolveUserId(user: unknown) {
  const record = user as { id?: unknown; userId?: unknown };
  const id = typeof record.id === "string" ? record.id : "";
  const userId = typeof record.userId === "string" ? record.userId : "";
  return id || userId;
}

function reminderDateKey() {
  const now = new Date();
  const bucket = Math.floor(now.getTime() / LOCAL_REMINDER_BUCKET_MS);
  return `${now.toISOString().slice(0, 10)}:${bucket}`;
}

function getClassLabel(classItem: ClassItem) {
  return classItem.subjectName || classItem.subjectCode || classItem.name || classItem.className || "your class";
}

function getAssessmentDueMs(assessment: Assessment) {
  if (!assessment.dueDate) return Number.MAX_SAFE_INTEGER;
  const dueMs = Date.parse(assessment.dueDate);
  return Number.isFinite(dueMs) ? dueMs : Number.MAX_SAFE_INTEGER;
}

function getLatestAttempt(attempts: AssessmentAttempt[]) {
  return [...attempts].sort((left, right) => {
    const leftTime = Date.parse(left.submittedAt || left.startedAt || left.createdAt || "");
    const rightTime = Date.parse(right.submittedAt || right.startedAt || right.createdAt || "");
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  })[0];
}

async function buildStudentPendingTaskReminder(studentId: string): Promise<MobileNotification | null> {
  const classRows = await classesApi.getStudentClasses(studentId).catch(() => [] as ClassItem[]);
  if (classRows.length === 0) return null;

  const batches = await Promise.all(
    classRows.slice(0, STUDENT_REMINDER_CLASS_LIMIT).map(async (classItem) => {
      const assessments = await assessmentsApi.getByClass(classItem.id).catch(() => [] as Assessment[]);
      const published = assessments
        .filter((assessment) => assessment.id && assessment.isPublished !== false)
        .slice(0, STUDENT_REMINDER_ASSESSMENT_LIMIT);

      const statuses = await Promise.all(
        published.map(async (assessment) => {
          const attempts = await assessmentsApi.getStudentAttempts(assessment.id).catch(() => [] as AssessmentAttempt[]);
          return { assessment, classItem, latestAttempt: getLatestAttempt(attempts), dueMs: getAssessmentDueMs(assessment) };
        }),
      );

      return statuses.filter((entry) => !entry.latestAttempt?.isSubmitted);
    }),
  );

  const pending = batches
    .flat()
    .sort((left, right) => left.dueMs - right.dueMs || left.assessment.title.localeCompare(right.assessment.title));

  if (pending.length === 0) return null;

  const first = pending[0];
  const classLabel = getClassLabel(first.classItem);
  const title = pending.length === 1 ? "1 pending task waiting" : String(pending.length) + " pending tasks waiting";
  const message =
    pending.length === 1
      ? first.assessment.title + " in " + classLabel + " is ready. Tap to open your assessments."
      : first.assessment.title + " is next, plus " + String(pending.length - 1) + " more task(s). Tap to open your assessments.";

  return {
    id:
      "student-reminder:pending-task:" +
      studentId +
      ":" +
      reminderDateKey() +
      ":" +
      first.assessment.id +
      ":" +
      String(pending.length),
    userId: studentId,
    type: "student_pending_task_reminder",
    title,
    body: message,
    message,
    isRead: true,
    referenceId: first.assessment.id,
    createdAt: new Date().toISOString(),
  };
}

function getPendingPathCount(path: LxpPathSummary) {
  const explicitPending = Number(path.counts?.pending ?? 0);
  if (explicitPending > 0) return explicitPending;

  const total = Number(path.progress?.totalCheckpoints ?? path.counts?.total ?? 0);
  const completed = Number(path.progress?.completedCheckpoints ?? path.counts?.completed ?? 0);
  return Math.max(0, total - completed);
}

async function buildStudentPendingInterventionReminder(studentId: string): Promise<MobileNotification | null> {
  const eligibility = await lxpApi.getEligibility().catch(() => null);
  const paths = eligibility?.paths || [];
  const pendingPaths = paths
    .map((path) => ({ path, pendingCount: getPendingPathCount(path) }))
    .filter(({ path, pendingCount }) => path.status !== "completed" && pendingCount > 0);

  if (pendingPaths.length === 0) {
    const alerts = await lxpApi.getInterventionAlerts().catch(() => null);
    const assignedAlerts = (alerts?.alerts || []).filter((alert) => alert.hasAssignedPath);
    if (assignedAlerts.length === 0) return null;

    const firstAlert = assignedAlerts[0];
    const subjectLabel = firstAlert.subjectName || firstAlert.subjectCode || "Learners Path";
    const message =
      assignedAlerts.length === 1
        ? subjectLabel + " has an intervention path ready. JA can guide you through it now."
        : subjectLabel + " is ready, plus " + String(assignedAlerts.length - 1) + " more intervention path(s). JA can guide you now.";

    return {
      id:
        "student-reminder:pending-intervention:" +
        studentId +
        ":" +
        reminderDateKey() +
        ":" +
        firstAlert.classId +
        ":alerts:" +
        String(assignedAlerts.length),
      userId: studentId,
      type: "student_pending_intervention_reminder",
      title: "Learners Path needs you",
      body: message,
      message,
      isRead: true,
      referenceId: firstAlert.classId,
      createdAt: new Date().toISOString(),
    };
  }

  const first = pendingPaths[0];
  const totalPending = pendingPaths.reduce((sum, item) => sum + item.pendingCount, 0);
  const subjectLabel = first.path.class?.subjectName || first.path.class?.subjectCode || "Learners Path";
  const message =
    totalPending === 1
      ? subjectLabel + " has 1 pending intervention step. JA can guide you through it now."
      : subjectLabel + " has " + String(first.pendingCount) + " pending step(s), with " + String(totalPending) + " total across your intervention paths.";

  return {
    id:
      "student-reminder:pending-intervention:" +
      studentId +
      ":" +
      reminderDateKey() +
      ":" +
      first.path.classId +
      ":" +
      String(totalPending),
    userId: studentId,
    type: "student_pending_intervention_reminder",
    title: "Learners Path needs you",
    body: message,
    message,
    isRead: true,
    referenceId: first.path.classId,
    createdAt: new Date().toISOString(),
  };
}

async function buildTeacherPendingInterventionReminder(userId: string): Promise<MobileNotification | null> {
  const pending = await lxpApi.getTeacherPendingInterventionCount().catch(() => null);
  const pendingCount = Number(pending?.pendingCount ?? 0);
  if (pendingCount <= 0) return null;

  const classBreakdown = (pending?.classBreakdown || []) as Array<{
    classId?: string | null;
    subjectName?: string | null;
    subjectCode?: string | null;
    pendingCount?: number | null;
  }>;
  const firstClass = classBreakdown.find((entry) => Number(entry.pendingCount ?? 0) > 0);
  const classLabel = firstClass?.subjectName || firstClass?.subjectCode || "your classes";
  const message =
    pendingCount === 1
      ? classLabel + " has 1 learner waiting for intervention review."
      : classLabel + " has intervention work waiting, with " + String(pendingCount) + " learner(s) needing review.";

  return {
    id:
      "teacher-reminder:pending-interventions:" +
      userId +
      ":" +
      reminderDateKey() +
      ":" +
      (firstClass?.classId || "all") +
      ":" +
      String(pendingCount),
    userId,
    type: "teacher_pending_intervention_reminder",
    title: "Intervention queue needs review",
    body: message,
    message,
    isRead: true,
    referenceId: firstClass?.classId || null,
    createdAt: new Date().toISOString(),
  };
>>>>>>> Stashed changes
}

function navigateToNotification(notification: MobileNotification, role: string | null) {
  if (!rootNavigationRef.isReady()) return false;
  const navigate = rootNavigationRef.navigate as unknown as (name: string, params?: unknown) => void;
  void openMobileNotification(notification, role, navigate);
  return true;
}

export function LiveNotificationProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const mountedRef = useRef(true);
  const pollInFlightRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativeReadyRef = useRef(false);
  const nativeDeniedRef = useRef(false);
  const scheduledNativeIdsRef = useRef<Set<string>>(new Set());
  const pendingNativeOpenRef = useRef<MobileNotification | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const role = resolveMobileRole(user?.roles);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
<<<<<<< Updated upstream
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
=======
      socketRef.current?.disconnect();
      socketRef.current = null;
>>>>>>> Stashed changes
    };
  }, []);

  const ensureNativeNotificationsReady = useCallback(async () => {
    if (nativeReadyRef.current) return true;
    if (nativeDeniedRef.current) return false;

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(NATIVE_NOTIFICATION_CHANNEL_ID, {
          name: "Nexora live alerts",
          importance: Notifications.AndroidImportance.HIGH,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: [0, 260, 120, 260],
          lightColor: "#E3062C",
          enableVibrate: true,
          showBadge: true,
        });
      }

      const current = await Notifications.getPermissionsAsync();
      let status = current.status;

      if (status !== "granted" && current.canAskAgain !== false) {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }

      const granted = status === "granted";
      nativeReadyRef.current = granted;
      nativeDeniedRef.current = !granted;
      return granted;
    } catch {
      nativeDeniedRef.current = true;
      return false;
    }
  }, []);

  const scheduleNativeNotification = useCallback(
    async (notification: MobileNotification) => {
      if (scheduledNativeIdsRef.current.has(notification.id)) return;

      const ready = await ensureNativeNotificationsReady();
      if (!ready) return;

      scheduledNativeIdsRef.current.add(notification.id);
      const interventionAlert = isMobileInterventionAlertNotification(notification);

      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `${NATIVE_NOTIFICATION_PREFIX}:${notification.id}`,
          content: {
            title: interventionAlert ? `JA alert: ${notification.title}` : notification.title,
            body: messageFromNotification(notification),
            data: notificationToNativeData(notification, role),
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            color: interventionAlert ? "#BE123C" : "#0F172A",
            vibrate: interventionAlert ? [0, 280, 120, 280] : [0, 180],
            autoDismiss: true,
          },
          trigger: Platform.OS === "android" ? { channelId: NATIVE_NOTIFICATION_CHANNEL_ID } : null,
        });
      } catch {
        scheduledNativeIdsRef.current.delete(notification.id);
      }
    },
    [ensureNativeNotificationsReady, role],
  );

  const openOrDeferNativeNotification = useCallback(
    (notification: MobileNotification) => {
      setUnreadCount((current) => Math.max(0, current - 1));
      void notificationsApi.markRead(notification.id).catch(() => {
        // Keep the tap path resilient even if the read-state request is interrupted.
      });

      if (navigateToNotification(notification, role)) {
        pendingNativeOpenRef.current = null;
        return;
      }

      pendingNativeOpenRef.current = notification;
      setTimeout(() => {
        const pending = pendingNativeOpenRef.current;
        if (pending && navigateToNotification(pending, role)) {
          pendingNativeOpenRef.current = null;
        }
      }, NOTIFICATION_TAP_RETRY_MS);
    },
    [role],
  );

<<<<<<< Updated upstream
  const tryShowNext = useCallback(() => {
    if (activeRef.current || queueRef.current.length === 0) return;
    const next = queueRef.current.shift() ?? null;
    if (!next) return;
    activeRef.current = next;
    setActiveNotification(next);
  }, []);

  const dismissActive = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: -120,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (!mountedRef.current) return;
      activeRef.current = null;
      setActiveNotification(null);
    });
  }, [opacity, slide]);

  const openNotification = useCallback(
    (notification: MobileNotification) => {
      if (!rootNavigationRef.isReady()) {
        pendingNativeOpenRef.current = notification;
        dismissActive();
        return;
      }

      setUnreadCount((current) => (notification.isRead ? current : Math.max(0, current - 1)));
      void notificationsApi.markRead(notification.id).catch(() => {
        // Navigation matters more than a transient read-state failure.
      });

      dismissActive();
      setTimeout(() => {
        navigateToNotification(notification, role);
      }, 230);
    },
    [dismissActive, role],
  );

  useEffect(() => {
    if (!activeNotification) {
      tryShowNext();
      return;
    }

    const interventionAlert = isInterventionAlertNotification(activeNotification);
    slide.setValue(-120);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.back(0.8)),
        useNativeDriver: true,
      }),
    ]).start();

    if (interventionAlert) {
      pulse.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1250,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1250,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      autoDismissTimerRef.current = setTimeout(() => {
        dismissActive();
      }, AUTO_DISMISS_MS + 2600);

      return () => {
        loop.stop();
        pulse.stopAnimation(() => pulse.setValue(0));
        if (autoDismissTimerRef.current) {
          clearTimeout(autoDismissTimerRef.current);
          autoDismissTimerRef.current = null;
        }
      };
    }

    autoDismissTimerRef.current = setTimeout(() => {
      dismissActive();
    }, AUTO_DISMISS_MS);

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [activeNotification, dismissActive, opacity, pulse, slide, tryShowNext]);
=======
  const clearLocalReminderSeenKeys = useCallback(() => {
    seenIdsRef.current.forEach((key) => {
      if (isLocalReminderId(key)) {
        seenIdsRef.current.delete(key);
      }
    });
  }, []);

  const enqueueLiveNotification = useCallback(
    (notification: MobileNotification) => {
      if (!notification.id || hasSeenNotification(seenIdsRef.current, notification)) return false;
      markNotificationSeen(seenIdsRef.current, notification);
      void scheduleNativeNotification(notification);
      return true;
    },
    [scheduleNativeNotification],
  );

  const syncStudentReminderNotifications = useCallback(async () => {
    if (!isAuthenticated || role !== "student" || studentReminderInFlightRef.current) return;

    const studentId = resolveUserId(user);
    if (!studentId) return;

    studentReminderInFlightRef.current = true;
    try {
      const [taskReminder, interventionReminder] = await Promise.all([
        buildStudentPendingTaskReminder(studentId).catch(() => null),
        buildStudentPendingInterventionReminder(studentId).catch(() => null),
      ]);

      if (taskReminder) enqueueLiveNotification(taskReminder);
      if (interventionReminder) enqueueLiveNotification(interventionReminder);
    } catch {
      // Local reminders should never interrupt the core notification stream.
    } finally {
      studentReminderInFlightRef.current = false;
    }
  }, [enqueueLiveNotification, isAuthenticated, role, user]);

  const syncTeacherReminderNotifications = useCallback(async () => {
    if (!isAuthenticated || role !== "teacher" || teacherReminderInFlightRef.current) return;

    const teacherId = resolveUserId(user);
    if (!teacherId) return;

    teacherReminderInFlightRef.current = true;
    try {
      const interventionReminder = await buildTeacherPendingInterventionReminder(teacherId).catch(() => null);
      if (interventionReminder) enqueueLiveNotification(interventionReminder);
    } catch {
      // Teacher reminders should never interrupt the core notification stream.
    } finally {
      teacherReminderInFlightRef.current = false;
    }
  }, [enqueueLiveNotification, isAuthenticated, role, user]);
>>>>>>> Stashed changes

  const pollNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id || pollInFlightRef.current) return;

    pollInFlightRef.current = true;
    try {
      const [listResponse, unread] = await Promise.all([
        notificationsApi.getAll({ limit: 25 }),
        notificationsApi.getUnreadCount(),
      ]);

      if (!mountedRef.current) return;
      setUnreadCount(Math.max(0, Number(unread?.count ?? 0)));

      const rows = Array.isArray(listResponse.data) ? listResponse.data : [];
      if (!hydratedRef.current) {
        rows.forEach((row) => {
          seenIdsRef.current.add(row.id);
        });
        hydratedRef.current = true;
<<<<<<< Updated upstream
        queueRef.current.push(...urgentUnread);
        urgentUnread.forEach((row) => {
          void scheduleNativeNotification(row);
        });
        tryShowNext();
=======
>>>>>>> Stashed changes
        return;
      }

      const fresh = rows.filter((row) => !row.isRead && !seenIdsRef.current.has(row.id));
      if (fresh.length === 0) return;

      const orderedFresh = [...fresh].sort((left, right) => {
        const leftTs = Date.parse(left.createdAt);
        const rightTs = Date.parse(right.createdAt);
        return leftTs - rightTs;
      });

      orderedFresh.forEach((row) => {
<<<<<<< Updated upstream
        seenIdsRef.current.add(row.id);
        queueRef.current.push(row);
        void scheduleNativeNotification(row);
=======
        enqueueLiveNotification(row);
>>>>>>> Stashed changes
      });
    } catch {
      // Keep UI resilient and skip transient notification failures.
    } finally {
      pollInFlightRef.current = false;
    }
<<<<<<< Updated upstream
  }, [isAuthenticated, scheduleNativeNotification, tryShowNext, user?.id]);
=======
  }, [enqueueLiveNotification, isAuthenticated, user?.id]);
>>>>>>> Stashed changes

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      seenIdsRef.current = new Set();
      hydratedRef.current = false;
      scheduledNativeIdsRef.current = new Set();
      pendingNativeOpenRef.current = null;
      setUnreadCount(0);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    void pollNotifications();
    pollTimerRef.current = setInterval(() => {
      void pollNotifications();
    }, NOTIFICATION_POLL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isAuthenticated, pollNotifications, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if ((previousState === "background" || previousState === "inactive") && nextState === "active") {
        void pollNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, pollNotifications, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    void ensureNativeNotificationsReady();

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const notification = notificationFromNativeData(response.notification.request.content.data);
      if (!notification) return;
      openOrDeferNativeNotification(notification);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        handleResponse(response);
        if (typeof Notifications.clearLastNotificationResponseAsync === "function") {
          return Notifications.clearLastNotificationResponseAsync();
        }
        return undefined;
      })
      .catch(() => {
        // Missing or stale launch notifications should not block the app shell.
      });

    return () => {
      subscription.remove();
    };
  }, [ensureNativeNotificationsReady, isAuthenticated, openOrDeferNativeNotification, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || nativeDeniedRef.current) return;

    void Notifications.setBadgeCountAsync(Math.max(0, unreadCount)).catch(() => {
      // Some Android launchers do not support badges; the in-app count remains authoritative.
    });
  }, [isAuthenticated, unreadCount]);

  useEffect(() => {
    const pending = pendingNativeOpenRef.current;
    if (pending && navigateToNotification(pending, role)) {
      pendingNativeOpenRef.current = null;
    }
  }, [role]);

  const value = useMemo(
    () => ({
      unreadCount,
      dismissActive: () => undefined,
    }),
    [unreadCount],
  );

  return (
    <LiveNotificationContext.Provider value={value}>
<<<<<<< Updated upstream
      <View style={{ flex: 1 }}>
        {children}
        {activeNotification ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              top: insets.top + 8,
              left: 10,
              right: 10,
              zIndex: 1000,
              elevation: 1000,
            }}
          >
            <Animated.View
              style={[
                {
                  borderRadius: radii.xxl,
                  borderWidth: 1,
                  borderColor: interventionAlert ? hexToRgba("#BE123C", 0.44) : hexToRgba("#1E293B", 0.18),
                  backgroundColor: interventionAlert ? "#FFF4F4" : colors.white,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  opacity,
                  elevation: 22,
                  transform: [{ translateY: slide }],
                },
                shadow.card,
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1, paddingRight: 78 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        borderRadius: 999,
                        backgroundColor: interventionAlert ? hexToRgba("#BE123C", 0.13) : hexToRgba("#4A8CF5", 0.12),
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "900",
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          color: interventionAlert ? "#9F1239" : colors.blueDeep,
                        }}
                      >
                        {interventionAlert ? "Intervention alert" : "Nexora push"}
                      </Text>
                    </View>
                    {unreadCount > 0 ? (
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSecondary }}>
                        {unreadCount > 99 ? "99+" : unreadCount} unread
                      </Text>
                    ) : null}
                  </View>

                  <Text style={{ marginTop: 8, fontSize: 14, fontWeight: "900", color: colors.text }}>
                    {activeNotification.title}
                  </Text>
                  <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>{message}</Text>

                  <View style={{ marginTop: 11, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable
                      onPress={dismissActive}
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: hexToRgba("#0F172A", 0.16),
                        backgroundColor: colors.white,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.text }}>Dismiss</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openNotification(activeNotification)}
                      style={{
                        borderRadius: 14,
                        backgroundColor: interventionAlert ? "#BE123C" : "#0F172A",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.white }}>
                        View now
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: 4,
                    bottom: -3,
                    transform: [{ translateY: pulseTranslate }],
                  }}
                >
                  <Image
                    source={interventionAlert ? interventionCharacterSource() : notificationCharacterSource()}
                    resizeMode="contain"
                    style={{ width: 84, height: 84, opacity: interventionAlert ? 0.95 : 0.9 }}
                  />
                </Animated.View>
              </View>
            </Animated.View>
          </View>
        ) : null}
      </View>
=======
      {children}
>>>>>>> Stashed changes
    </LiveNotificationContext.Provider>
  );
}

export function useLiveNotifications() {
  const context = useContext(LiveNotificationContext);
  if (!context) {
    throw new Error("useLiveNotifications must be used within LiveNotificationProvider");
  }
  return context;
}

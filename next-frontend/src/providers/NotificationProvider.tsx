'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/providers/AuthProvider';
import { getAccessToken } from '@/lib/api-client';
import { getBrowserSocketOrigin } from '@/lib/api-origin';
import {
  dismissNotificationToastLane,
  showLiveNotificationToast,
  showNotificationDigestToast,
} from '@/components/notifications/LiveNotificationToast';
import {
  isTrackedExtractionTerminalStatus,
  readAllTrackedExtractionNotifications,
  upsertTrackedExtractionNotification,
} from '@/lib/extraction-notification-tracker';
import {
  isInterventionAlertNotification,
  resolveNotificationDestination,
} from '@/lib/notification-routing';
import {
  evaluateNotificationBacklogPresentation,
  getNotificationSurfaceStorageKey,
  readNotificationSurfaceState,
  writeNotificationSurfaceState,
  type NotificationBacklogPresentation,
  type NotificationSurfaceState,
} from '@/lib/notification-surface-policy';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { extractionService } from '@/services/extraction-service';
import { lxpService } from '@/services/lxp-service';
import { profileService } from '@/services/profile-service';
import {
  normalizeNotification,
  notificationService,
} from '@/services/notification-service';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { ExtractionStatus } from '@/types/extraction';
import type { LxpPathSummary } from '@/types/lxp';
import type { Notification } from '@/types/notification';

const DISCONNECTED_NOTIFICATION_POLL_MS = 60_000;
const CONNECTED_NOTIFICATION_POLL_MS = 5 * 60_000;
const EXTRACTION_STATUS_POLL_MS = 10_000;
const STUDENT_REMINDER_POLL_MS = 5 * 60_000;
const STUDENT_REMINDER_CLASS_LIMIT = 6;
const FOCUS_SYNC_STALE_MS = 30_000;
const LIVE_NOTIFICATION_BURST_MS = 750;

type NotificationSyncReason = 'hydrate' | 'focus' | 'reconnect' | 'safety' | 'manual';

type PendingAssessmentReminder = {
  assessment: Assessment;
  classItem: ClassItem;
  dueMs: number;
};

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function isStudentRole(role: string | null | undefined) {
  return normalizeText(role).includes('student');
}

function reminderDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getClassLabel(classItem: ClassItem) {
  return classItem.subjectName || classItem.subjectCode || classItem.name || classItem.className || 'your class';
}

function getAssessmentDueMs(assessment: Assessment) {
  if (!assessment.dueDate) return Number.MAX_SAFE_INTEGER;
  const dueMs = Date.parse(assessment.dueDate);
  return Number.isFinite(dueMs) ? dueMs : Number.MAX_SAFE_INTEGER;
}

function isPublishedPendingAssessment(assessment: Assessment, submittedAssessmentIds: Set<string>) {
  return Boolean(assessment.id) && assessment.isPublished !== false && !submittedAssessmentIds.has(assessment.id);
}

function getSubmittedAssessmentIds(history: unknown) {
  const rows = Array.isArray(history) ? history : [];
  return new Set(
    rows
      .filter((entry) => {
        const item = entry as { assessmentId?: unknown; isSubmitted?: unknown; submittedAt?: unknown };
        return Boolean(item.assessmentId) && (item.isSubmitted === true || Boolean(item.submittedAt));
      })
      .map((entry) => String((entry as { assessmentId: unknown }).assessmentId)),
  );
}

async function buildStudentPendingTaskReminder(studentId: string): Promise<Notification | null> {
  const [classesRes, historyRes] = await Promise.all([
    classService.getByStudent(studentId, 'active').catch(() => classService.getByStudent(studentId, 'all')),
    profileService
      .getAssessmentHistory({ page: 1, limit: 100, submission: 'submitted' })
      .catch(() => null),
  ]);

  const classRows = Array.isArray(classesRes.data) ? classesRes.data : [];
  if (classRows.length === 0) return null;

  const submittedAssessmentIds = getSubmittedAssessmentIds(historyRes?.data);
  const batches = await Promise.all(
    classRows.slice(0, STUDENT_REMINDER_CLASS_LIMIT).map(async (classItem) => {
      try {
        const assessmentsRes = await assessmentService.getByClass(classItem.id, { status: 'all', limit: 50 });
        return assessmentsRes.data
          .filter((assessment) => isPublishedPendingAssessment(assessment, submittedAssessmentIds))
          .map<PendingAssessmentReminder>((assessment) => ({
            assessment,
            classItem,
            dueMs: getAssessmentDueMs(assessment),
          }));
      } catch {
        return [] as PendingAssessmentReminder[];
      }
    }),
  );

  const pending = batches
    .flat()
    .sort((left, right) => left.dueMs - right.dueMs || left.assessment.title.localeCompare(right.assessment.title));

  if (pending.length === 0) return null;

  const first = pending[0];
  const classLabel = getClassLabel(first.classItem);
  const countLabel = pending.length === 1 ? '1 pending task' : String(pending.length) + ' pending tasks';
  const message =
    pending.length === 1
      ? first.assessment.title + ' in ' + classLabel + ' is ready. Tap to open your assessments.'
      : first.assessment.title + ' is next, plus ' + String(pending.length - 1) + ' more task(s). Tap to open your assessments.';

  return {
    id:
      'student-reminder:pending-task:' +
      studentId +
      ':' +
      reminderDateKey() +
      ':' +
      first.assessment.id +
      ':' +
      String(pending.length),
    userId: studentId,
    type: 'student_pending_task_reminder',
    title: countLabel + ' waiting',
    body: message,
    message,
    isRead: false,
    referenceId: first.assessment.id,
    metadata: { classId: first.classItem.id, reminderKind: 'pending-task' },
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

async function buildStudentPendingInterventionReminder(studentId: string): Promise<Notification | null> {
  const eligibilityRes = await lxpService.getEligibility();
  const data = eligibilityRes.data;
  const paths = Array.isArray(data.paths) ? data.paths : [];
  const pendingPaths = paths
    .map((path) => ({ path, pendingCount: getPendingPathCount(path) }))
    .filter(({ path, pendingCount }) => path.status !== 'completed' && pendingCount > 0);

  if (pendingPaths.length === 0) return null;

  const first = pendingPaths[0];
  const totalPending = pendingPaths.reduce((sum, item) => sum + item.pendingCount, 0);
  const subjectLabel = first.path.class?.subjectName || first.path.class?.subjectCode || 'Learners Path';
  const message =
    totalPending === 1
      ? subjectLabel + ' has 1 pending intervention step. JA can guide you through it now.'
      : subjectLabel + ' has ' + String(first.pendingCount) + ' pending step(s), with ' + String(totalPending) + ' total across your intervention paths.';

  return {
    id:
      'student-reminder:pending-intervention:' +
      studentId +
      ':' +
      reminderDateKey() +
      ':' +
      first.path.classId +
      ':' +
      String(totalPending),
    userId: studentId,
    type: 'student_pending_intervention_reminder',
    title: 'Learners Path needs you',
    body: message,
    message,
    isRead: false,
    referenceId: first.path.interventionCaseId || first.path.classId,
    metadata: { classId: first.path.classId, reminderKind: 'pending-intervention' },
    createdAt: new Date().toISOString(),
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribe: (listener: (notification: Notification) => void) => () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  subscribe: () => () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, role } = useAuth();
  const sessionUserId = isAuthenticated ? user?.id ?? null : null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );
  const socketRef = useRef<Socket | null>(null);
  const subscribersRef = useRef(new Set<(notification: Notification) => void>());
  const seenNotificationIdsRef = useRef(new Set<string>());
  const hasHydratedSeenIdsRef = useRef(false);
  const studentReminderInFlightRef = useRef(false);
  const notificationsInFlightRef = useRef(false);
  const notificationSyncGenerationRef = useRef(0);
  const trackedExtractionInFlightRef = useRef(false);
  const notificationsRef = useRef<Notification[]>([]);
  const unreadCountRef = useRef(0);
  const lastSyncAtRef = useRef(0);
  const activeSessionUserIdRef = useRef<string | null>(null);
  const surfaceStateRef = useRef<NotificationSurfaceState | null>(null);
  const hasSocketConnectedOnceRef = useRef(false);
  const liveNotificationBufferRef = useRef<Notification[]>([]);
  const liveNotificationTimerRef = useRef<number | null>(null);
  const liveNotificationLaneActiveRef = useRef(false);
  const liveNotificationLaneGenerationRef = useRef(0);
  const focusPresentationAtRef = useRef(0);

  const subscribe = useCallback((listener: (notification: Notification) => void) => {
    subscribersRef.current.add(listener);
    return () => {
      subscribersRef.current.delete(listener);
    };
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markRead(id);
      notificationsRef.current = notificationsRef.current.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification,
      );
      setNotifications(notificationsRef.current);
      unreadCountRef.current = Math.max(0, unreadCountRef.current - 1);
      setUnreadCount(unreadCountRef.current);
    } catch {
      // best-effort
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.readAll();
      notificationsRef.current = notificationsRef.current.map((notification) => ({
        ...notification,
        isRead: true,
      }));
      unreadCountRef.current = 0;
      setNotifications(notificationsRef.current);
      setUnreadCount(0);
    } catch {
      // best-effort
    }
  }, []);

  const publishIncomingNotification = useCallback((notification: Notification) => {
    if (!notification?.id) return false;

    const alreadySeen = seenNotificationIdsRef.current.has(notification.id);
    seenNotificationIdsRef.current.add(notification.id);
    if (alreadySeen) return false;

    subscribersRef.current.forEach((listener) => {
      try {
        listener(notification);
      } catch {
        // best-effort fanout for page-level listeners
      }
    });

    return true;
  }, []);

  const persistSurfaceState = useCallback(
    (state: NotificationSurfaceState) => {
      surfaceStateRef.current = state;
      if (sessionUserId) {
        writeNotificationSurfaceState(sessionUserId, state);
      }
    },
    [sessionUserId],
  );

  const recordSurfacedUrgentNotifications = useCallback(
    (rows: Notification[]) => {
      if (!sessionUserId) return;
      const urgentRows = rows.filter(isInterventionAlertNotification);
      if (urgentRows.length === 0) return;
      const now = Date.now();
      const current =
        surfaceStateRef.current ?? readNotificationSurfaceState(sessionUserId, now);
      const newestById = new Map(
        current.surfacedUrgent.map((entry) => [entry.id, entry.surfacedAt]),
      );
      urgentRows.forEach((notification) => newestById.set(notification.id, now));
      persistSurfaceState({
        ...current,
        surfacedUrgent: [...newestById.entries()]
          .map(([id, surfacedAt]) => ({ id, surfacedAt }))
          .sort((left, right) => right.surfacedAt - left.surfacedAt)
          .slice(0, 100),
      });
    },
    [persistSurfaceState, sessionUserId],
  );

  const resetLiveNotificationLane = useCallback((generation?: number) => {
    if (
      generation !== undefined &&
      generation !== liveNotificationLaneGenerationRef.current
    ) {
      return;
    }
    if (liveNotificationTimerRef.current !== null) {
      window.clearTimeout(liveNotificationTimerRef.current);
      liveNotificationTimerRef.current = null;
    }
    liveNotificationBufferRef.current = [];
    liveNotificationLaneActiveRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      resetLiveNotificationLane();
      dismissNotificationToastLane();
    };
  }, [resetLiveNotificationLane]);

  const openIndividualNotification = useCallback(
    (notification: Notification) => {
      const destination = resolveNotificationDestination(notification, role);
      void markAsRead(notification.id).finally(() => {
        window.location.assign(destination);
      });
    },
    [markAsRead, role],
  );

  const flushLiveNotificationLane = useCallback(
    (preferredKind?: 'live' | 'catch-up') => {
      if (liveNotificationTimerRef.current !== null) {
        window.clearTimeout(liveNotificationTimerRef.current);
        liveNotificationTimerRef.current = null;
      }

      const rows = [...liveNotificationBufferRef.current];
      if (rows.length === 0 || isStudentRole(role)) return;

      recordSurfacedUrgentNotifications(rows);
      liveNotificationLaneActiveRef.current = true;
      const generation = liveNotificationLaneGenerationRef.current + 1;
      liveNotificationLaneGenerationRef.current = generation;
      const onClose = () => resetLiveNotificationLane(generation);
      const containsUrgent = rows.some(isInterventionAlertNotification);

      if (rows.length === 1 && preferredKind !== 'catch-up') {
        showLiveNotificationToast(rows[0], role, {
          onOpen: () => openIndividualNotification(rows[0]),
          onClose,
        });
        return;
      }

      showNotificationDigestToast({
        kind: containsUrgent ? 'urgent' : preferredKind ?? 'live',
        count: rows.length,
        onClose,
      });
    },
    [openIndividualNotification, recordSurfacedUrgentNotifications, resetLiveNotificationLane, role],
  );

  const enqueueLiveNotification = useCallback(
    (notification: Notification) => {
      if (isStudentRole(role)) return;
      liveNotificationBufferRef.current.push(notification);

      if (document.visibilityState !== 'visible') return;
      if (
        isInterventionAlertNotification(notification) ||
        liveNotificationLaneActiveRef.current
      ) {
        flushLiveNotificationLane();
        return;
      }

      if (liveNotificationTimerRef.current === null) {
        liveNotificationTimerRef.current = window.setTimeout(() => {
          flushLiveNotificationLane();
        }, LIVE_NOTIFICATION_BURST_MS);
      }
    },
    [flushLiveNotificationLane, role],
  );

  const presentBacklogNotification = useCallback(
    (presentation: NotificationBacklogPresentation) => {
      if (presentation.kind === 'none' || isStudentRole(role)) return;
      if (presentation.kind === 'backlog-digest') {
        showNotificationDigestToast({
          kind: 'backlog',
          count: presentation.unreadCount,
        });
        return;
      }

      if (presentation.notifications.length === 1) {
        const notification = presentation.notifications[0];
        showLiveNotificationToast(notification, role, {
          onOpen: () => openIndividualNotification(notification),
        });
        return;
      }

      showNotificationDigestToast({
        kind: 'urgent',
        count: presentation.notifications.length,
      });
    },
    [openIndividualNotification, role],
  );

  const syncNotifications = useCallback(
    async (reason: NotificationSyncReason) => {
      if (notificationsInFlightRef.current) return;
      notificationsInFlightRef.current = true;
      const syncGeneration = notificationSyncGenerationRef.current;
      const suppressBacklogForFocus =
        reason === 'focus' && focusPresentationAtRef.current > lastSyncAtRef.current;
      try {
        if (!hasHydratedSeenIdsRef.current) {
          setLoading(true);
        }
        const [listResult, countResult] = await Promise.allSettled([
          notificationService.getAll({ limit: 50 }),
          notificationService.getUnreadCount(),
        ]);
        if (syncGeneration !== notificationSyncGenerationRef.current) return;
        const listSucceeded = listResult.status === 'fulfilled';
        const countSucceeded = countResult.status === 'fulfilled';
        if (!listSucceeded && !countSucceeded) return;

        const rows = listSucceeded && Array.isArray(listResult.value.data)
          ? listResult.value.data
          : null;
        const nextUnreadCount = countSucceeded
          ? countResult.value.data?.count ?? 0
          : unreadCountRef.current;
        const countForPresentation = countSucceeded
          ? nextUnreadCount
          : rows
            ? Math.max(unreadCountRef.current, rows.filter((row) => !row.isRead).length)
            : unreadCountRef.current;

        let focusPresentedFreshRows = false;
        if (rows) {
          if (!hasHydratedSeenIdsRef.current) {
            rows.forEach((row) => {
              if (row?.id) seenNotificationIdsRef.current.add(row.id);
            });
            hasHydratedSeenIdsRef.current = true;
          } else {
            const freshRows = rows
              .filter((row) => row?.id && !seenNotificationIdsRef.current.has(row.id))
              .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
            freshRows.forEach(publishIncomingNotification);

            if (freshRows.length > 0 && reason === 'focus' && !isStudentRole(role)) {
              recordSurfacedUrgentNotifications(freshRows);
              showNotificationDigestToast({
                kind: freshRows.some(isInterventionAlertNotification) ? 'urgent' : 'catch-up',
                count: freshRows.length,
              });
              focusPresentationAtRef.current = Date.now();
              focusPresentedFreshRows = true;
            } else if (
              freshRows.length > 0 &&
              (reason === 'reconnect' || reason === 'safety')
            ) {
              freshRows.forEach(enqueueLiveNotification);
            }
          }

          notificationsRef.current = rows;
          setNotifications(rows);
        }

        if (countSucceeded) {
          unreadCountRef.current = nextUnreadCount;
          setUnreadCount(nextUnreadCount);
        }

        if (
          rows &&
          (reason === 'hydrate' || reason === 'focus') &&
          !focusPresentedFreshRows &&
          !suppressBacklogForFocus &&
          !isStudentRole(role) &&
          sessionUserId
        ) {
          const latestSurfaceState =
            surfaceStateRef.current ?? readNotificationSurfaceState(sessionUserId, Date.now());
          const decision = evaluateNotificationBacklogPresentation({
            notifications: rows,
            unreadCount: countForPresentation,
            state: latestSurfaceState,
            now: Date.now(),
          });
          persistSurfaceState(decision.state);
          presentBacklogNotification(decision.presentation);
        }

        lastSyncAtRef.current = Date.now();
      } finally {
        if (syncGeneration === notificationSyncGenerationRef.current) {
          notificationsInFlightRef.current = false;
          setLoading(false);
        }
      }
    },
    [
      enqueueLiveNotification,
      persistSurfaceState,
      presentBacklogNotification,
      publishIncomingNotification,
      recordSurfacedUrgentNotifications,
      role,
      sessionUserId,
    ],
  );

  const fetchNotifications = useCallback(async () => {
    await syncNotifications('manual');
  }, [syncNotifications]);

  const syncTrackedExtractionNotifications = useCallback(async () => {
    if (!sessionUserId || role !== 'teacher') return;
    if (trackedExtractionInFlightRef.current) return;
    const syncGeneration = notificationSyncGenerationRef.current;

    const tracked = readAllTrackedExtractionNotifications().filter(
      (entry) =>
        !isTrackedExtractionTerminalStatus(entry.lastKnownStatus) || !entry.notifiedAt,
    );

    if (tracked.length === 0) return;

    trackedExtractionInFlightRef.current = true;
    try {
      await Promise.all(
        tracked.map(async (entry) => {
          try {
            const statusRes = await extractionService.getStatus(entry.extractionId);
            if (syncGeneration !== notificationSyncGenerationRef.current) return;
            const nextStatus = statusRes.data.status as ExtractionStatus;
            const nextEntry = {
              ...entry,
              lastKnownStatus: nextStatus,
              lastKnownProgress: statusRes.data.progressPercent,
              updatedAt: new Date().toISOString(),
            };

            const shouldNotify =
              !entry.notifiedAt &&
              !isTrackedExtractionTerminalStatus(entry.lastKnownStatus) &&
              isTrackedExtractionTerminalStatus(nextStatus);

            if (shouldNotify) {
              nextEntry.notifiedAt = new Date().toISOString();
              if (nextStatus === 'completed' || nextStatus === 'applied') {
                const message = `${entry.originalName} finished processing and is ready for teacher review.`;
                enqueueLiveNotification({
                    id: `extraction:${entry.extractionId}:completed`,
                    userId: sessionUserId,
                    type: 'extraction_completed',
                    title: 'Extraction ready',
                    body: message,
                    message,
                    isRead: false,
                    referenceId: entry.extractionId,
                    metadata: { classId: entry.classId },
                    createdAt: nextEntry.notifiedAt,
                  });
              } else if (nextStatus === 'failed') {
                const message =
                  statusRes.data.errorMessage ||
                  `${entry.originalName} could not be completed. Open the extraction history to review the error.`;
                enqueueLiveNotification({
                    id: `extraction:${entry.extractionId}:failed`,
                    userId: sessionUserId,
                    type: 'extraction_failed',
                    title: 'Extraction failed',
                    body: message,
                    message,
                    isRead: false,
                    referenceId: entry.extractionId,
                    metadata: { classId: entry.classId },
                    createdAt: nextEntry.notifiedAt,
                  });
              }
            }

            upsertTrackedExtractionNotification(entry.classId, nextEntry);
          } catch {
            // Keep the existing tracked state on transient polling failures.
          }
        }),
      );
    } finally {
      if (syncGeneration === notificationSyncGenerationRef.current) {
        trackedExtractionInFlightRef.current = false;
      }
    }
  }, [enqueueLiveNotification, role, sessionUserId]);

  const syncStudentReminderNotifications = useCallback(async () => {
    if (!sessionUserId || !isStudentRole(role) || studentReminderInFlightRef.current) return;

    studentReminderInFlightRef.current = true;
    const syncGeneration = notificationSyncGenerationRef.current;
    try {
      const [taskReminder, interventionReminder] = await Promise.all([
        buildStudentPendingTaskReminder(sessionUserId).catch(() => null),
        buildStudentPendingInterventionReminder(sessionUserId).catch(() => null),
      ]);
      if (syncGeneration !== notificationSyncGenerationRef.current) return;

      if (taskReminder) {
        publishIncomingNotification(taskReminder);
      }
      if (interventionReminder) {
        publishIncomingNotification(interventionReminder);
      }
    } catch {
      // Student reminders are helpful but should never block live backend notifications.
    } finally {
      if (syncGeneration === notificationSyncGenerationRef.current) {
        studentReminderInFlightRef.current = false;
      }
    }
  }, [publishIncomingNotification, role, sessionUserId]);

  useEffect(() => {
    if (sessionUserId) {
      if (activeSessionUserIdRef.current !== sessionUserId) {
        notificationSyncGenerationRef.current += 1;
        notificationsInFlightRef.current = false;
        trackedExtractionInFlightRef.current = false;
        studentReminderInFlightRef.current = false;
        activeSessionUserIdRef.current = sessionUserId;
        seenNotificationIdsRef.current = new Set();
        hasHydratedSeenIdsRef.current = false;
        notificationsRef.current = [];
        unreadCountRef.current = 0;
        surfaceStateRef.current = readNotificationSurfaceState(sessionUserId, Date.now());
        hasSocketConnectedOnceRef.current = false;
        resetLiveNotificationLane();
        dismissNotificationToastLane();
      }
      void syncNotifications('hydrate');
    } else {
      notificationSyncGenerationRef.current += 1;
      notificationsInFlightRef.current = false;
      trackedExtractionInFlightRef.current = false;
      studentReminderInFlightRef.current = false;
      activeSessionUserIdRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      notificationsRef.current = [];
      unreadCountRef.current = 0;
      seenNotificationIdsRef.current = new Set();
      hasHydratedSeenIdsRef.current = false;
      surfaceStateRef.current = null;
      lastSyncAtRef.current = 0;
      hasSocketConnectedOnceRef.current = false;
      resetLiveNotificationLane();
      dismissNotificationToastLane();
    }
  }, [resetLiveNotificationLane, sessionUserId, syncNotifications]);

  useEffect(() => {
    if (!sessionUserId) return;
    const storageKey = getNotificationSurfaceStorageKey(sessionUserId);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      surfaceStateRef.current = readNotificationSurfaceState(sessionUserId, Date.now());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) return;
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setDocumentVisible(visible);
      if (!visible) return;

      if (liveNotificationBufferRef.current.length > 0 && !isStudentRole(role)) {
        focusPresentationAtRef.current = Date.now();
        flushLiveNotificationLane('catch-up');
      }
      if (Date.now() - lastSyncAtRef.current >= FOCUS_SYNC_STALE_MS) {
        void syncNotifications('focus');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushLiveNotificationLane, role, sessionUserId, syncNotifications]);

  useEffect(() => {
    if (!sessionUserId || !documentVisible) return;

    const interval = window.setInterval(() => {
      void syncNotifications('safety');
    }, socketConnected ? CONNECTED_NOTIFICATION_POLL_MS : DISCONNECTED_NOTIFICATION_POLL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [documentVisible, sessionUserId, socketConnected, syncNotifications]);

  useEffect(() => {
    if (!sessionUserId || role !== 'teacher') return;
    void syncTrackedExtractionNotifications();
    const interval = window.setInterval(() => {
      void syncTrackedExtractionNotifications();
    }, EXTRACTION_STATUS_POLL_MS);
    return () => window.clearInterval(interval);
  }, [role, sessionUserId, syncTrackedExtractionNotifications]);

  useEffect(() => {
    if (!sessionUserId || !isStudentRole(role) || !documentVisible) return;

    void syncStudentReminderNotifications();
    const interval = window.setInterval(() => {
      void syncStudentReminderNotifications();
    }, STUDENT_REMINDER_POLL_MS);

    return () => window.clearInterval(interval);
  }, [documentVisible, role, sessionUserId, syncStudentReminderNotifications]);

  // WebSocket connection
  useEffect(() => {
    if (!sessionUserId) return;

    const wsUrl = getBrowserSocketOrigin();
    const token = getAccessToken();
    if (!token) return;
    const activeUserId = sessionUserId;

    const socket = io(`${wsUrl}/notifications`, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      const isReconnect = hasSocketConnectedOnceRef.current;
      hasSocketConnectedOnceRef.current = true;
      setSocketConnected(true);
      console.log('[WS] Notifications connected');
      if (isReconnect && document.visibilityState === 'visible') {
        void syncNotifications('reconnect');
      }
    });

    socket.on(
      'notification.new',
      (payload: {
        id: string;
        type: string;
        title: string;
        body: string;
        referenceId?: string;
        createdAt: string;
      }) => {
        const newNotification = normalizeNotification({
          id: payload.id,
          userId: activeUserId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          isRead: false,
          referenceId: payload.referenceId,
          createdAt: payload.createdAt,
        });

        const inserted = publishIncomingNotification(newNotification);
        if (!inserted) return;

        notificationsRef.current = [newNotification, ...notificationsRef.current];
        unreadCountRef.current += 1;
        setNotifications(notificationsRef.current);
        setUnreadCount(unreadCountRef.current);
        enqueueLiveNotification(newNotification);
      },
    );

    socket.on('error', (err: { message: string }) => {
      console.warn('[WS] Notification error:', err.message);
    });

    socket.on('disconnect', (reason: string) => {
      setSocketConnected(false);
      console.log('[WS] Notifications disconnected:', reason);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      setSocketConnected(false);
      socketRef.current = null;
    };
  }, [enqueueLiveNotification, publishIncomingNotification, sessionUserId, syncNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        subscribe,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

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
import { showLiveNotificationToast } from '@/components/notifications/LiveNotificationToast';
import {
  isTrackedExtractionTerminalStatus,
  readAllTrackedExtractionNotifications,
  upsertTrackedExtractionNotification,
} from '@/lib/extraction-notification-tracker';
import { shouldSurfaceNotificationOnHydration } from '@/lib/notification-routing';
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

const NOTIFICATION_POLL_MS = 5000;
const STUDENT_REMINDER_POLL_MS = 60_000;
const STUDENT_REMINDER_CLASS_LIMIT = 6;

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
      .getAssessmentHistory({ page: 1, limit: 300, submission: 'submitted' })
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
  const socketRef = useRef<Socket | null>(null);
  const subscribersRef = useRef(new Set<(notification: Notification) => void>());
  const seenNotificationIdsRef = useRef(new Set<string>());
  const hasHydratedSeenIdsRef = useRef(false);
  const studentReminderInFlightRef = useRef(false);

  const subscribe = useCallback((listener: (notification: Notification) => void) => {
    subscribersRef.current.add(listener);
    return () => {
      subscribersRef.current.delete(listener);
    };
  }, []);

  const publishIncomingNotification = useCallback(
    (notification: Notification, options?: { showToast?: boolean }) => {
      if (!notification?.id) return false;

      const alreadySeen = seenNotificationIdsRef.current.has(notification.id);
      seenNotificationIdsRef.current.add(notification.id);
      if (alreadySeen) {
        return false;
      }

      subscribersRef.current.forEach((listener) => {
        try {
          listener(notification);
        } catch {
          // best-effort fanout for page-level listeners
        }
      });

      if (options?.showToast) {
        showLiveNotificationToast(notification, role);
      }

      return true;
    },
    [role],
  );

  const syncNotifications = useCallback(
    async (showToastForFresh: boolean) => {
      try {
        setLoading(true);
        const [listRes, countRes] = await Promise.all([
          notificationService.getAll({ limit: 50 }),
          notificationService.getUnreadCount(),
        ]);

        const rows = Array.isArray(listRes.data) ? listRes.data : [];

        if (!hasHydratedSeenIdsRef.current) {
          const initialUrgentRows = rows
            .filter(shouldSurfaceNotificationOnHydration)
            .sort((left, right) => {
              const leftTs = Date.parse(left.createdAt);
              const rightTs = Date.parse(right.createdAt);
              return leftTs - rightTs;
            })
            .slice(-3);

          initialUrgentRows.forEach((row) => {
            publishIncomingNotification(row, { showToast: true });
          });

          rows.forEach((row) => {
            if (row?.id) {
              seenNotificationIdsRef.current.add(row.id);
            }
          });
          hasHydratedSeenIdsRef.current = true;
        } else {
          const freshRows = rows
            .filter((row) => row?.id && !seenNotificationIdsRef.current.has(row.id))
            .sort((left, right) => {
              const leftTs = Date.parse(left.createdAt);
              const rightTs = Date.parse(right.createdAt);
              return leftTs - rightTs;
            });

          freshRows.forEach((row) => {
            publishIncomingNotification(row, { showToast: showToastForFresh });
          });
        }

        setNotifications(rows);
        if (countRes.data) {
          setUnreadCount(countRes.data.count ?? 0);
        }
      } catch {
        // silently fail - notifications are non-critical
      } finally {
        setLoading(false);
      }
    },
    [publishIncomingNotification],
  );

  const fetchNotifications = useCallback(async () => {
    await syncNotifications(false);
  }, [syncNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // best-effort
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.readAll();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // best-effort
    }
  }, []);

  const syncTrackedExtractionNotifications = useCallback(async () => {
    if (!sessionUserId || role !== 'teacher') return;

    const tracked = readAllTrackedExtractionNotifications().filter(
      (entry) =>
        !isTrackedExtractionTerminalStatus(entry.lastKnownStatus) || !entry.notifiedAt,
    );

    if (tracked.length === 0) return;

    await Promise.all(
      tracked.map(async (entry) => {
        try {
          const statusRes = await extractionService.getStatus(entry.extractionId);
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
              showLiveNotificationToast(
                {
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
                },
                role,
              );
            } else if (nextStatus === 'failed') {
              const message =
                statusRes.data.errorMessage ||
                `${entry.originalName} could not be completed. Open the extraction history to review the error.`;
              showLiveNotificationToast(
                {
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
                },
                role,
              );
            }
          }

          upsertTrackedExtractionNotification(entry.classId, nextEntry);
        } catch {
          // Keep the existing tracked state on transient polling failures.
        }
      }),
    );
  }, [role, sessionUserId]);

  const syncStudentReminderNotifications = useCallback(async () => {
    if (!sessionUserId || !isStudentRole(role) || studentReminderInFlightRef.current) return;

    studentReminderInFlightRef.current = true;
    try {
      const [taskReminder, interventionReminder] = await Promise.all([
        buildStudentPendingTaskReminder(sessionUserId).catch(() => null),
        buildStudentPendingInterventionReminder(sessionUserId).catch(() => null),
      ]);

      if (taskReminder) {
        publishIncomingNotification(taskReminder, { showToast: true });
      }
      if (interventionReminder) {
        publishIncomingNotification(interventionReminder, { showToast: true });
      }
    } catch {
      // Student reminders are helpful but should never block live backend notifications.
    } finally {
      studentReminderInFlightRef.current = false;
    }
  }, [publishIncomingNotification, role, sessionUserId]);

  useEffect(() => {
    if (sessionUserId) {
      void syncNotifications(false);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      seenNotificationIdsRef.current = new Set();
      hasHydratedSeenIdsRef.current = false;
    }
  }, [sessionUserId, syncNotifications]);

  useEffect(() => {
    if (!sessionUserId) return;

    const interval = window.setInterval(() => {
      void syncNotifications(true);
    }, NOTIFICATION_POLL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [sessionUserId, syncNotifications]);

  useEffect(() => {
    if (!sessionUserId || role !== 'teacher') return;
    void syncTrackedExtractionNotifications();
    const interval = window.setInterval(() => {
      void syncTrackedExtractionNotifications();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [role, sessionUserId, syncTrackedExtractionNotifications]);

  useEffect(() => {
    if (!sessionUserId || !isStudentRole(role)) return;

    void syncStudentReminderNotifications();
    const interval = window.setInterval(() => {
      void syncStudentReminderNotifications();
    }, STUDENT_REMINDER_POLL_MS);

    return () => window.clearInterval(interval);
  }, [role, sessionUserId, syncStudentReminderNotifications]);

  // WebSocket connection
  useEffect(() => {
    if (!sessionUserId) return;

    const wsUrl = getBrowserSocketOrigin();
    const token = getAccessToken();
    if (!token) return;
    const activeUserId = sessionUserId;

    const socket = io(`${wsUrl}/notifications`, {
      auth: { token: `Bearer ${token}` },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[WS] Notifications connected');
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

        const inserted = publishIncomingNotification(newNotification, { showToast: true });
        if (!inserted) return;

        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      },
    );

    socket.on('error', (err: { message: string }) => {
      console.warn('[WS] Notification error:', err.message);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[WS] Notifications disconnected:', reason);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [publishIncomingNotification, sessionUserId]);

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

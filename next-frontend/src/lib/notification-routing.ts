import type { Notification } from '@/types/notification';

export type NotificationRole = 'student' | 'teacher' | 'admin' | string | null | undefined;

const AT_RISK_TERMS = ['at risk', 'at-risk', 'flagged'];
const INTERVENTION_ALERT_TERMS = ['intervention', 'support plan'];
const BLUE_REMINDER_TYPES = new Set(['student_pending_task_reminder', 'student_pending_intervention_reminder']);
const BLUE_INTERVENTION_TERMS = ['checklist', 'learner path', 'learners path', 'assigned path', 'pending intervention'];
const ASSESSMENT_TYPES = new Set([
  'assessment_assigned',
  'assessment_due',
  'assessment_graded',
  'student_pending_task_reminder',
]);
const ANNOUNCEMENT_TYPES = new Set(['announcement_posted']);
const DISCUSSION_TYPES = new Set(['discussion_thread_posted', 'discussion_comment_posted']);

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

export function getNotificationMessage(notification: Pick<Notification, 'message' | 'body'>) {
  const message = notification.message?.trim();
  if (message) return message;
  return notification.body?.trim() || 'A new update is available.';
}

export function isInterventionAlertNotification(
  notification: Pick<Notification, 'type' | 'title' | 'message' | 'body'>,
) {
  if (BLUE_REMINDER_TYPES.has(notification.type)) return false;

  const joined = normalizeText(
    `${notification.type} ${notification.title} ${notification.message ?? ''} ${notification.body ?? ''}`,
  );

  if (AT_RISK_TERMS.some((term) => joined.includes(term))) return true;
  if (BLUE_INTERVENTION_TERMS.some((term) => joined.includes(term))) return false;
  return INTERVENTION_ALERT_TERMS.some((term) => joined.includes(term));
}

export function shouldSurfaceNotificationOnHydration(notification: Notification) {
  return !notification.isRead;
}

function resolveRole(role: NotificationRole) {
  const normalized = normalizeText(role);
  if (normalized.includes('student')) return 'student';
  if (normalized.includes('teacher')) return 'teacher';
  if (normalized.includes('admin')) return 'admin';
  return null;
}

export function resolveNotificationDestination(notification: Notification, role?: NotificationRole) {
  const resolvedRole = resolveRole(role);
  const rawReferenceId = notification.referenceId ?? notification.metadata?.referenceId;
  const referenceId =
    typeof rawReferenceId === 'string' && rawReferenceId.trim().length > 0
      ? rawReferenceId
      : undefined;
  const classId = notification.metadata?.classId;
  const hasClassId = typeof classId === 'string' && classId.trim().length > 0;

  if (notification.type === 'student_pending_intervention_reminder') {
    if (resolvedRole === 'student') return '/dashboard/student/ja?entry=lxp';
    return '/dashboard/notifications';
  }

  if (isInterventionAlertNotification(notification)) {
    if (resolvedRole === 'student') return '/dashboard/student/ja?entry=lxp';
    if (referenceId && resolvedRole === 'teacher') return `/dashboard/teacher/interventions/${referenceId}`;
    return resolvedRole === 'teacher' ? '/dashboard/teacher/interventions' : '/dashboard/notifications';
  }

  if (ASSESSMENT_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') {
      if (referenceId) {
        return hasClassId
          ? `/dashboard/student/classes/${classId}?assessment=${referenceId}`
          : `/dashboard/student/assessments/${referenceId}`;
      }
      return hasClassId
        ? `/dashboard/student/classes/${classId}`
        : '/dashboard/student/assessments';
    }
    if (resolvedRole === 'teacher') {
      return referenceId ? `/dashboard/teacher/assessments/${referenceId}` : '/dashboard/teacher/assessments';
    }
  }

  if (ANNOUNCEMENT_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') {
      return hasClassId
        ? `/dashboard/student/classes/${classId}?announcement=${referenceId ?? ''}`
        : '/dashboard/student/announcements';
    }
    if (resolvedRole === 'teacher') {
      return hasClassId
        ? `/dashboard/teacher/announcements?classId=${classId}`
        : '/dashboard/teacher/announcements';
    }
  }

  if (DISCUSSION_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') {
      return hasClassId
        ? `/dashboard/student/classes/${classId}?discussion=${referenceId ?? ''}`
        : '/dashboard/student/classes';
    }
    if (resolvedRole === 'teacher') {
      return hasClassId
        ? `/dashboard/teacher/classes/${classId}?discussion=${referenceId ?? ''}`
        : '/dashboard/teacher/classes';
    }
  }

  if (notification.type === 'grade_updated') {
    if (resolvedRole === 'teacher') return '/dashboard/teacher/class-record';
    if (resolvedRole === 'student') return '/dashboard/student/performance';
  }

  if (notification.type === 'extraction_completed' || notification.type === 'extraction_failed') {
    if (resolvedRole === 'teacher') {
      if (referenceId) return `/dashboard/teacher/extractions/${referenceId}`;
      if (hasClassId) {
        return `/dashboard/teacher/classes/${classId}?view=extraction`;
      }
    }
  }

  return '/dashboard/notifications';
}

export function getNotificationActionLabel(notification: Notification) {
  if (isInterventionAlertNotification(notification)) {
    return 'Review alert';
  }

  if (ASSESSMENT_TYPES.has(notification.type)) {
    return 'Open assessment';
  }

  if (ANNOUNCEMENT_TYPES.has(notification.type)) {
    return 'View announcement';
  }

  if (DISCUSSION_TYPES.has(notification.type)) {
    return 'Open discussion';
  }

  if (notification.type === 'grade_updated') {
    return 'View grade';
  }

  return 'Open notification';
}

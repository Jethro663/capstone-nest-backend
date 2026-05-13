import type { Notification } from '@/types/notification';

export type NotificationRole = 'student' | 'teacher' | 'admin' | string | null | undefined;

const INTERVENTION_TERMS = ['intervention', 'at risk', 'at-risk', 'flagged', 'learners path'];
const ASSESSMENT_TYPES = new Set(['assessment_assigned', 'assessment_due', 'assessment_graded']);
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
  const joined = normalizeText(
    `${notification.type} ${notification.title} ${notification.message ?? ''} ${notification.body ?? ''}`,
  );
  return INTERVENTION_TERMS.some((term) => joined.includes(term));
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

  if (isInterventionAlertNotification(notification)) {
    if (resolvedRole === 'student') return '/dashboard/student/ja?entry=lxp';
    if (referenceId && resolvedRole === 'teacher') return `/dashboard/teacher/interventions/${referenceId}`;
    return resolvedRole === 'teacher' ? '/dashboard/teacher/interventions' : '/dashboard/notifications';
  }

  if (ASSESSMENT_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') {
      return referenceId ? `/dashboard/student/assessments/${referenceId}` : '/dashboard/student/assessments';
    }
    if (resolvedRole === 'teacher') {
      return referenceId ? `/dashboard/teacher/assessments/${referenceId}` : '/dashboard/teacher/assessments';
    }
  }

  if (ANNOUNCEMENT_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') return '/dashboard/student/announcements';
    if (resolvedRole === 'teacher') return '/dashboard/teacher/announcements';
  }

  if (DISCUSSION_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') return '/dashboard/student/classes';
    if (resolvedRole === 'teacher') return '/dashboard/teacher/classes';
  }

  if (notification.type === 'grade_updated') {
    if (resolvedRole === 'teacher') return '/dashboard/teacher/class-record';
    if (resolvedRole === 'student') return '/dashboard/student/performance';
  }

  if (notification.type === 'extraction_completed' || notification.type === 'extraction_failed') {
    if (resolvedRole === 'teacher') {
      if (referenceId) return `/dashboard/teacher/extractions/${referenceId}`;
      const classId = notification.metadata?.classId;
      if (typeof classId === 'string' && classId.trim()) {
        return `/dashboard/teacher/classes/${classId}?view=extraction`;
      }
    }
  }

  return '/dashboard/notifications';
}

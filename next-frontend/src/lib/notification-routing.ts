import type { Notification } from '@/types/notification';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { extractionService } from '@/services/extraction-service';
import { lxpService } from '@/services/lxp-service';

export type NotificationRole = 'student' | 'teacher' | 'admin' | string | null | undefined;
export type NotificationActionKind =
  | 'assessment'
  | 'announcement'
  | 'discussion'
  | 'grade'
  | 'intervention'
  | 'extraction'
  | 'history';

export type NotificationAction = {
  href: string;
  fallbackHref: string;
  label: string;
  requiresReference: boolean;
  kind: NotificationActionKind;
};

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

function resolveRole(role: NotificationRole) {
  const normalized = normalizeText(role);
  if (normalized.includes('student')) return 'student';
  if (normalized.includes('teacher')) return 'teacher';
  if (normalized.includes('admin')) return 'admin';
  return null;
}

export function resolveNotificationDestination(notification: Notification, role?: NotificationRole) {
  return resolveNotificationAction(notification, role).href;
}

export function resolveNotificationAction(notification: Notification, role?: NotificationRole): NotificationAction {
  const resolvedRole = resolveRole(role);
  const rawReferenceId = notification.referenceId ?? notification.metadata?.referenceId;
  const referenceId =
    typeof rawReferenceId === 'string' && rawReferenceId.trim().length > 0
      ? rawReferenceId
      : undefined;

<<<<<<< Updated upstream
=======
  if (notification.type === 'student_pending_intervention_reminder') {
    if (resolvedRole === 'student') {
      return {
        href: '/dashboard/student/ja?entry=lxp',
        fallbackHref: '/dashboard/notifications',
        label: 'Open Learners Path',
        requiresReference: false,
        kind: 'intervention',
      };
    }
    return historyAction();
  }

>>>>>>> Stashed changes
  if (isInterventionAlertNotification(notification)) {
    if (resolvedRole === 'student') {
      return {
        href: '/dashboard/student/ja?entry=lxp',
        fallbackHref: '/dashboard/notifications',
        label: 'Open Learners Path',
        requiresReference: false,
        kind: 'intervention',
      };
    }
    if (resolvedRole === 'teacher') {
      return {
        href: referenceId ? `/dashboard/teacher/interventions/${referenceId}` : '/dashboard/teacher/interventions',
        fallbackHref: '/dashboard/teacher/interventions',
        label: 'Open Intervention',
        requiresReference: Boolean(referenceId),
        kind: 'intervention',
      };
    }
    return historyAction();
  }

  if (ASSESSMENT_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') {
      return {
        href: referenceId ? `/dashboard/student/assessments/${referenceId}` : '/dashboard/student/assessments',
        fallbackHref: '/dashboard/student/assessments',
        label: 'Open Assessment',
        requiresReference: Boolean(referenceId),
        kind: 'assessment',
      };
    }
    if (resolvedRole === 'teacher') {
      return {
        href: referenceId ? `/dashboard/teacher/assessments/${referenceId}` : '/dashboard/teacher/assessments',
        fallbackHref: '/dashboard/teacher/assessments',
        label: 'Open Assessment',
        requiresReference: Boolean(referenceId),
        kind: 'assessment',
      };
    }
  }

  if (ANNOUNCEMENT_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') {
      return {
        href: '/dashboard/student/announcements',
        fallbackHref: '/dashboard/student/announcements',
        label: 'Open Announcements',
        requiresReference: false,
        kind: 'announcement',
      };
    }
    if (resolvedRole === 'teacher') {
      return {
        href: '/dashboard/teacher/announcements',
        fallbackHref: '/dashboard/teacher/announcements',
        label: 'Open Announcements',
        requiresReference: false,
        kind: 'announcement',
      };
    }
  }

  if (DISCUSSION_TYPES.has(notification.type)) {
    if (resolvedRole === 'student') {
      return {
        href: '/dashboard/student/classes',
        fallbackHref: '/dashboard/student/classes',
        label: 'Open Classes',
        requiresReference: false,
        kind: 'discussion',
      };
    }
    if (resolvedRole === 'teacher') {
      return {
        href: '/dashboard/teacher/classes',
        fallbackHref: '/dashboard/teacher/classes',
        label: 'Open Classes',
        requiresReference: false,
        kind: 'discussion',
      };
    }
  }

  if (notification.type === 'grade_updated') {
    if (resolvedRole === 'teacher') {
      return {
        href: '/dashboard/teacher/class-record',
        fallbackHref: '/dashboard/teacher/class-record',
        label: 'Open Class Record',
        requiresReference: false,
        kind: 'grade',
      };
    }
    if (resolvedRole === 'student') {
      return {
        href: '/dashboard/student/performance',
        fallbackHref: '/dashboard/student/performance',
        label: 'Open Performance',
        requiresReference: false,
        kind: 'grade',
      };
    }
  }

  if (notification.type === 'extraction_completed' || notification.type === 'extraction_failed') {
    if (resolvedRole === 'teacher') {
      if (referenceId) {
        return {
          href: `/dashboard/teacher/extractions/${referenceId}`,
          fallbackHref: '/dashboard/teacher/classes',
          label: 'Open Extraction',
          requiresReference: true,
          kind: 'extraction',
        };
      }
      const classId = notification.metadata?.classId;
      if (typeof classId === 'string' && classId.trim()) {
        return {
          href: `/dashboard/teacher/classes/${classId}?view=extraction`,
          fallbackHref: '/dashboard/teacher/classes',
          label: 'Open Class',
          requiresReference: true,
          kind: 'extraction',
        };
      }
    }
  }

  return historyAction();
}

function historyAction(): NotificationAction {
  return {
    href: '/dashboard/notifications',
    fallbackHref: '/dashboard/notifications',
    label: 'Open Notifications',
    requiresReference: false,
    kind: 'history',
  };
}

export async function resolveValidatedNotificationDestination(
  notification: Notification,
  role?: NotificationRole,
) {
  const action = resolveNotificationAction(notification, role);

  if (!action.requiresReference) return action.href;

  try {
    if (action.kind === 'assessment') {
      const referenceId = notification.referenceId ?? notification.metadata?.referenceId;
      if (typeof referenceId !== 'string' || !referenceId.trim()) return action.fallbackHref;
      await assessmentService.getById(referenceId);
      return action.href;
    }

    if (action.kind === 'intervention') {
      const referenceId = notification.referenceId ?? notification.metadata?.referenceId;
      if (typeof referenceId !== 'string' || !referenceId.trim()) return action.fallbackHref;
      await lxpService.getTeacherCaseDetail(referenceId);
      return action.href;
    }

    if (action.kind === 'extraction') {
      const referenceId = notification.referenceId ?? notification.metadata?.referenceId;
      if (typeof referenceId === 'string' && referenceId.trim()) {
        await extractionService.getById(referenceId);
        return action.href;
      }

      const classId = notification.metadata?.classId;
      if (typeof classId !== 'string' || !classId.trim()) return action.fallbackHref;
      await classService.getById(classId);
      return action.href;
    }
  } catch {
    return action.fallbackHref;
  }

  return action.href;
}

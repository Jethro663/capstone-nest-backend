import type { Assessment } from '@/types/assessment';
import type { ModuleItem } from '@/types/module';

export interface StudentAssessmentAvailability {
  canStart: boolean;
  blockedReason: string | null;
  isPastDue: boolean;
  hasAttemptsRemaining: boolean;
}

function toDateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const withResponse = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const rawMessage = withResponse.response?.data?.message ?? withResponse.message ?? '';
  if (Array.isArray(rawMessage)) {
    return rawMessage.find((entry) => typeof entry === 'string') || '';
  }
  return typeof rawMessage === 'string' ? rawMessage : '';
}

export function mapAssessmentStartError(error: unknown): string {
  const message = normalizeErrorMessage(error).toLowerCase();
  if (message.includes('due date passed') || message.includes('closed')) {
    return 'This assessment is closed because the due date has passed.';
  }
  if (message.includes('maximum attempts reached')) {
    return 'You already used all allowed attempts for this assessment.';
  }
  if (message.includes('not published')) {
    return 'This assessment is not published yet.';
  }
  if (message.includes('not available') || message.includes('not given')) {
    return 'This assessment is not available yet.';
  }
  return 'Unable to start assessment attempt.';
}

export function getStudentAssessmentAvailability(params: {
  assessment: Assessment | null;
  item: ModuleItem | null;
  submittedAttemptCount: number;
  now?: Date;
}): StudentAssessmentAvailability {
  const { assessment, item, submittedAttemptCount, now = new Date() } = params;
  if (!assessment || !item) {
    return {
      canStart: false,
      blockedReason: 'Assessment is unavailable in this module.',
      isPastDue: false,
      hasAttemptsRemaining: false,
    };
  }

  if (!item.accessible) {
    return {
      canStart: false,
      blockedReason: 'This assessment is currently locked by your teacher.',
      isPastDue: false,
      hasAttemptsRemaining: false,
    };
  }

  if (!item.isGiven) {
    return {
      canStart: false,
      blockedReason: 'This assessment has not been given yet.',
      isPastDue: false,
      hasAttemptsRemaining: false,
    };
  }

  if (!assessment.isPublished) {
    return {
      canStart: false,
      blockedReason: 'This assessment is not published yet.',
      isPastDue: false,
      hasAttemptsRemaining: false,
    };
  }

  const dueDate = toDateOrNull(assessment.dueDate ?? null);
  const closesWhenDue = assessment.closeWhenDue ?? true;
  const isPastDue = Boolean(closesWhenDue && dueDate && dueDate.getTime() < now.getTime());
  if (isPastDue) {
    return {
      canStart: false,
      blockedReason: 'This assessment is closed because the due date has passed.',
      isPastDue: true,
      hasAttemptsRemaining: false,
    };
  }

  const maxAttempts = assessment.maxAttempts ?? 1;
  const hasAttemptsRemaining = submittedAttemptCount < maxAttempts;
  if (!hasAttemptsRemaining) {
    return {
      canStart: false,
      blockedReason: `Maximum attempts reached (${maxAttempts}).`,
      isPastDue: false,
      hasAttemptsRemaining: false,
    };
  }

  return {
    canStart: true,
    blockedReason: null,
    isPastDue: false,
    hasAttemptsRemaining: true,
  };
}

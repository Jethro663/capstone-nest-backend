import type { Assessment, AssessmentAttempt } from '@/types/assessment';

function getAttemptSortTime(attempt: AssessmentAttempt) {
  return new Date(
    attempt.submittedAt || attempt.updatedAt || attempt.createdAt || 0,
  ).getTime();
}

export function getSubmittedAttempts(attempts: AssessmentAttempt[]) {
  return attempts.filter((attempt) => attempt.isSubmitted !== false);
}

export function getLatestSubmittedAttempt(attempts: AssessmentAttempt[]) {
  return [...getSubmittedAttempts(attempts)].sort(
    (a, b) => getAttemptSortTime(b) - getAttemptSortTime(a),
  )[0] ?? null;
}

export function getLatestReturnedAttempt(attempts: AssessmentAttempt[]) {
  return [...getSubmittedAttempts(attempts)]
    .filter((attempt) => attempt.isReturned)
    .sort((a, b) => getAttemptSortTime(b) - getAttemptSortTime(a))[0] ?? null;
}

export function getStudentAssessmentHref(
  assessment: Pick<Assessment, 'id' | 'type'>,
  attempts: AssessmentAttempt[] = [],
) {
  if (assessment.type !== 'file_upload') {
    return `/dashboard/student/assessments/${assessment.id}`;
  }

  const latestReturnedAttempt = getLatestReturnedAttempt(attempts);

  if (latestReturnedAttempt) {
    return `/dashboard/student/assessments/${assessment.id}/results/${latestReturnedAttempt.id}`;
  }

  return `/dashboard/student/assessments/${assessment.id}`;
}

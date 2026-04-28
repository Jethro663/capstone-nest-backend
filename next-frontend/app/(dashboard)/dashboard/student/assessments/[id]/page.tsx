'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Clock3, Target } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import {
  StudentEmptyState,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { getMotionProps } from '@/components/student/student-motion';
import { toast } from 'sonner';
import {
  getLatestReturnedAttempt,
  getLatestSubmittedAttempt,
  getSubmittedAttempts,
} from '@/utils/student-assessment-routing';
import { formatDate } from '@/utils/helpers';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

function toAssessmentTypeLabel(type: string) {
  return type.replaceAll('_', ' ');
}

function getAssessmentTypeTone(type: Assessment['type']): StatusTone {
  if (type === 'exam') return 'danger';
  if (type === 'assignment') return 'warning';
  return 'info';
}

function getAttemptStatus(attempt: AssessmentAttempt): { tone: StatusTone; label: string } {
  if (attempt.isReturned === false) {
    return { tone: 'warning', label: 'Awaiting Review' };
  }

  if (attempt.passed) {
    return {
      tone: 'success',
      label: `Passed${attempt.score != null ? ` \u2022 ${attempt.score}%` : ''}`,
    };
  }

  return {
    tone: 'danger',
    label: `Needs Improvement${attempt.score != null ? ` \u2022 ${attempt.score}%` : ''}`,
  };
}

function SummaryMetric({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
        {label}
      </p>
      <strong className="block text-[1.55rem] font-black leading-none text-[var(--student-text-strong)]">
        {value}
      </strong>
      {caption ? <span className="block text-xs text-[var(--student-text-muted)]">{caption}</span> : null}
    </div>
  );
}

export default function StudentAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const classId = searchParams.get('classId');
  const reduceMotion = useReducedMotion();
  const motionProps = getMotionProps(!!reduceMotion);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [unsubmittingAttemptId, setUnsubmittingAttemptId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentRes, attemptsRes] = await Promise.all([
        assessmentService.getById(assessmentId),
        assessmentService.getStudentAttempts(assessmentId),
      ]);
      setAssessment(assessmentRes.data);
      setAttempts(attemptsRes.data || []);
    } catch {
      toast.error('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const viewMode = searchParams.get('view');
    const hasDraftAttempt = attempts.some((attempt) => attempt.isSubmitted === false);
    if (
      !loading &&
      assessment?.type === 'file_upload' &&
      viewMode !== 'submitted' &&
      !getLatestReturnedAttempt(attempts) &&
      (hasDraftAttempt || attempts.length === 0)
    ) {
      router.replace(`/dashboard/student/assessments/${assessmentId}/take`);
    }
  }, [assessment, assessmentId, attempts, loading, router, searchParams]);

  const submittedAttempts = getSubmittedAttempts(attempts);
  const latestSubmittedFileAttempt = assessment?.type === 'file_upload'
    ? getLatestSubmittedAttempt(attempts)
    : null;
  const latestReturnedAttempt = getLatestReturnedAttempt(attempts);
  const hasDraftAttempt = attempts.some((attempt) => attempt.isSubmitted === false);
  const maxAttempts = assessment?.maxAttempts ?? 1;
  const attemptsRemaining = Math.max(0, maxAttempts - submittedAttempts.length);
  const canStart = attemptsRemaining > 0;
  const questionCount = assessment?.questions?.length ?? 0;
  const dueDateLabel = assessment?.dueDate ? `Due ${formatDate(assessment.dueDate)}` : 'No due date';
  const backHref = classId
    ? `/dashboard/student/classes/${classId}?view=assignments`
    : '/dashboard/student';
  const primaryActionLabel = starting
    ? 'Starting...'
    : submittedAttempts.length > 0
      ? `Retake (${attemptsRemaining} left)`
      : 'Start Assessment';

  const handleStart = async () => {
    try {
      setStarting(true);
      const res = await assessmentService.startAttempt(assessmentId);
      const { attempt, timeLimitMinutes } = res.data;
      let url = `/dashboard/student/assessments/${assessmentId}/take?attemptId=${attempt.id}`;
      if (timeLimitMinutes) url += `&timeLimit=${timeLimitMinutes}`;
      router.push(url);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to start assessment';
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const handleUnsubmitFileUpload = async () => {
    if (!latestSubmittedFileAttempt) return;
    try {
      setUnsubmittingAttemptId(latestSubmittedFileAttempt.id);
      const res = await assessmentService.unsubmitFileUpload(assessmentId);
      toast.success('Submission restored. You can continue editing your file upload.');
      await fetchData();
      router.push(`/dashboard/student/assessments/${assessmentId}/take?attemptId=${res.data.id}`);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to restore file upload draft';
      toast.error(message);
    } finally {
      setUnsubmittingAttemptId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-12 w-56 rounded-xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <StudentEmptyState
        title="Assessment not found"
        description="This assessment may have been removed or you no longer have access."
        icon={<Target className="h-5 w-5" />}
      />
    );
  }

  const isPastDue = assessment.dueDate ? new Date(assessment.dueDate) < new Date() : false;
  const assessmentTypeTone = getAssessmentTypeTone(assessment.type);
  const workspaceStatusLabel = hasDraftAttempt
    ? 'Draft in progress'
    : submittedAttempts.length > 0
      ? 'Submitted'
      : 'Not turned in';
  const workspaceStatusTone: StatusTone = hasDraftAttempt
    ? 'warning'
    : submittedAttempts.length > 0
      ? latestReturnedAttempt?.passed
        ? 'success'
        : latestReturnedAttempt
          ? 'danger'
          : 'info'
      : 'neutral';

  return (
    <div className="student-page mx-auto max-w-6xl space-y-5 rounded-[2rem] p-1 md:space-y-6">
      <motion.main {...motionProps.container} className="space-y-5 md:space-y-6">
        <motion.section
          {...motionProps.item}
          className="student-panel flex flex-col gap-4 rounded-[1.35rem] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(backHref)}
            className="inline-flex items-center gap-2 px-0 text-[var(--student-accent)] hover:bg-transparent hover:text-[var(--student-text-strong)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {classId ? 'Back to class assignments' : 'Back to dashboard'}
          </Button>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:w-auto lg:justify-end">
            <div className="inline-flex items-center gap-3 rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-4 py-2 sm:rounded-full">
              <Clock3 className="h-4 w-4" />
              <div>
                <strong className="block text-sm font-bold text-[var(--student-text-strong)]">{workspaceStatusLabel}</strong>
                <span className="block text-xs text-[var(--student-text-muted)]">
                  {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining
                </span>
              </div>
            </div>
            {canStart ? (
              <Button onClick={handleStart} disabled={starting} className="student-button-solid">
                {primaryActionLabel}
              </Button>
            ) : (
              <Button disabled>No attempts remaining</Button>
            )}
          </div>
        </motion.section>

        <motion.section
          {...motionProps.item}
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17.5rem]"
        >
          <div className="student-panel rounded-[1.7rem] px-5 py-5 md:px-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <StudentStatusChip tone="info">Assessment workspace</StudentStatusChip>
              <StudentStatusChip tone={assessmentTypeTone}>
                {toAssessmentTypeLabel(assessment.type)}
              </StudentStatusChip>
              <StudentStatusChip tone="neutral">
                {questionCount} question{questionCount === 1 ? '' : 's'}
              </StudentStatusChip>
              <StudentStatusChip tone={isPastDue ? 'danger' : 'neutral'}>
                {isPastDue ? 'Past due' : dueDateLabel}
              </StudentStatusChip>
            </div>

            <header className="space-y-2">
              <h1 className="text-[clamp(1.85rem,2.4vw,2.5rem)] font-black leading-[1.02] tracking-[-0.03em] text-[var(--student-text-strong)]">
                {assessment.title}
              </h1>
              <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--student-text-muted)]">
                {dueDateLabel}
                <span aria-hidden="true">•</span>
                {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining
              </p>
            </header>

            <section className="mt-6">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                Instructions
              </p>
              <div className="rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-4 py-4">
                {assessment.description ? (
                  <RichTextRenderer
                    html={assessment.description}
                    className="rich-text-renderer text-sm student-muted-text"
                  />
                ) : (
                  <p className="text-sm student-muted-text">No instructions provided yet.</p>
                )}
              </div>
            </section>

            <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                label="Total Points"
                value={assessment.totalPoints ?? 0}
              />
              <SummaryMetric
                label="Passing Score"
                value={`${assessment.passingScore ?? 60}%`}
              />
              <SummaryMetric
                label="Attempts"
                value={`${submittedAttempts.length} / ${maxAttempts}`}
                caption={`${attemptsRemaining} remaining`}
              />
              <SummaryMetric
                label="Time Limit"
                value={assessment.timeLimitMinutes ?? '\u221E'}
                caption={assessment.timeLimitMinutes ? 'minutes' : 'untimed'}
              />
            </section>

            <div className="my-6 h-px bg-[var(--student-outline)]" />

            <section className="space-y-4">
              <div>
                <h2 className="text-base font-black text-[var(--student-text-strong)]">Start or Retake</h2>
                <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                  Availability, due date, and attempt access shown using the active student theme.
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <strong className="block text-sm font-bold text-[var(--student-text-strong)]">{dueDateLabel}</strong>
                  <span className={isPastDue ? 'mt-1 block text-xs text-[var(--student-danger-text)]' : 'mt-1 block text-xs text-[var(--student-text-muted)]'}>
                    {isPastDue
                      ? 'This assessment is past due. You may still proceed if attempts remain.'
                      : `${attemptsRemaining} attempt(s) remaining`}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <StudentStatusChip tone={attemptsRemaining > 0 ? 'info' : 'danger'}>
                    {attemptsRemaining} remaining
                  </StudentStatusChip>
                  {canStart ? (
                    <Button onClick={handleStart} disabled={starting} className="student-button-solid">
                      {primaryActionLabel}
                    </Button>
                  ) : (
                    <Button disabled>No attempts remaining</Button>
                  )}
                </div>
              </div>
            </section>

            {(assessment.rubricCriteria?.length ?? 0) > 0 && (
              <>
                <div className="my-6 h-px bg-[var(--student-outline)]" />
                <section className="space-y-4">
                  <div>
                    <h2 className="text-base font-black text-[var(--student-text-strong)]">Rubric</h2>
                    <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                      Your teacher will score this assessment using the reviewed rubric below.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {assessment.rubricCriteria?.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="flex flex-col gap-3 rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] px-4 py-4 md:flex-row md:items-start md:justify-between"
                      >
                        <div>
                          <strong className="block text-sm font-bold text-[var(--student-text-strong)]">{criterion.title}</strong>
                          {criterion.description ? (
                            <p className="mt-1 text-sm text-[var(--student-text-muted)]">{criterion.description}</p>
                          ) : null}
                        </div>
                        <StudentStatusChip tone="info">{criterion.points} pts</StudentStatusChip>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <div className="my-6 h-px bg-[var(--student-outline)]" />

            <section className="space-y-4">
              <div>
                <h2 className="text-base font-black text-[var(--student-text-strong)]">My Attempts</h2>
                <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                  {submittedAttempts.length > 0
                    ? `${submittedAttempts.length} submitted attempt${submittedAttempts.length === 1 ? '' : 's'}`
                    : 'Review all your submitted attempts.'}
                </p>
              </div>

              {submittedAttempts.length === 0 ? (
                <div className="grid justify-items-center gap-2 py-8 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]">
                    <ClipboardAttemptIcon />
                  </div>
                  <strong className="text-sm font-bold text-[var(--student-text-strong)]">No attempts yet</strong>
                  <p className="max-w-md text-sm text-[var(--student-text-muted)]">
                    Start this assessment to create your first attempt.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {submittedAttempts.map((attempt) => {
                    const status = getAttemptStatus(attempt);

                    return (
                      <article
                        key={attempt.id}
                        className="flex flex-col gap-3 rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] px-4 py-4 md:flex-row md:items-start md:justify-between"
                      >
                        <div>
                          <strong className="block text-sm font-bold text-[var(--student-text-strong)]">
                            Attempt #{attempt.attemptNumber ?? '?'}
                          </strong>
                          <span className="mt-1 block text-xs text-[var(--student-text-muted)]">
                            {formatDate(attempt.submittedAt || attempt.createdAt || '')}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
                          <StudentStatusChip tone={status.tone}>{status.label}</StudentStatusChip>
                          <Button
                            variant="outline"
                            size="sm"
                            className="student-button-outline"
                            onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}/results/${attempt.id}`)}
                          >
                            View Results
                          </Button>
                          {assessment.type === 'file_upload' && latestSubmittedFileAttempt?.id === attempt.id && attempt.isReturned === false && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="student-button-outline"
                              onClick={handleUnsubmitFileUpload}
                              disabled={unsubmittingAttemptId === attempt.id}
                            >
                              {unsubmittingAttemptId === attempt.id ? 'Restoring...' : 'Unsubmit'}
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4 self-start lg:sticky lg:top-6">
            <div className="rounded-[1.2rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] px-5 py-5 shadow-[var(--student-shadow)]">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                Points
              </p>
              <strong className="block text-[2.4rem] font-black leading-none text-[var(--student-text-strong)]">
                {assessment.totalPoints ?? 0}
              </strong>
              <span className="mt-2 block text-sm text-[var(--student-text-muted)]">points possible</span>
            </div>

            <div className="rounded-[1.2rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] px-5 py-5 shadow-[var(--student-shadow)]">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                Quick Facts
              </p>
              <dl className="grid gap-3">
                <div className="border-b border-[var(--student-outline)] pb-3">
                  <dt className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">Status</dt>
                  <dd>
                    <StudentStatusChip tone={workspaceStatusTone}>{workspaceStatusLabel}</StudentStatusChip>
                  </dd>
                </div>
                <div className="border-b border-[var(--student-outline)] pb-3">
                  <dt className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">Passing</dt>
                  <dd className="text-sm font-semibold text-[var(--student-text-strong)]">{assessment.passingScore ?? 60}%</dd>
                </div>
                <div className="border-b border-[var(--student-outline)] pb-3">
                  <dt className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">Time Limit</dt>
                  <dd className="text-sm font-semibold text-[var(--student-text-strong)]">
                    {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} minutes` : 'Untimed'}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">Questions</dt>
                  <dd className="text-sm font-semibold text-[var(--student-text-strong)]">{questionCount}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </motion.section>
      </motion.main>
    </div>
  );
}

function ClipboardAttemptIcon() {
  return <Clock3 className="h-5 w-5" />;
}

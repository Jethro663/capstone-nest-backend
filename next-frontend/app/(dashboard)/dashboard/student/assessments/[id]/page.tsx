'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Clock3, Paperclip, Target } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { getMotionProps } from '@/components/student/student-motion';
import {
  StudentEmptyState,
} from '@/components/student/student-primitives';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { assessmentService } from '@/services/assessment-service';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import { formatDate } from '@/utils/helpers';
import {
  getLatestReturnedAttempt,
  getLatestSubmittedAttempt,
  getSubmittedAttempts,
} from '@/utils/student-assessment-routing';

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

function toAssessmentTypeLabel(type: string) {
  return type.replaceAll('_', ' ');
}

function getAttemptStatus(attempt: AssessmentAttempt): { tone: StatusTone; label: string } {
  if (attempt.isReturned === false) {
    return { tone: 'warning', label: 'Awaiting Review' };
  }

  if (attempt.passed) {
    return {
      tone: 'success',
      label: `Passed${attempt.score != null ? ` - ${attempt.score}%` : ''}`,
    };
  }

  return {
    tone: 'danger',
    label: `Needs Improvement${attempt.score != null ? ` - ${attempt.score}%` : ''}`,
  };
}

function getToneClasses(tone: StatusTone) {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  if (tone === 'danger') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (tone === 'info') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }
  return 'border-[var(--student-outline)] bg-[var(--student-surface)] text-[var(--student-text-strong)]';
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
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
        <strong className="block text-[1.35rem] font-black leading-none text-[var(--student-text-strong)]">
          {value}
        </strong>
        {caption ? <span className="block pb-0.5 text-xs text-[var(--student-text-muted)]">{caption}</span> : null}
      </div>
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
    void fetchData();
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
  const latestSubmittedFileAttempt =
    assessment?.type === 'file_upload' ? getLatestSubmittedAttempt(attempts) : null;
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
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
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
  const workspaceStatusLabel = hasDraftAttempt
    ? 'Draft in progress'
    : submittedAttempts.length > 0
      ? 'Submitted'
      : 'Not turned in';
  const workspaceStatusTone: StatusTone = hasDraftAttempt
    ? 'warning'
    : submittedAttempts.length > 0
      ? 'success'
      : isPastDue
        ? 'danger'
        : 'neutral';

  return (
    <div className="student-page mx-auto w-full max-w-6xl space-y-4 pb-8">
      <motion.main {...motionProps.container} className="space-y-4">
        <motion.section {...motionProps.item} className="px-1 py-1">
          <div className="flex flex-col gap-5">
            <div className="min-w-0 space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backHref)}
                className="inline-flex h-auto items-center gap-2 px-0 py-0 text-[var(--student-accent)] hover:bg-transparent hover:text-[var(--student-text-strong)]"
              >
                <ArrowLeft className="h-4 w-4" />
                {classId ? 'Back to class assignments' : 'Back to dashboard'}
              </Button>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem_auto] lg:items-start">
                <div className="space-y-2">
                  <h1 className="text-[clamp(1.65rem,2.2vw,2.35rem)] font-black leading-tight tracking-[-0.03em] text-[var(--student-text-strong)]">
                    {assessment.title}
                  </h1>
                  <p className="text-sm text-[var(--student-text-muted)]">{dueDateLabel}</p>
                </div>

                <dl className="grid gap-3 text-sm lg:pt-1">
                  <div className="rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface)] px-4 py-3 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)]">
                    <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">Points</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--student-text-strong)]">
                      {assessment.totalPoints ?? 0} points possible
                    </dd>
                  </div>
                  <div className={`rounded-[1rem] border px-4 py-3 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)] ${getToneClasses(workspaceStatusTone)}`}>
                    <dt className="text-[11px] font-black uppercase tracking-[0.18em] opacity-75">Status</dt>
                    <dd className="mt-1 text-base font-semibold">{workspaceStatusLabel}</dd>
                  </div>
                </dl>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <div className="rounded-full border border-[var(--student-outline)] bg-[var(--student-elevated)] px-3 py-1 text-sm font-semibold text-[var(--student-text-strong)] shadow-[0_10px_22px_-20px_rgba(15,23,42,0.45)]">
                    {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining
                  </div>
                  {canStart ? (
                    <Button onClick={handleStart} disabled={starting} className="student-button-solid min-w-[10rem]">
                      {primaryActionLabel}
                    </Button>
                  ) : (
                    <Button disabled className="min-w-[10rem]">
                      No attempts remaining
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          {...motionProps.item}
          className="overflow-hidden rounded-[1.1rem] border border-[var(--student-outline)] bg-[var(--student-elevated)]"
        >
          <div className="divide-y divide-[var(--student-outline)]">
            <section className="px-4 py-4 md:px-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface)] px-4 py-3 transition-colors hover:bg-[var(--student-surface-soft)]">
                  <SummaryMetric label="Type" value={toAssessmentTypeLabel(assessment.type)} />
                </div>
                <div className="rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface)] px-4 py-3 transition-colors hover:bg-[var(--student-surface-soft)]">
                  <SummaryMetric label="Passing Score" value={`${assessment.passingScore ?? 60}%`} />
                </div>
                <div className="rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface)] px-4 py-3 transition-colors hover:bg-[var(--student-surface-soft)]">
                  <SummaryMetric label="Questions" value={questionCount} />
                </div>
                <div className="rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface)] px-4 py-3 transition-colors hover:bg-[var(--student-surface-soft)]">
                  <SummaryMetric
                    label="Attempts"
                    value={`${submittedAttempts.length} / ${maxAttempts}`}
                    caption={`${attemptsRemaining} remaining`}
                  />
                </div>
                <div className="rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface)] px-4 py-3 transition-colors hover:bg-[var(--student-surface-soft)]">
                  <SummaryMetric
                    label="Time Limit"
                    value={assessment.timeLimitMinutes ? assessment.timeLimitMinutes : 'No limit'}
                    caption={assessment.timeLimitMinutes ? 'minutes' : 'untimed'}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3 px-4 py-4 md:px-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                  Instructions
                </p>
                <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                  Review the task details before you begin your submission.
                </p>
              </div>
              <div className="rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface)] px-4 py-4">
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

            {assessment.teacherAttachmentFile && (
              <section className="space-y-3 px-4 py-4 md:px-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                    Reference Material
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--student-outline)] bg-[var(--student-surface)] px-4 py-3 transition-colors hover:bg-[var(--student-surface-soft)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-[var(--student-accent-soft)] text-[var(--student-accent)]">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--student-text-strong)]">
                      {assessment.teacherAttachmentFile.originalName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                      {assessment.teacherAttachmentFile.mimeType}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {(assessment.rubricCriteria?.length ?? 0) > 0 && (
              <section className="space-y-3 px-4 py-4 md:px-5">
                <div>
                  <h2 className="text-base font-black text-[var(--student-text-strong)]">Rubric</h2>
                  <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                    These are the criteria your teacher will review.
                  </p>
                </div>

                <div className="overflow-hidden rounded-[0.9rem] border border-[var(--student-outline)]">
                  {assessment.rubricCriteria?.map((criterion, index) => (
                    <div
                      key={criterion.id}
                      className={`flex flex-col gap-2 bg-[var(--student-elevated)] px-4 py-3 transition-colors hover:bg-[var(--student-surface)] md:flex-row md:items-start md:justify-between ${
                        index > 0 ? 'border-t border-[var(--student-outline)]' : ''
                      }`}
                    >
                      <div>
                        <strong className="block text-sm font-bold text-[var(--student-text-strong)]">{criterion.title}</strong>
                        {criterion.description ? (
                          <p className="mt-1 text-sm text-[var(--student-text-muted)]">{criterion.description}</p>
                        ) : null}
                      </div>
                      <span className="inline-flex w-fit items-center rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--student-text-strong)]">
                        {criterion.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3 px-4 py-4 md:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-[var(--student-text-strong)]">My Attempts</h2>
                  <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                    {submittedAttempts.length > 0
                      ? `${submittedAttempts.length} submitted attempt${submittedAttempts.length === 1 ? '' : 's'}`
                      : 'Your submitted work will appear here after you turn it in.'}
                  </p>
                </div>
                {isPastDue ? (
                  <p className="text-sm text-[var(--student-danger-text)]">
                    This assessment is already past due.
                  </p>
                ) : null}
              </div>

              {submittedAttempts.length === 0 ? (
                <div className="grid justify-items-center gap-2 rounded-[0.9rem] border border-dashed border-[var(--student-outline)] px-4 py-8 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]">
                    <ClipboardAttemptIcon />
                  </div>
                  <strong className="text-sm font-bold text-[var(--student-text-strong)]">No attempts yet</strong>
                  <p className="max-w-md text-sm text-[var(--student-text-muted)]">
                    Start this assessment when you are ready.
                  </p>
                </div>
                ) : (
                  <div className="overflow-hidden rounded-[0.9rem] border border-[var(--student-outline)]">
                  {submittedAttempts.map((attempt, index) => {
                    const status = getAttemptStatus(attempt);

                    return (
                      <article
                        key={attempt.id}
                        className={`flex flex-col gap-3 bg-[var(--student-elevated)] px-4 py-3 transition-colors hover:bg-[var(--student-surface)] md:flex-row md:items-center md:justify-between ${
                          index > 0 ? 'border-t border-[var(--student-outline)]' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <strong className="block text-sm font-bold text-[var(--student-text-strong)]">
                            Attempt #{attempt.attemptNumber ?? '?'}
                          </strong>
                          <span className="block text-xs text-[var(--student-text-muted)]">
                            {formatDate(attempt.submittedAt || attempt.createdAt || '')}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
                          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${getToneClasses(status.tone)}`}>
                            {status.label}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="student-button-outline"
                            onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}/results/${attempt.id}`)}
                          >
                            View Results
                          </Button>
                          {assessment.type === 'file_upload' &&
                            latestSubmittedFileAttempt?.id === attempt.id &&
                            attempt.isReturned === false && (
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
        </motion.section>
      </motion.main>
    </div>
  );
}

function ClipboardAttemptIcon() {
  return <Clock3 className="h-5 w-5" />;
}

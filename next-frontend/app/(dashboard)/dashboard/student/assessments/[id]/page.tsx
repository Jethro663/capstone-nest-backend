'use client';

import type { ReactNode } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Clock3, Medal, Target } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentActionCard,
  StudentEmptyState,
  StudentSectionHeader,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { getMotionProps } from '@/components/student/student-motion';
import { toast } from 'sonner';
import {
  getLatestReturnedAttempt,
  getLatestSubmittedAttempt,
  getSubmittedAttempts,
} from '@/utils/student-assessment-routing';
import { getDescription, formatDate } from '@/utils/helpers';
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

function MetricTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide student-muted-text">{label}</p>
        <span className="text-[var(--student-accent)]">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-[var(--student-text-strong)]">{value}</p>
    </div>
  );
}

export default function StudentAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
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
  const maxAttempts = assessment?.maxAttempts ?? 1;
  const attemptsRemaining = Math.max(0, maxAttempts - submittedAttempts.length);
  const canStart = attemptsRemaining > 0;
  const questionCount = assessment?.questions?.length ?? 0;
  const dueDateLabel = assessment?.dueDate ? `Due ${formatDate(assessment.dueDate)}` : 'No due date';

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

  return (
    <div className="student-page rounded-3xl p-1">
      <motion.main {...motionProps.container} className="mx-auto max-w-4xl space-y-5">
        <motion.div {...motionProps.item}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/student')}
            className="text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to dashboard
          </Button>
        </motion.div>

        <motion.section {...motionProps.item}>
          <StudentActionCard>
            <StudentSectionHeader
              title={assessment.title}
              action={
                <StudentStatusChip tone={assessmentTypeTone}>
                  {toAssessmentTypeLabel(assessment.type)}
                </StudentStatusChip>
              }
            />

            {assessment.description && (
              <p className="mt-3 max-w-3xl text-sm student-muted-text">{getDescription(assessment.description)}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <StudentStatusChip tone="info">{questionCount} question{questionCount === 1 ? '' : 's'}</StudentStatusChip>
              <StudentStatusChip tone={isPastDue ? 'danger' : 'neutral'}>
                {isPastDue ? 'Past due' : dueDateLabel}
              </StudentStatusChip>
            </div>
          </StudentActionCard>
        </motion.section>

        <motion.section {...motionProps.item}>
          <StudentActionCard>
            <StudentSectionHeader title="Assessment Overview" subtitle="Core details at a glance." />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile
                label="Total Points"
                value={assessment.totalPoints ?? 0}
                icon={<Target className="h-4 w-4" />}
              />
              <MetricTile
                label="Passing Score"
                value={`${assessment.passingScore ?? 60}%`}
                icon={<Medal className="h-4 w-4" />}
              />
              <MetricTile
                label="Attempts"
                value={`${submittedAttempts.length}/${maxAttempts}`}
                icon={<Clock3 className="h-4 w-4" />}
              />
              <MetricTile
                label="Time Limit"
                value={assessment.timeLimitMinutes ?? '\u221E'}
                icon={<Clock3 className="h-4 w-4" />}
              />
            </div>
          </StudentActionCard>
        </motion.section>

        <motion.section {...motionProps.item}>
          <StudentActionCard className={isPastDue ? 'border-[var(--student-danger-border)] bg-[var(--student-danger-bg)]' : ''}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                  {dueDateLabel}
                </p>
                <p className={isPastDue ? 'text-xs font-semibold text-[var(--student-danger-text)]' : 'text-xs student-muted-text'}>
                  {isPastDue ? 'This assessment is past due. You may still proceed if attempts remain.' : `${attemptsRemaining} attempt(s) remaining`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StudentStatusChip tone={attemptsRemaining > 0 ? 'info' : 'danger'}>
                  {attemptsRemaining} remaining
                </StudentStatusChip>
                {canStart ? (
                  <Button onClick={handleStart} disabled={starting} className="student-button-solid">
                    {starting
                      ? 'Starting...'
                      : submittedAttempts.length > 0
                        ? `Retake (${attemptsRemaining} left)`
                        : 'Start Assessment'}
                  </Button>
                ) : (
                  <Button disabled>No attempts remaining</Button>
                )}
              </div>
            </div>
          </StudentActionCard>
        </motion.section>

        {(assessment.rubricCriteria?.length ?? 0) > 0 && (
          <motion.section {...motionProps.item}>
            <StudentActionCard>
              <StudentSectionHeader
                title="Rubric"
                subtitle="Your teacher will score this assessment using the reviewed rubric below."
              />
              <div className="mt-4 divide-y divide-[var(--student-outline)]">
                {assessment.rubricCriteria?.map((criterion) => (
                  <div key={criterion.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--student-text-strong)]">{criterion.title}</p>
                        {criterion.description && (
                          <p className="mt-1 text-sm student-muted-text">{criterion.description}</p>
                        )}
                      </div>
                      <StudentStatusChip tone="info">{criterion.points} pts</StudentStatusChip>
                    </div>
                  </div>
                ))}
              </div>
            </StudentActionCard>
          </motion.section>
        )}

        <motion.section {...motionProps.item} className="space-y-3">
          <StudentSectionHeader
            title="My Attempts"
            subtitle={
              submittedAttempts.length > 0
                ? `${submittedAttempts.length} submitted attempt${submittedAttempts.length === 1 ? '' : 's'}`
                : 'Review all your submitted attempts.'
            }
          />
          {submittedAttempts.length === 0 ? (
            <StudentEmptyState
              title="No attempts yet"
              description="Start this assessment to create your first attempt."
              icon={<ClipboardAttemptIcon />}
            />
          ) : (
            <div className="space-y-3">
              {submittedAttempts.map((attempt) => {
                const status = getAttemptStatus(attempt);

                return (
                  <StudentActionCard key={attempt.id} className="border-[var(--student-outline)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--student-text-strong)]">Attempt #{attempt.attemptNumber ?? '?'}</p>
                        <p className="text-xs student-muted-text">{formatDate(attempt.submittedAt || attempt.createdAt || '')}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StudentStatusChip tone={status.tone}>{status.label}</StudentStatusChip>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}/results/${attempt.id}`)}
                        >
                          View Results
                        </Button>
                        {assessment.type === 'file_upload' && latestSubmittedFileAttempt?.id === attempt.id && attempt.isReturned === false && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUnsubmitFileUpload}
                            disabled={unsubmittingAttemptId === attempt.id}
                          >
                            {unsubmittingAttemptId === attempt.id ? 'Restoring...' : 'Unsubmit'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </StudentActionCard>
                );
              })}
            </div>
          )}
        </motion.section>
      </motion.main>
    </div>
  );
}

function ClipboardAttemptIcon() {
  return <Clock3 className="h-5 w-5" />;
}

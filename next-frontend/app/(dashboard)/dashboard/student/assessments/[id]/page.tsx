'use client';

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
import { getDescription, formatDate } from '@/utils/helpers';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';

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
    if (!loading && assessment?.type === 'file_upload' && viewMode !== 'submitted') {
      router.replace(`/dashboard/student/assessments/${assessmentId}/take`);
    }
  }, [assessment, assessmentId, loading, router, searchParams]);

  const submittedAttempts = attempts.filter((a) => a.isSubmitted !== false);
  const maxAttempts = assessment?.maxAttempts ?? 1;
  const attemptsRemaining = Math.max(0, maxAttempts - submittedAttempts.length);
  const canStart = attemptsRemaining > 0;

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

  return (
    <div className="student-page rounded-3xl p-1">
      <motion.div {...motionProps.container} className="mx-auto max-w-4xl space-y-6">
        <motion.div {...motionProps.item}>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/student')} className="text-red-700 hover:bg-red-50">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </motion.div>

        <motion.div {...motionProps.item}>
          <StudentActionCard className="border-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white">
            <StudentSectionHeader
              title={assessment.title}
              subtitle={`${assessment.questions?.length ?? 0} questions`}
              className="[&_h2]:text-white [&_p]:text-red-100"
              action={
                <StudentStatusChip tone={assessment.type === 'exam' ? 'danger' : assessment.type === 'assignment' ? 'warning' : 'info'}>
                  {assessment.type}
                </StudentStatusChip>
              }
            />
            {assessment.description && (
              <p className="mt-3 max-w-2xl text-sm text-red-50">{getDescription(assessment.description)}</p>
            )}
          </StudentActionCard>
        </motion.div>

        <motion.div {...motionProps.container} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div {...motionProps.item}>
            <StudentActionCard>
              <div className="flex items-center justify-between">
                <p className="text-sm student-muted-text">Total Points</p>
                <Target className="h-4 w-4 text-red-600" />
              </div>
              <p className="mt-2 text-2xl font-extrabold">{assessment.totalPoints ?? 0}</p>
            </StudentActionCard>
          </motion.div>
          <motion.div {...motionProps.item}>
            <StudentActionCard>
              <div className="flex items-center justify-between">
                <p className="text-sm student-muted-text">Passing Score</p>
                <Medal className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-extrabold">{assessment.passingScore ?? 60}%</p>
            </StudentActionCard>
          </motion.div>
          <motion.div {...motionProps.item}>
            <StudentActionCard>
              <div className="flex items-center justify-between">
                <p className="text-sm student-muted-text">Attempts</p>
                <Clock3 className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-extrabold">{submittedAttempts.length}/{maxAttempts}</p>
            </StudentActionCard>
          </motion.div>
          <motion.div {...motionProps.item}>
            <StudentActionCard>
              <div className="flex items-center justify-between">
                <p className="text-sm student-muted-text">Time Limit</p>
                <Clock3 className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 text-2xl font-extrabold">{assessment.timeLimitMinutes ?? '∞'}</p>
            </StudentActionCard>
          </motion.div>
        </motion.div>

        <motion.div {...motionProps.item}>
          <StudentActionCard className={isPastDue ? 'border-rose-300 bg-rose-50/70' : ''}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {assessment.dueDate ? `Due ${formatDate(assessment.dueDate)}` : 'No due date'}
                </p>
                <p className={isPastDue ? 'text-xs font-semibold text-rose-700' : 'text-xs student-muted-text'}>
                  {isPastDue ? 'This assessment is past due. You may still proceed if attempts remain.' : `${attemptsRemaining} attempt(s) remaining`}
                </p>
              </div>
              {canStart ? (
                <Button onClick={handleStart} disabled={starting} className="bg-red-600 hover:bg-red-700">
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
          </StudentActionCard>
        </motion.div>

        <motion.section {...motionProps.item} className="space-y-3">
          <StudentSectionHeader title="My Attempts" subtitle="Review all your submitted attempts." />
          {submittedAttempts.length === 0 ? (
            <StudentEmptyState
              title="No attempts yet"
              description="Start this assessment to create your first attempt."
              icon={<ClipboardAttemptIcon />}
            />
          ) : (
            <motion.div {...motionProps.container} className="space-y-3">
              {submittedAttempts.map((attempt) => (
                <motion.div key={attempt.id} {...motionProps.item}>
                  <StudentActionCard>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Attempt #{attempt.attemptNumber ?? '?'}</p>
                        <p className="text-xs student-muted-text">{formatDate(attempt.submittedAt || attempt.createdAt || '')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {attempt.isReturned === false ? (
                          <StudentStatusChip tone="warning">Awaiting Review</StudentStatusChip>
                        ) : (
                          <StudentStatusChip tone={attempt.passed ? 'success' : 'danger'}>
                            {attempt.passed ? 'Passed' : 'Needs Improvement'} {attempt.score != null ? `• ${attempt.score}%` : ''}
                          </StudentStatusChip>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}/results/${attempt.id}`)}
                        >
                          View Results
                        </Button>
                      </div>
                    </div>
                  </StudentActionCard>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}

function ClipboardAttemptIcon() {
  return <Clock3 className="h-5 w-5" />;
}

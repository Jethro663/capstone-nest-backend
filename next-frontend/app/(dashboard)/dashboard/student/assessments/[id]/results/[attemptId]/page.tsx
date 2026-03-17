'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, CircleCheckBig, CircleX, Hourglass } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentActionCard,
  StudentSectionHeader,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { getMotionProps } from '@/components/student/student-motion';
import { toast } from 'sonner';
import type { AttemptResult } from '@/types/assessment';

export default function StudentAssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;
  const assessmentId = params.id as string;
  const reduceMotion = useReducedMotion();
  const motionProps = getMotionProps(!!reduceMotion);

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getAttemptResults(attemptId);
      console.log(res)
      setResult(res.data);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!result) {
    return <p className="text-[var(--student-text-muted)]">Results not found.</p>;
  }

  const { attempt, responses, score, passed, isReturned, attemptNumber, teacherFeedback } = result;
  const pct = score ?? 0;
  const correctCount = responses.filter((r) => r.isCorrect === true).length;

  if (isReturned === false) {
    return (
      <div className="student-page rounded-3xl p-1">
        <div className="mx-auto max-w-4xl space-y-6">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}`)} className="text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <StudentActionCard>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="rounded-full border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-3 text-[var(--student-text-muted)]">
                <Hourglass className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-[var(--student-text-strong)]">Awaiting Teacher Review</h2>
              <p className="max-w-md text-sm student-muted-text">
                Your submission is complete. Your teacher will return the grade and feedback soon.
              </p>
            </div>
          </StudentActionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page rounded-3xl p-1">
      <motion.div {...motionProps.container} className="mx-auto max-w-4xl space-y-6">
        <motion.div {...motionProps.item}>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}`)} className="text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </motion.div>

        <motion.div {...motionProps.item}>
          <StudentActionCard className="border-0 bg-[var(--student-accent)] text-[var(--student-accent-contrast)]">
            <StudentSectionHeader
              title="Assessment Results"
              subtitle={`You answered ${correctCount} out of ${responses.length} correctly.`}
              className="[&_h2]:text-[var(--student-accent-contrast)] [&_p]:text-[var(--student-accent-contrast)]/70"
              action={<StudentStatusChip tone={passed ? 'success' : 'danger'}>{passed ? 'Passed' : 'Needs Improvement'}</StudentStatusChip>}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-3 items-stretch">
              <div className="rounded-xl border border-[var(--student-accent-contrast)]/25 bg-[var(--student-accent-contrast)]/10 p-4 text-center flex flex-col items-center justify-center h-28">
                <p className="text-xs uppercase tracking-wide text-[var(--student-accent-contrast)]">Score</p>
                <p className="mt-1 text-4xl font-black text-[var(--student-accent-contrast)] leading-tight">{pct}%</p>
              </div>
              <div className="rounded-xl border border-[var(--student-accent-contrast)]/25 bg-[var(--student-accent-contrast)]/10 p-4 text-center flex flex-col items-center justify-center h-28">
                <p className="text-xs uppercase tracking-wide text-[var(--student-accent-contrast)]">Correct</p>
                <p className="mt-1 text-4xl font-black text-[var(--student-accent-contrast)] leading-tight">{correctCount}</p>
              </div>
              <div className="rounded-xl border border-[var(--student-accent-contrast)]/25 bg-[var(--student-accent-contrast)]/10 p-4 text-center flex flex-col items-center justify-center h-28">
                <p className="text-xs uppercase tracking-wide text-[var(--student-accent-contrast)]">Attempt</p>
                <p className="mt-1 text-4xl font-black text-[var(--student-accent-contrast)] leading-tight">#{attemptNumber ?? '?'}</p>
              </div>
            </div>
          </StudentActionCard>
        </motion.div>

        {teacherFeedback && (
          <motion.div {...motionProps.item}>
            <StudentActionCard className="border-[var(--student-outline)] bg-[var(--student-surface-soft)]">
              <p className="text-sm font-semibold text-[var(--student-text-strong)]">Teacher Feedback</p>
              <p className="mt-1 text-sm text-[var(--student-text-muted)]">{teacherFeedback}</p>
            </StudentActionCard>
          </motion.div>
        )}

        <motion.section {...motionProps.item} className="space-y-3">
          <StudentSectionHeader title="Question Review" subtitle="Check which answers were correct and learn from the feedback." />
          <motion.div {...motionProps.container} className="space-y-3">
            {responses.map((response, i) => (
              <motion.div key={response.questionId} {...motionProps.item}>
                <StudentActionCard className={response.isCorrect ? 'border-[var(--student-success-border)] bg-[var(--student-success-bg)]' : 'border-[var(--student-danger-border)] bg-[var(--student-danger-bg)]'}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--student-text-strong)]">Question {i + 1}</p>
                      {response.isCorrect ? (
                        <StudentStatusChip tone="success">
                          <CircleCheckBig className="mr-1 h-3.5 w-3.5" />
                          Correct
                        </StudentStatusChip>
                      ) : (
                        <StudentStatusChip tone="danger">
                          <CircleX className="mr-1 h-3.5 w-3.5" />
                          Incorrect
                        </StudentStatusChip>
                      )}
                    </div>
                    <p className="text-xs student-muted-text">
                      {response.pointsEarned ?? 0}/{response.question?.points ?? 0} pts
                    </p>
                  </div>

                  <p className="mt-2 font-medium text-[var(--student-text-strong)]">{response.question?.content}</p>

                  {response.question?.imageUrl && (
                    <div className="mt-3">
                      <img src={response.question.imageUrl} alt="Question" className="max-h-48 rounded-xl border border-[var(--student-outline)] object-contain" />
                    </div>
                  )}

                  {(() => {
                    const options = response.question?.options || [];
                    if (response.selectedOptionId) {
                      const selected = options.find((o) => o.id === response.selectedOptionId);
                      return (
                        <p className="mt-3 text-sm">
                          <span className="student-muted-text">Your answer: </span>
                          <span className="font-semibold text-[var(--student-text-strong)]">{selected?.text || response.selectedOptionId}</span>
                        </p>
                      );
                    }
                    if (response.selectedOptionIds && response.selectedOptionIds.length > 0) {
                      const selectedTexts = response.selectedOptionIds.map(
                        (id) => options.find((o) => o.id === id)?.text || id,
                      );
                      return (
                        <p className="mt-3 text-sm">
                          <span className="student-muted-text">Your answers: </span>
                          <span className="font-semibold text-[var(--student-text-strong)]">{selectedTexts.join(', ')}</span>
                        </p>
                      );
                    }
                    if (response.studentAnswer) {
                      return (
                        <p className="mt-3 text-sm">
                          <span className="student-muted-text">Your answer: </span>
                          <span className="font-semibold text-[var(--student-text-strong)]">{response.studentAnswer}</span>
                        </p>
                      );
                    }
                    return <p className="mt-3 text-sm italic student-muted-text">No answer provided</p>;
                  })()}

                  {response.isCorrect === false && response.question?.options && (
                    <p className="mt-2 text-sm">
                      <span className="student-muted-text">Correct answer: </span>
                      <span className="font-semibold text-[var(--student-success-text)]">
                        {response.question.options.filter((o) => o.isCorrect).map((o) => o.text).join(', ')}
                      </span>
                    </p>
                  )}

                  {response.question?.explanation && (
                    <div className="mt-3 rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-3 text-sm text-[var(--student-text-strong)]">
                      {response.question.explanation}
                    </div>
                  )}
                </StudentActionCard>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.div {...motionProps.item}>
          <StudentActionCard className={passed ? 'border-[var(--student-success-border)] bg-[var(--student-success-bg)]' : 'border-[var(--student-outline)] bg-[var(--student-surface-soft)]'}>
            <p className="font-semibold text-[var(--student-text-strong)]">{passed ? 'Great Work' : 'Study Tips'}</p>
            {passed ? (
              <ul className="mt-2 space-y-1 text-sm student-muted-text">
                <li>Keep your momentum and continue to the next lesson.</li>
                <li>Review feedback notes to sharpen weak spots.</li>
              </ul>
            ) : (
              <ul className="mt-2 space-y-1 text-sm student-muted-text">
                <li>Review lesson materials for missed topics.</li>
                <li>Practice similar questions before your next attempt.</li>
                <li>Ask your teacher for help on difficult items.</li>
              </ul>
            )}
          </StudentActionCard>
        </motion.div>
      </motion.div>
    </div>
  );
}

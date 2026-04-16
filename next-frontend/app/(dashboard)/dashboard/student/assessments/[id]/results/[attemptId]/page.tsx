'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  CircleCheckBig,
  CircleX,
  Hourglass,
  Lightbulb,
  Rocket,
  Target,
  Star,
} from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { aiService } from '@/services/ai-service';
import { lxpService } from '@/services/lxp-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  StudentActionCard,
  StudentSectionHeader,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { getMotionProps } from '@/components/student/student-motion';
import { toast } from 'sonner';
import type { AttemptResult } from '@/types/assessment';
import type { MentorExplainResponse } from '@/types/ai';

function buildHintSteps(response: MentorExplainResponse | null): string[] {
  if (!response) return [];
  const packet = response.analysisPacket;
  const hints: string[] = [];

  if (packet?.likelyMisconceptions?.length) {
    hints.push(...packet.likelyMisconceptions.slice(0, 2).map((item) => `Watch out: ${item}`));
  }
  if (packet?.requiredEvidence?.length) {
    hints.push(...packet.requiredEvidence.slice(0, 2).map((item) => `Use this clue: ${item}`));
  }
  if (packet?.answerGuardrail) {
    hints.push(`Guardrail: ${packet.answerGuardrail}`);
  }

  if (hints.length === 0) {
    return ['Re-read the prompt slowly and mark the keywords before solving.', 'Check your method step by step before finalizing your answer.'];
  }

  return hints;
}

export default function StudentAssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;
  const assessmentId = params.id as string;
  const reduceMotion = useReducedMotion();
  const motionProps = getMotionProps(!!reduceMotion);

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorQuestionId, setMentorQuestionId] = useState<string | null>(null);
  const [mentorPrompt, setMentorPrompt] = useState('');
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorResponse, setMentorResponse] = useState<MentorExplainResponse | null>(null);
  const [hintRevealCount, setHintRevealCount] = useState(1);

  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratedQuestionIds, setRatedQuestionIds] = useState<Record<string, true>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getAttemptResults(attemptId);
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

  useEffect(() => {
    if (!mentorResponse || !mentorQuestionId) return;
    if (ratedQuestionIds[mentorQuestionId]) return;
    setRatingOpen(true);
  }, [mentorResponse, mentorQuestionId, ratedQuestionIds]);

  const handleAskJa = async (questionId: string) => {
    try {
      setMentorQuestionId(questionId);
      setMentorResponse(null);
      setMentorPrompt('');
      setHintRevealCount(1);
      setMentorOpen(true);
      setMentorLoading(true);
      const res = await aiService.explainMistake({ attemptId, questionId });
      setMentorResponse(res.data);
      setHintRevealCount(1);
    } catch {
      toast.error('Failed to get AI mentoring help');
    } finally {
      setMentorLoading(false);
    }
  };

  const handleMentorFollowUp = async () => {
    if (!mentorQuestionId) return;
    try {
      setMentorLoading(true);
      const res = await aiService.explainMistake({
        attemptId,
        questionId: mentorQuestionId,
        message: mentorPrompt.trim() || undefined,
      });
      setMentorResponse(res.data);
      setHintRevealCount(1);
    } catch {
      toast.error('Failed to refresh AI mentoring help');
    } finally {
      setMentorLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!mentorQuestionId || rating < 1 || rating > 5) {
      toast.error('Select a rating from 1 to 5 stars first.');
      return;
    }

    try {
      setRatingSubmitting(true);
      await lxpService.submitEvaluation({
        targetModule: 'ai_mentor',
        usabilityScore: rating,
        functionalityScore: rating,
        performanceScore: rating,
        satisfactionScore: rating,
        feedback: ratingComment.trim() || undefined,
        aiContextMetadata: {
          sessionType: 'mistake_explanation',
          attemptId,
          questionId: mentorQuestionId,
          sourceFlow: 'assessment_results',
        },
      });
      setRatedQuestionIds((current) => ({ ...current, [mentorQuestionId]: true }));
      setRatingOpen(false);
      setRatingComment('');
      setRating(0);
      toast.success('Thanks. Your AI mentor feedback is saved.');
    } catch {
      toast.error('Failed to save your AI mentor feedback.');
    } finally {
      setRatingSubmitting(false);
    }
  };

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

  const { responses, score, passed, isReturned, attemptNumber, teacherFeedback } = result;
  const pct = score ?? 0;
  const correctCount = responses.filter((r) => r.isCorrect === true).length;
  const hintSteps = buildHintSteps(mentorResponse);
  const revealedHints = hintSteps.slice(0, hintRevealCount);

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
          <StudentActionCard className="border-0 bg-[linear-gradient(130deg,var(--student-accent),#2456da)] text-[var(--student-accent-contrast)]">
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
          <StudentSectionHeader title="Question Review" subtitle="Check which answers were correct and launch Ja for mission-mode guided feedback." />
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
                      <Image
                        src={response.question.imageUrl}
                        alt="Question"
                        width={960}
                        height={540}
                        unoptimized
                        className="max-h-48 h-auto w-auto rounded-xl border border-[var(--student-outline)] object-contain"
                      />
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

                  {response.isCorrect === false && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAskJa(response.questionId)}
                      >
                        Ask Ja
                      </Button>
                    </div>
                  )}
                </StudentActionCard>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </motion.div>

      <Dialog open={mentorOpen} onOpenChange={setMentorOpen}>
        <DialogContent variant="student" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ja Mission Control</DialogTitle>
            <DialogDescription>
              Guided breakdown of the mistake with progressive hints and grounded sources.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={mentorPrompt}
              onChange={(e) => setMentorPrompt(e.target.value)}
              placeholder="Optional follow-up: what part do you want Ja to unpack next?"
              rows={3}
            />

            <div className="flex justify-end">
              <Button onClick={handleMentorFollowUp} disabled={mentorLoading || !mentorQuestionId}>
                {mentorLoading ? 'Thinking...' : 'Refresh Help'}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--student-text-strong)]">
                  <Target className="h-4 w-4" />
                  What Went Wrong
                </p>
                <p className="mt-2 text-sm text-[var(--student-text-muted)] whitespace-pre-wrap">
                  {mentorLoading && !mentorResponse
                    ? 'Ja is analyzing your response pattern...'
                    : mentorResponse?.analysisPacket?.mistakeSummary || mentorResponse?.reply || 'No explanation available yet.'}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--student-text-strong)]">
                  <Rocket className="h-4 w-4" />
                  Next Remedial Action
                </p>
                <p className="mt-2 text-sm text-[var(--student-text-muted)]">
                  {mentorResponse?.suggestedNext?.label || 'Review this item once, then retry a related example with the same structure.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--student-text-strong)]">
                <Lightbulb className="h-4 w-4" />
                Guided Hints
              </p>
              <ol className="mt-2 space-y-2 text-sm text-[var(--student-text-muted)]">
                {revealedHints.map((hint, index) => (
                  <li key={`${hint}-${index}`} className="rounded-lg border border-[var(--student-outline)] bg-white/60 px-3 py-2">
                    <span className="font-semibold text-[var(--student-text-strong)]">Step {index + 1}:</span> {hint}
                  </li>
                ))}
              </ol>
              {hintRevealCount < hintSteps.length && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setHintRevealCount((current) => Math.min(current + 1, hintSteps.length))}
                >
                  Reveal Next Hint
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
              <p className="text-sm font-semibold text-[var(--student-text-strong)]">Grounded Sources</p>
              {mentorResponse?.citations?.length ? (
                <ul className="mt-2 space-y-1 text-sm text-[var(--student-text-muted)]">
                  {mentorResponse.citations.map((citation) => (
                    <li key={citation.chunkId}>{citation.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--student-text-muted)]">No citations available yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent variant="student" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Ja&apos;s Help</DialogTitle>
            <DialogDescription>
              Your feedback helps teachers and admins monitor AI mentoring quality.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="rounded-md p-1 transition hover:scale-105"
                  aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-7 w-7 ${rating >= value ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={ratingComment}
              onChange={(event) => setRatingComment(event.target.value)}
              rows={3}
              placeholder="Optional: what made this explanation clear or unclear?"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingOpen(false)} disabled={ratingSubmitting}>
              Maybe Later
            </Button>
            <Button onClick={handleSubmitRating} disabled={ratingSubmitting || rating === 0}>
              {ratingSubmitting ? 'Saving...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

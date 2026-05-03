'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CircleCheckBig,
  CircleX,
  FileText,
  Hourglass,
  Lightbulb,
  Rocket,
  Star,
  Target,
} from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { aiService } from '@/services/ai-service';
import { lxpService } from '@/services/lxp-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
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
} from '@/components/student/student-primitives';
import { toast } from 'sonner';
import type { AttemptResult, RubricCriterion } from '@/types/assessment';
import type { MentorExplainResponse } from '@/types/ai';
import './results-page.css';

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
    return [
      'Re-read the prompt slowly and mark the keywords before solving.',
      'Check your method step by step before finalizing your answer.',
    ];
  }

  return hints;
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function getReleaseTone(
  feedbackStatus: AttemptResult['feedbackStatus'],
): 'warning' | 'neutral' | 'info' {
  if (!feedbackStatus) return 'neutral';
  if (feedbackStatus.level === 'detailed' && feedbackStatus.unlocked === false) {
    return 'warning';
  }
  if (feedbackStatus.unlocked === false) {
    return 'neutral';
  }
  return 'info';
}

function getReleaseLabel(feedbackStatus: AttemptResult['feedbackStatus']) {
  if (!feedbackStatus) return 'Released';
  if (feedbackStatus.level === 'immediate') return 'Score only';
  if (feedbackStatus.level === 'detailed' && feedbackStatus.unlocked === false) return 'Hints available';
  if (feedbackStatus.unlocked === false) return `Review in ${feedbackStatus.hoursRemaining ?? 0}h`;
  return 'Review unlocked';
}

function buildVisibilityItems(result: AttemptResult, showQuestionReview: boolean) {
  const isFileUpload = result.assessment?.type === 'file_upload';

  return [
    {
      label: 'Score',
      value: result.score !== null ? 'Available' : 'Hidden until released',
    },
    {
      label: 'Teacher feedback',
      value: result.teacherFeedback ? 'Available' : 'Not yet provided',
    },
    {
      label: isFileUpload ? 'Rubric breakdown' : 'Answer review',
      value: isFileUpload
        ? ((result.rubricScores?.length ?? 0) > 0 ? 'Available' : 'Not attached')
        : (showQuestionReview ? 'Available' : 'Locked for this result release'),
    },
  ];
}

function getResponseAnswerText(response: AttemptResult['responses'][number]) {
  const options = response.question?.options || [];

  if (response.selectedOptionId) {
    return options.find((option) => option.id === response.selectedOptionId)?.text || response.selectedOptionId;
  }

  if (response.selectedOptionIds && response.selectedOptionIds.length > 0) {
    return response.selectedOptionIds
      .map((id) => options.find((option) => option.id === id)?.text || id)
      .join(', ');
  }

  if (response.studentAnswer) {
    return response.studentAnswer;
  }

  return null;
}

function getCorrectAnswerText(response: AttemptResult['responses'][number]) {
  return response.question?.options
    ?.filter((option) => option.isCorrect)
    .map((option) => option.text)
    .join(', ');
}

function ResultPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'info';
}) {
  const styles = {
    neutral: 'border-slate-200 bg-slate-100 text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  } satisfies Record<string, string>;

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}

export default function StudentAssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;
  const assessmentId = params.id as string;

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorQuestionId, setMentorQuestionId] = useState<string | null>(null);
  const [mentorPrompt, setMentorPrompt] = useState('');
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorResponse, setMentorResponse] = useState<MentorExplainResponse | null>(null);
  const [hintRevealCount, setHintRevealCount] = useState(1);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, true>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'next'>('overview');

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
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!mentorResponse || !mentorQuestionId) return;
    if (ratedQuestionIds[mentorQuestionId]) return;
    setRatingOpen(true);
  }, [mentorResponse, mentorQuestionId, ratedQuestionIds]);

  useEffect(() => {
    setActiveTab('overview');
  }, [attemptId, result?.assessment?.type]);

  const handleAskJa = useCallback(async (questionId: string) => {
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
  }, [attemptId]);

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
      <div className="student-results-neutral-theme mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-2">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  if (!result) {
    return <p className="px-4 text-slate-500">Results not found.</p>;
  }

  const {
    responses,
    score,
    passed,
    isReturned,
    attemptNumber,
    teacherFeedback,
    feedbackStatus,
    rubricScores,
  } = result;
  const assessmentTitle = result.assessment?.title || 'Assessment Results';
  const pct = score ?? 0;
  const isFileUpload = result.assessment?.type === 'file_upload';
  const reviewableResponses = responses.filter((response) => typeof response.isCorrect === 'boolean');
  const correctCount = reviewableResponses.filter((response) => response.isCorrect === true).length;
  const resultSummary = reviewableResponses.length > 0
    ? `You answered ${correctCount} out of ${reviewableResponses.length} correctly.`
    : feedbackStatus?.message || 'Your score has been returned.';
  const showHintPreview = feedbackStatus?.level === 'detailed' && feedbackStatus.unlocked === false;
  const showQuestionReview =
    !isFileUpload &&
    responses.length > 0 &&
    feedbackStatus?.level !== 'immediate' &&
    feedbackStatus?.unlocked !== false;
  const hintResponses = showHintPreview
    ? responses.filter((response) => Boolean(response.hint || response.question?.content))
    : [];
  const hintSteps = buildHintSteps(mentorResponse);
  const revealedHints = hintSteps.slice(0, hintRevealCount);
  const visibilityItems = buildVisibilityItems(result, showQuestionReview);
  const submittedFiles = result.submittedFiles?.length
    ? result.submittedFiles
    : (result.submittedFile ? [result.submittedFile] : []);
  const rubricRows = (() => {
    const criteria = result.assessment?.rubricCriteria ?? [];
    return criteria.map((criterion) => ({
      criterion,
      pointsEarned: rubricScores?.find((entry) => entry.criterionId === criterion.id)?.pointsEarned ?? 0,
    }));
  })();
  const nextSteps = (() => {
    const steps: Array<{ label: string; onClick: () => void; tone?: 'primary' | 'secondary' }> = [];

    if (showQuestionReview) {
      steps.push({
        label: 'Review Answers',
        onClick: () => {
          const reviewSection = document.getElementById('student-results-question-review');
          reviewSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        tone: 'primary',
      });
    }

    if (isFileUpload && submittedFiles.length > 0) {
      steps.push({
        label: 'View Submission Files',
        onClick: () => {
          const section = document.getElementById('student-results-submission');
          section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      });
    }

    if (!isFileUpload && responses.some((response) => response.isCorrect === false)) {
      steps.push({
        label: 'Ask JA for Help',
        onClick: () => {
          const firstMissed = responses.find((response) => response.isCorrect === false);
          if (firstMissed) {
            void handleAskJa(firstMissed.questionId);
          }
        },
      });
    }

    steps.push({
      label: 'Back to Assessment',
      onClick: () => router.push(`/dashboard/student/assessments/${assessmentId}`),
    });
    steps.push({
      label: 'Go to Class Assignments',
      onClick: () => router.push('/dashboard/student/classes'),
    });

    return steps;
  })();
  const showReviewTabContent = activeTab === 'review';
  const showNextTabContent = activeTab === 'next';

  if (isReturned === false) {
    return (
      <div className="student-results-neutral-theme mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}`)}
          className="text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-500">
              <Hourglass className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Awaiting Teacher Review</h2>
            <p className="max-w-md text-sm text-slate-600">
              Your submission is complete. Your teacher will return the grade and feedback soon.
            </p>
          </div>
        </StudentActionCard>
      </div>
    );
  }

  return (
    <div className="student-results-neutral-theme mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-2">
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}`)}
            className="text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>

        <div>
          <StudentActionCard className="border border-slate-200 bg-white shadow-[0_22px_44px_-34px_rgba(15,23,42,0.4)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assessment Result</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">{assessmentTitle}</h1>
                <p className="max-w-2xl text-sm text-slate-600">{resultSummary}</p>
              </div>
              <ResultPill tone={passed ? 'success' : 'warning'}>
                {passed ? 'Passed' : 'Needs Improvement'}
              </ResultPill>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Score</p>
                <p className="mt-2 text-4xl font-black leading-none text-slate-950">{pct}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {reviewableResponses.length > 0 ? 'Correct' : 'Review'}
                </p>
                <p className="mt-2 text-4xl font-black leading-none text-slate-950">
                  {reviewableResponses.length > 0 ? correctCount : 'Locked'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Attempt</p>
                <p className="mt-2 text-4xl font-black leading-none text-slate-950">#{attemptNumber ?? '?'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Returned</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">
                  {formatDateTime((result as AttemptResult & { returnedAt?: string }).returnedAt) ?? 'Recorded'}
                </p>
              </div>
            </div>
          </StudentActionCard>
        </div>

        <div>
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.45)]">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'review', label: 'Review' },
              { id: 'next', label: 'Next Step' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'overview' | 'review' | 'next')}
                className={
                  activeTab === tab.id
                    ? 'rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
                    : 'rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900'
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-4">
            <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
              <StudentSectionHeader
                title="What You Can See Now"
                subtitle="This is what is currently visible for this result."
                className="[&_h2]:text-slate-900 [&_p]:text-slate-600"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {visibilityItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </StudentActionCard>

            {feedbackStatus?.message ? (
              <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Result Release</p>
                    <p className="mt-1 text-sm text-slate-600">{feedbackStatus.message}</p>
                  </div>
                  <ResultPill tone={getReleaseTone(feedbackStatus)}>
                    {getReleaseLabel(feedbackStatus)}
                  </ResultPill>
                </div>
              </StudentActionCard>
            ) : null}

            {teacherFeedback ? (
              <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Teacher Feedback</p>
                    <p className="mt-1 text-sm text-slate-600">{teacherFeedback}</p>
                  </div>
                </div>
              </StudentActionCard>
            ) : null}
          </div>
        ) : null}

        {showReviewTabContent && isFileUpload ? (
          <div>
            <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
              <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
                <StudentSectionHeader
                  title="Rubric Breakdown"
                  subtitle="See how your returned score was distributed across the rubric."
                  className="[&_h2]:text-slate-900 [&_p]:text-slate-600"
                />
                <div className="mt-4 space-y-3">
                  {rubricRows.length > 0 ? (
                    rubricRows.map(({ criterion, pointsEarned }: { criterion: RubricCriterion; pointsEarned: number }) => (
                      <div key={criterion.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{criterion.title}</p>
                            {criterion.description ? (
                              <p className="mt-1 text-sm text-slate-600">{criterion.description}</p>
                            ) : null}
                          </div>
                          <ResultPill tone="info">
                            {pointsEarned} / {criterion.points} pts
                          </ResultPill>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                      No rubric breakdown is attached to this result.
                    </div>
                  )}
                </div>
              </StudentActionCard>

              <div id="student-results-submission">
                <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
                  <StudentSectionHeader
                    title="Your Submission"
                    subtitle="Review the files that were included in the returned submission."
                    className="[&_h2]:text-slate-900 [&_p]:text-slate-600"
                    action={<ResultPill tone="info">{submittedFiles.length} file{submittedFiles.length === 1 ? '' : 's'}</ResultPill>}
                  />
                  <div className="mt-4 space-y-3">
                    {submittedFiles.length > 0 ? (
                      submittedFiles.map((file) => (
                        <div key={file.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="font-semibold text-slate-900">{file.originalName}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {file.mimeType} | {(file.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                        No submission files were attached to this result.
                      </div>
                    )}
                  </div>
                </StudentActionCard>
              </div>
            </div>
          </div>
        ) : null}

        {showReviewTabContent && showHintPreview ? (
          <section className="space-y-3">
            <StudentSectionHeader
              title="Study Hints"
              subtitle="Use these clues first. Full question review will unlock after the release delay."
              className="[&_h2]:text-slate-900 [&_p]:text-slate-600"
            />
            <div className="space-y-3">
              {hintResponses.map((response, index) => (
                <div key={response.questionId}>
                  <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">Question {index + 1}</p>
                      <ResultPill tone="warning">
                        <Lightbulb className="mr-1 h-3.5 w-3.5" />
                        Hint only
                      </ResultPill>
                    </div>
                    <RichTextRenderer
                      html={response.question?.content ?? '<p>No question content.</p>'}
                      className="mt-2 font-medium text-slate-900"
                    />
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {response.hint || 'Revisit the lesson and compare your process before checking the full review later.'}
                    </div>
                  </StudentActionCard>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {showReviewTabContent && !isFileUpload && showQuestionReview ? (
          <section id="student-results-question-review" className="space-y-3">
            <StudentSectionHeader
              title="Question Review"
              subtitle="Open each item to review your answer, the correct answer, and grounded support."
              className="[&_h2]:text-slate-900 [&_p]:text-slate-600"
            />
            <div className="space-y-3">
              {responses.map((response, index) => {
                const isExpanded = Boolean(expandedQuestionIds[response.questionId]);
                const answerText = getResponseAnswerText(response);
                const correctAnswerText = getCorrectAnswerText(response);
                const isAdjusted =
                  typeof response.isCorrect === 'boolean' &&
                  response.pointsEarned !== undefined &&
                  response.pointsEarned !== (response.isCorrect ? response.question?.points ?? 0 : 0);

                return (
                  <div key={response.questionId}>
                    <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
                      <button
                        type="button"
                        onClick={() => setExpandedQuestionIds((current) => {
                          const next = { ...current };
                          if (next[response.questionId]) {
                            delete next[response.questionId];
                          } else {
                            next[response.questionId] = true;
                          }
                          return next;
                        })}
                        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">Question {index + 1}</p>
                          {response.isCorrect ? (
                            <ResultPill tone="success">
                              <CircleCheckBig className="mr-1 h-3.5 w-3.5" />
                              Correct
                            </ResultPill>
                          ) : (
                            <ResultPill tone="warning">
                              <CircleX className="mr-1 h-3.5 w-3.5" />
                              Incorrect
                            </ResultPill>
                          )}
                          {isAdjusted ? (
                            <ResultPill tone="info">Manually adjusted</ResultPill>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-slate-500">
                            {response.pointsEarned ?? 0}/{response.question?.points ?? 0} pts
                          </p>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="mt-4">
                          <RichTextRenderer
                            html={response.question?.content ?? '<p>No question content.</p>'}
                            className="font-medium text-slate-900"
                          />

                          {response.question?.imageUrl ? (
                            <div className="mt-3">
                              <Image
                                src={response.question.imageUrl}
                                alt="Question"
                                width={960}
                                height={540}
                                unoptimized
                                className="max-h-48 h-auto w-auto rounded-xl border border-slate-200 object-contain"
                              />
                            </div>
                          ) : null}

                          <div className="mt-3 space-y-2 text-sm">
                            <p>
                              <span className="text-slate-500">Your answer: </span>
                              <span className="font-semibold text-slate-900">{answerText ?? 'No answer provided'}</span>
                            </p>

                            {response.isCorrect === false && correctAnswerText ? (
                              <p>
                                <span className="text-slate-500">Correct answer: </span>
                                <span className="font-semibold text-emerald-700">{correctAnswerText}</span>
                              </p>
                            ) : null}
                          </div>

                          {response.question?.explanation ? (
                            <RichTextRenderer
                              html={response.question.explanation}
                              className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800"
                            />
                          ) : null}

                          {response.isCorrect === false ? (
                            <div className="mt-4 flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => void handleAskJa(response.questionId)}
                              >
                                Ask Ja
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </StudentActionCard>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {showReviewTabContent && !isFileUpload && !showQuestionReview && !showHintPreview ? (
          <div>
            <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500">
                  <Hourglass className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Review Not Available Yet</p>
                  <p className="mt-1 text-sm text-slate-600">
                    This result currently shows your score only. Detailed answer review is not available for this release mode.
                  </p>
                </div>
              </div>
            </StudentActionCard>
          </div>
        ) : null}

        {showNextTabContent ? (
          <div className="space-y-4">
            <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
              <StudentSectionHeader
                title="Next Step"
                subtitle="Choose one clear action so you know what to do after viewing this result."
                className="[&_h2]:text-slate-900 [&_p]:text-slate-600"
                action={<ResultPill tone="info">Action Ready</ResultPill>}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {nextSteps.map((step) => (
                  <button
                    key={step.label}
                    type="button"
                    onClick={step.onClick}
                    className={
                      step.tone === 'primary'
                        ? 'rounded-2xl border border-slate-900 bg-slate-900 px-4 py-4 text-left text-sm font-semibold text-white transition hover:bg-slate-800'
                        : 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-semibold text-slate-800 transition hover:bg-white'
                    }
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </StudentActionCard>

            {!isFileUpload && responses.some((response) => response.isCorrect === false) ? (
              <StudentActionCard className="border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-600">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Need extra help?</p>
                    <p className="mt-1 text-sm text-slate-600">
                      JA can walk you through one missed item step by step without dumping the full answer immediately.
                    </p>
                  </div>
                </div>
              </StudentActionCard>
            ) : null}
          </div>
        ) : null}
      </div>

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
              onChange={(event) => setMentorPrompt(event.target.value)}
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
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--student-text-muted)]">
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
              {hintRevealCount < hintSteps.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setHintRevealCount((current) => Math.min(current + 1, hintSteps.length))}
                >
                  Reveal Next Hint
                </Button>
              ) : null}
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

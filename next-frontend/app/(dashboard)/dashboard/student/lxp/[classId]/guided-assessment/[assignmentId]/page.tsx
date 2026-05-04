'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Lightbulb, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentObjectiveAssessmentSurface } from '@/components/student/assessment/StudentObjectiveAssessmentSurface';
import { lxpService } from '@/services/lxp-service';
import type { SharedQuestionType } from '@/components/assessment/shared-answer-input';

function resolveParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function promptToHtml(value: string) {
  return value
    .split('\n')
    .map((line) => `<p>${line}</p>`)
    .join('');
}

export default function StudentGuidedAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const classId = resolveParam(params.classId);
  const assignmentId = resolveParam(params.assignmentId);
  const returnHref = `/dashboard/student/lxp/${encodeURIComponent(classId)}?tab=replays`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Awaited<
    ReturnType<typeof lxpService.startGuidedAssessment>
  >['data'] | null>(null);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof lxpService.getGuidedAssessmentResult>
  >['data'] | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [hintedQuestionIds, setHintedQuestionIds] = useState<string[]>([]);

  const fetchSession = useCallback(async () => {
    if (!classId || !assignmentId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await lxpService.startGuidedAssessment(classId, assignmentId);
      setSession(response.data);
      setCurrentIdx(response.data.attempt.currentQuestionIndex ?? 0);
      const restoredResponses = Object.fromEntries(
        (response.data.attempt.responses ?? []).map((entry) => [
          entry.questionId,
          entry.answer as string | string[],
        ]),
      );
      setResponses(restoredResponses);
      setHintedQuestionIds(response.data.attempt.hintedQuestionIds ?? []);

      if (response.data.attempt.status === 'submitted') {
        const resultResponse = await lxpService.getGuidedAssessmentResult(classId, assignmentId);
        setResult(resultResponse.data);
      } else {
        setResult(null);
      }
    } catch (err) {
      console.error('Failed to load guided assessment session', err);
      setError('The guided remedial assessment could not be loaded right now.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, classId]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const questions = session?.guidedAssessment?.questions ?? [];
  const activeQuestion = questions[currentIdx];
  const questionIds = questions.map((question) => question.id);
  const answeredById = Object.fromEntries(
    questionIds.map((id) => {
      const answer = responses[id];
      const answered = Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
      return [id, answered];
    }),
  );

  const persistProgress = useCallback(async () => {
    if (!session || result) return;
    try {
      setSaving(true);
      const response = await lxpService.updateGuidedAssessmentProgress(classId, assignmentId, {
        currentQuestionIndex: currentIdx,
        hintedQuestionIds,
        responses: Object.entries(responses).map(([questionId, answer]) => ({
          questionId,
          answer,
          explanationShown: false,
        })),
      });
      setSession((current) => (current ? { ...current, attempt: response.data.attempt } : current));
    } catch (err) {
      console.error('Failed to persist guided assessment progress', err);
    } finally {
      setSaving(false);
    }
  }, [assignmentId, classId, currentIdx, hintedQuestionIds, responses, result, session]);

  useEffect(() => {
    if (!session || result) return;
    const timeoutId = window.setTimeout(() => {
      void persistProgress();
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [persistProgress, result, session]);

  const handleHint = () => {
    if (!activeQuestion) return;
    setHintedQuestionIds((current) =>
      current.includes(activeQuestion.id) ? current : [...current, activeQuestion.id],
    );
  };

  const handleSubmit = async () => {
    if (!session) return;
    try {
      setSubmitting(true);
      const response = await lxpService.submitGuidedAssessment(classId, assignmentId, {
        hintedQuestionIds,
        responses: questionIds.map((questionId) => ({
          questionId,
          answer: responses[questionId],
          explanationShown: true,
        })),
      });
      setResult(response.data);
      toast.success('Guided assessment submitted.');
    } catch (err) {
      console.error('Failed to submit guided assessment', err);
      setError('The guided remedial assessment could not be submitted right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentAnswer = activeQuestion ? responses[activeQuestion.id] : undefined;
  const hintVisible = activeQuestion ? hintedQuestionIds.includes(activeQuestion.id) : false;
  const explanationVisible = Boolean(
    activeQuestion &&
      ((Array.isArray(currentAnswer) && currentAnswer.length > 0) ||
        (!Array.isArray(currentAnswer) && currentAnswer)),
  );
  const progressValue = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;
  const resultByQuestionId = useMemo(
    () =>
      Object.fromEntries(
        (result?.responses ?? []).map((entry) => [entry.questionId, entry]),
      ),
    [result?.responses],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-[32rem] rounded-3xl" />
      </div>
    );
  }

  if (error || (!session && !result)) {
    return (
      <section className="teacher-class-workspace__not-found">
        <p>{error || 'Guided remedial assessment not found.'}</p>
        <Link href={returnHref}>Back to Learners Path</Link>
      </section>
    );
  }

  if (result && session) {
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => router.push(returnHref)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learners Path
          </Button>
          <Badge variant="secondary">Submitted</Badge>
        </header>

        <Card className="student-card">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-[#102744]">
              <CheckCircle2 className="h-5 w-5 text-[#109c4a]" />
              <h1 className="text-2xl font-semibold">{session.guidedAssessment.title}</h1>
            </div>
            <p className="text-sm text-[#5f6b84]">
              Score: <strong>{result.scorePercent}%</strong> ({result.correctCount} correct)
            </p>
            {result.formativeSummary && typeof result.formativeSummary === 'object' ? (
              <div className="rounded-2xl border border-[#d9e3f0] bg-[#f8fbff] p-4 text-sm text-[#30415d]">
                <strong className="block text-[#102744]">Formative summary</strong>
                {'improvedConcepts' in result.formativeSummary &&
                Array.isArray(result.formativeSummary.improvedConcepts) ? (
                  <p className="mt-2">
                    Improved: {result.formativeSummary.improvedConcepts.join(', ') || 'None yet'}
                  </p>
                ) : null}
                {'stillWeakConcepts' in result.formativeSummary &&
                Array.isArray(result.formativeSummary.stillWeakConcepts) ? (
                  <p className="mt-2">
                    Still weak: {result.formativeSummary.stillWeakConcepts.join(', ') || 'None listed'}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-3">
              {(session.guidedAssessment.questions ?? []).map((question, index) => {
                const response = resultByQuestionId[question.id];
                return (
                  <article key={question.id} className="rounded-2xl border border-[#d9e3f0] bg-white p-4">
                    <strong className="block text-sm text-[#102744]">
                      Q{index + 1}. {question.stem}
                    </strong>
                    {response ? (
                      <p className="mt-2 text-xs font-medium text-[#5f6b84]">
                        {response.isCorrect ? 'Correct' : 'Needs review'}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-[#5f6b84]">{question.explanation}</p>
                  </article>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !activeQuestion) {
    return null;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push(returnHref)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learners Path
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{saving ? 'Saving progress...' : 'LXP-only guided attempt'}</Badge>
          <Badge variant="secondary">{session.attempt.status}</Badge>
        </div>
      </header>

      <StudentObjectiveAssessmentSurface
        title={session.guidedAssessment.title}
        questionLabel={`Guided remedial question ${currentIdx + 1} of ${questions.length}`}
        progressValue={progressValue}
        question={{
          id: activeQuestion.id,
          type: activeQuestion.type as SharedQuestionType,
          promptHtml: promptToHtml(activeQuestion.stem),
          options: (activeQuestion.options ?? []).map((option) => ({
            id: option.id,
            text: option.text,
          })),
        }}
        currentIdx={currentIdx}
        questionIds={questionIds}
        answeredById={answeredById}
        navigationLocked={false}
        value={currentAnswer}
        onChange={(value) =>
          setResponses((current) => ({
            ...current,
            [activeQuestion.id]: value,
          }))
        }
        onNavigate={(index) => setCurrentIdx(index)}
        statusChips={
          <>
            <Badge variant="outline">Hints on demand</Badge>
            <Badge variant="secondary">Explanation after answer</Badge>
          </>
        }
        metaBadges={
          <>
            <Badge variant="outline">{activeQuestion.type.replace('_', ' ')}</Badge>
            {activeQuestion.weakConceptTag ? (
              <Badge variant="secondary">{activeQuestion.weakConceptTag}</Badge>
            ) : null}
          </>
        }
        promptSupplement={
          hintVisible && activeQuestion.hint ? (
            <div className="rounded-2xl border border-[#f0d7df] bg-[#fff7f9] p-4 text-sm text-[#6a4f5b]">
              <strong className="block text-[#102744]">Hint</strong>
              <p className="mt-2">{activeQuestion.hint}</p>
            </div>
          ) : null
        }
        feedback={
          explanationVisible ? (
            <div className="rounded-2xl border border-[#d9e3f0] bg-[#f8fbff] p-4 text-sm text-[#30415d]">
              <strong className="block text-[#102744]">Explanation</strong>
              <p className="mt-2">{activeQuestion.explanation}</p>
            </div>
          ) : null
        }
        footerLeft={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleHint}>
              <Lightbulb className="mr-2 h-4 w-4" />
              {hintVisible ? 'Hint unlocked' : 'Show hint'}
            </Button>
            <span className="text-xs font-medium text-[#7b8aa5]">
              Optional hints before answer. Explanation appears after you respond.
            </span>
          </div>
        }
        footerRight={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentIdx((current) => Math.max(0, current - 1))}
              disabled={currentIdx === 0}
            >
              Previous
            </Button>
            {currentIdx < questions.length - 1 ? (
              <Button
                type="button"
                onClick={() =>
                  setCurrentIdx((current) => Math.min(questions.length - 1, current + 1))
                }
              >
                Next
              </Button>
            ) : (
              <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
                <Send className="mr-2 h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit guided assessment'}
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-[#f0d7df] bg-[#fff7f9] px-4 py-3 text-sm font-medium text-[#6a4f5b]">
        This guided remedial assessment is part of your Learners Path only. It supports remediation and teacher reference, not an official class-record grade.
      </div>
    </div>
  );
}

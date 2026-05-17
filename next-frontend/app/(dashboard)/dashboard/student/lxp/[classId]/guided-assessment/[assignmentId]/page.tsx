"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lightbulb, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentObjectiveAssessmentSurface } from "@/components/student/assessment/StudentObjectiveAssessmentSurface";
import { StudentStatusChip } from "@/components/student/student-primitives";
import { lxpService } from "@/services/lxp-service";
import type { SharedQuestionType } from "@/components/assessment/shared-answer-input";
import type { GuidedAssessmentQuestion } from "@/types/lxp";
import "../../../../assessments/[id]/take/take-page.css";

function resolveParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function promptToHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function isAnswered(answer: string | string[] | undefined) {
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
}

function formatAnswer(
  question: GuidedAssessmentQuestion | undefined,
  answer: string | string[] | undefined,
) {
  if (!question || answer === undefined || answer === null) return "No answer";
  const ids = Array.isArray(answer) ? answer : [answer];
  const labels = ids
    .map(
      (id) =>
        question.options.find((option) => option.id === id)?.text ?? String(id),
    )
    .filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "No answer";
}

function formatCorrectAnswer(question: GuidedAssessmentQuestion) {
  const labels = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.text)
    .filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "Answer key unavailable";
}

function isGuidedAnswerCorrect(
  question: GuidedAssessmentQuestion | undefined,
  answer: string | string[] | undefined,
) {
  if (!question || answer === undefined || answer === null) return false;
  const correctIds = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.id)
    .sort();
  if (correctIds.length === 0) return false;

  if (Array.isArray(answer)) {
    const selectedIds = [...answer].sort();
    return (
      selectedIds.length === correctIds.length &&
      selectedIds.every((id, index) => id === correctIds[index])
    );
  }

  return correctIds.includes(answer);
}

function formatComparisonScore(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(1) + "%" : "No baseline";
}

function formatComparisonDelta(value: number | null | undefined) {
  if (typeof value !== "number") return "Baseline unavailable";
  const sign = value > 0 ? "+" : "";
  return sign + value.toFixed(1) + " pts";
}

function getComparisonCopy(trend: string | undefined) {
  if (trend === "improved") return "Improved after intervention";
  if (trend === "declined") return "Needs another guided review";
  if (trend === "unchanged") return "Steady score";
  return "Baseline quiz not found";
}

export default function StudentGuidedAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const classId = resolveParam(params.classId);
  const assignmentId = resolveParam(params.assignmentId);
  const returnHref = `/dashboard/student/lxp/${encodeURIComponent(classId)}?tab=replays`;

  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof lxpService.startGuidedAssessment>>["data"] | null
  >(null);
  const [result, setResult] = useState<
    | Awaited<ReturnType<typeof lxpService.getGuidedAssessmentResult>>["data"]
    | null
  >(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>(
    {},
  );
  const [hintedQuestionIds, setHintedQuestionIds] = useState<string[]>([]);

  const fetchSession = useCallback(async () => {
    if (!classId || !assignmentId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await lxpService.startGuidedAssessment(
        classId,
        assignmentId,
      );
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

      if (response.data.attempt.status === "submitted") {
        const resultResponse = await lxpService.getGuidedAssessmentResult(
          classId,
          assignmentId,
        );
        setResult(resultResponse.data);
      } else {
        setResult(null);
      }
    } catch (err) {
      console.error("Failed to load guided assessment session", err);
      setError("The guided remedial assessment could not be loaded right now.");
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
    questionIds.map((id) => [id, isAnswered(responses[id])]),
  );
  const answeredCount = Object.values(answeredById).filter(Boolean).length;

  const persistProgress = useCallback(async () => {
    if (!session || result) return;
    try {
      setSaving(true);
      const response = await lxpService.updateGuidedAssessmentProgress(
        classId,
        assignmentId,
        {
          currentQuestionIndex: currentIdx,
          hintedQuestionIds,
          responses: Object.entries(responses).map(([questionId, answer]) => ({
            questionId,
            answer,
            explanationShown: false,
          })),
        },
      );
      setSession((current) =>
        current ? { ...current, attempt: response.data.attempt } : current,
      );
    } catch (err) {
      console.error("Failed to persist guided assessment progress", err);
    } finally {
      setSaving(false);
    }
  }, [
    assignmentId,
    classId,
    currentIdx,
    hintedQuestionIds,
    responses,
    result,
    session,
  ]);

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
      current.includes(activeQuestion.id)
        ? current
        : [...current, activeQuestion.id],
    );
  };

  const handleSubmit = async () => {
    if (!session) return;
    try {
      setSubmitting(true);
      const response = await lxpService.submitGuidedAssessment(
        classId,
        assignmentId,
        {
          hintedQuestionIds,
          responses: questionIds.map((questionId) => ({
            questionId,
            answer: responses[questionId],
            explanationShown: true,
          })),
        },
      );
      setResult(response.data);
      toast.success("Guided assessment submitted.");
    } catch (err) {
      console.error("Failed to submit guided assessment", err);
      setError(
        "The guided remedial assessment could not be submitted right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentAnswer = activeQuestion
    ? responses[activeQuestion.id]
    : undefined;
  const hintVisible = activeQuestion
    ? hintedQuestionIds.includes(activeQuestion.id)
    : false;
  const explanationVisible = Boolean(
    activeQuestion &&
    ((Array.isArray(currentAnswer) && currentAnswer.length > 0) ||
      (!Array.isArray(currentAnswer) && currentAnswer)),
  );
  const currentAnswerCorrect = isGuidedAnswerCorrect(
    activeQuestion,
    currentAnswer,
  );
  const progressValue =
    questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;
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
        <p>{error || "Guided remedial assessment not found."}</p>
        <Link href={returnHref}>Back to Learners Path</Link>
      </section>
    );
  }

  if (result && session) {
    const correctQuestions = (session.guidedAssessment.questions ?? []).filter(
      (question) => Boolean(resultByQuestionId[question.id]?.isCorrect),
    );
    const reviewQuestions = (session.guidedAssessment.questions ?? []).filter(
      (question) => !resultByQuestionId[question.id]?.isCorrect,
    );

    const renderResultQuestion = (
      question: GuidedAssessmentQuestion,
      index: number,
    ) => {
      const response = resultByQuestionId[question.id];
      return (
        <article
          key={question.id}
          className="guided-result-question rounded-xl border border-[var(--student-outline)] bg-[var(--student-elevated)] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <strong className="block min-w-0 text-sm text-[var(--student-text-strong)]">
              Q{index + 1}. {question.stem}
            </strong>
            <StudentStatusChip
              tone={response?.isCorrect ? "success" : "warning"}
            >
              {response?.isCorrect ? "Correct" : "Review"}
            </StudentStatusChip>
          </div>
          <div className="guided-answer-feedback__summary mt-3 grid gap-2 text-sm text-[var(--student-text-soft)] sm:grid-cols-2">
            <p
              className={
                response?.isCorrect
                  ? "guided-answer-feedback__student"
                  : "guided-answer-feedback__student is-wrong"
              }
            >
              Your previous answer: {formatAnswer(question, response?.answer)}
            </p>
            <p className="guided-answer-feedback__correct">
              Correct answer: {formatCorrectAnswer(question)}
            </p>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--student-text-soft)]">
            {question.explanation}
          </p>
          {question.weakConceptTag ? (
            <p className="mt-2 text-xs font-semibold text-[var(--student-text-muted)]">
              Focus concept: {question.weakConceptTag}
            </p>
          ) : null}
        </article>
      );
    };

    return (
      <div className="student-assessment-take-theme guided-intervention-assessment relative space-y-5 overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => router.push(returnHref)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learners Path
          </Button>
          <StudentStatusChip tone="success">Submitted</StudentStatusChip>
        </header>

        <div
          className="guided-ja-corner guided-ja-corner--result"
          aria-hidden="true"
        >
          <Image
            src="/images/JA/ja_cheer.png"
            alt=""
            width={168}
            height={168}
            priority
          />
        </div>

        <Card className="student-card">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-[#102744]">
              <CheckCircle2 className="h-5 w-5 text-[#109c4a]" />
              <h1 className="text-2xl font-semibold">
                {session.guidedAssessment.title}
              </h1>
            </div>
            <p className="text-sm text-[#5f6b84]">
              Score: <strong>{result.scorePercent}%</strong> (
              {result.correctCount} correct)
            </p>
            {result.scoreComparison ? (
              <section className="rounded-3xl border border-[#b9d9ff] bg-gradient-to-br from-[#f2f8ff] via-white to-[#eaf7ff] p-4 shadow-[0_18px_38px_rgba(56,116,203,0.13)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2870c8]">
                      Before vs after
                    </p>
                    <h2 className="mt-1 text-lg font-black text-[#102744]">
                      {getComparisonCopy(result.scoreComparison.trend)}
                    </h2>
                  </div>
                  <StudentStatusChip
                    tone={result.scoreComparison.trend === "improved" ? "success" : "warning"}
                  >
                    {formatComparisonDelta(result.scoreComparison.deltaScorePercent)}
                  </StudentStatusChip>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#d8e7f8] bg-white/80 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6b7d96]">
                      Previous quiz score
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#30415d]">
                      {formatComparisonScore(result.scoreComparison.baselineScorePercent)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#bfefd7] bg-[#f1fff7] p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#198554]">
                      Current AI quiz score
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#0f7a45]">
                      {formatComparisonScore(result.scoreComparison.currentScorePercent)}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
            {result.formativeSummary &&
            typeof result.formativeSummary === "object" ? (
              <div className="rounded-2xl border border-[#d9e3f0] bg-[#f8fbff] p-4 text-sm text-[#30415d]">
                <strong className="block text-[#102744]">
                  Formative summary
                </strong>
                {"improvedConcepts" in result.formativeSummary &&
                Array.isArray(result.formativeSummary.improvedConcepts) ? (
                  <p className="mt-2">
                    Improved:{" "}
                    {result.formativeSummary.improvedConcepts.join(", ") ||
                      "None yet"}
                  </p>
                ) : null}
                {"stillWeakConcepts" in result.formativeSummary &&
                Array.isArray(result.formativeSummary.stillWeakConcepts) ? (
                  <p className="mt-2">
                    Still weak:{" "}
                    {result.formativeSummary.stillWeakConcepts.join(", ") ||
                      "None listed"}
                  </p>
                ) : null}
              </div>
            ) : null}
            <section
              role="region"
              aria-label="Correct answers"
              className="space-y-3 rounded-2xl border border-[var(--student-success-border)] bg-[var(--student-success-bg)] p-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-[var(--student-text-strong)]">
                  Correct Answers
                </h2>
                <p className="text-sm text-[var(--student-text-soft)]">
                  These items show concepts you handled correctly in this guided
                  retry.
                </p>
              </div>
              {correctQuestions.length > 0 ? (
                correctQuestions.map((question, index) =>
                  renderResultQuestion(question, index),
                )
              ) : (
                <p className="text-sm text-[var(--student-text-soft)]">
                  No correct answers yet.
                </p>
              )}
            </section>

            <section
              role="region"
              aria-label="Review these answers"
              className="space-y-3 rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-[var(--student-text-strong)]">
                  Review These Answers
                </h2>
                <p className="text-sm text-[var(--student-text-soft)]">
                  Recheck these items with the explanation and correct answer
                  before returning to the source lesson.
                </p>
              </div>
              {reviewQuestions.length > 0 ? (
                reviewQuestions.map((question, index) =>
                  renderResultQuestion(question, index),
                )
              ) : (
                <p className="text-sm text-[var(--student-text-soft)]">
                  No review items left from this attempt.
                </p>
              )}
            </section>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !activeQuestion) {
    return null;
  }

  return (
    <div className="student-assessment-take-theme guided-intervention-assessment relative space-y-4 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push(returnHref)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learners Path
        </Button>
        <div className="flex items-center gap-2">
          <StudentStatusChip tone="neutral">
            Guided remediation
          </StudentStatusChip>
          <StudentStatusChip tone="info">
            {session.attempt.status.replace("_", " ")}
          </StudentStatusChip>
        </div>
      </header>

      <div className="guided-ja-corner" aria-hidden="true">
        <Image
          src="/images/JA/ja_wave.png"
          alt=""
          width={180}
          height={180}
          priority
        />
      </div>

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
            isCorrect: option.isCorrect,
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
            <StudentStatusChip tone="info">
              {answeredCount}/{questions.length} answered
            </StudentStatusChip>
            <StudentStatusChip tone="neutral">Hints optional</StudentStatusChip>
          </>
        }
        metaBadges={
          <>
            <StudentStatusChip tone="neutral">
              {activeQuestion.type.replace("_", " ")}
            </StudentStatusChip>
            {activeQuestion.weakConceptTag ? (
              <StudentStatusChip tone="info">
                {activeQuestion.weakConceptTag}
              </StudentStatusChip>
            ) : null}
          </>
        }
        promptSupplement={
          hintVisible && activeQuestion.hint ? (
            <div
              data-testid="guided-hint-panel"
              className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4 text-sm text-[var(--student-text-soft)]"
            >
              <strong className="block text-[#102744]">Hint</strong>
              <p className="mt-2">{activeQuestion.hint}</p>
            </div>
          ) : null
        }
        showCorrectness={explanationVisible}
        feedback={
          explanationVisible ? (
            <div
              className={`guided-answer-feedback rounded-3xl border p-4 text-sm ${
                currentAnswerCorrect
                  ? "guided-answer-feedback--correct"
                  : "guided-answer-feedback--review"
              }`}
              aria-live="polite"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="block text-base text-[#102744]">
                    {currentAnswerCorrect
                      ? "Nice hit. You got it."
                      : "Good try. Here is the answer key."}
                  </strong>
                  <div className="guided-answer-feedback__summary mt-3 grid gap-2 sm:grid-cols-2">
                    <p
                      className={
                        currentAnswerCorrect
                          ? "guided-answer-feedback__student"
                          : "guided-answer-feedback__student is-wrong"
                      }
                    >
                      Your previous answer:{" "}
                      {formatAnswer(activeQuestion, currentAnswer)}
                    </p>
                    <p className="guided-answer-feedback__correct">
                      Correct answer:{" "}
                      {activeQuestion
                        ? formatCorrectAnswer(activeQuestion)
                        : "Answer key unavailable"}
                    </p>
                  </div>
                </div>
                <StudentStatusChip
                  tone={currentAnswerCorrect ? "success" : "warning"}
                >
                  {currentAnswerCorrect ? "Correct" : "Review"}
                </StudentStatusChip>
              </div>
              <div className="guided-answer-feedback__explanation mt-3 rounded-2xl border border-white/70 bg-white/70 p-3">
                <strong className="block text-[#102744]">Why this works</strong>
                <p className="mt-2">
                  {activeQuestion?.explanation}
                  {!currentAnswerCorrect && activeQuestion
                    ? ` Correct answer: ${formatCorrectAnswer(activeQuestion)}.`
                    : ""}
                </p>
              </div>
            </div>
          ) : null
        }
        footerLeft={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleHint}>
              <Lightbulb className="mr-2 h-4 w-4" />
              {hintVisible ? "Hint unlocked" : "Show hint"}
            </Button>
            <span className="text-xs font-medium text-[#7b8aa5]">
              Optional hints before answer. Explanation appears after you
              respond.
            </span>
          </div>
        }
        footerRight={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setCurrentIdx((current) => Math.max(0, current - 1))
              }
              disabled={currentIdx === 0}
            >
              Previous
            </Button>
            {currentIdx < questions.length - 1 ? (
              <Button
                type="button"
                onClick={() =>
                  setCurrentIdx((current) =>
                    Math.min(questions.length - 1, current + 1),
                  )
                }
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Submitting..." : "Submit guided assessment"}
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-4 py-3 text-sm font-medium text-[var(--student-text-soft)]">
        This guided remedial assessment is part of your Learners Path only. It
        supports remediation and teacher reference, not an official class-record
        grade.
      </div>
    </div>
  );
}

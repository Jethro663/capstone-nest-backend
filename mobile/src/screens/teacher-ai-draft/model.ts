import type { AiClassIndexStatus, QuizDraftStructuredOutput } from "../../types/ai";

export function isGenerationReady(status: AiClassIndexStatus | null): boolean {
  return Boolean(status && status.chunksIndexed > 0 && !status.needsReindex && !status.isStale);
}

export function canGenerateQuizDraft(
  status: AiClassIndexStatus | null,
  useAllReadySources: boolean,
  lessonIds: string[],
  extractionIds: string[],
): boolean {
  if (!isGenerationReady(status)) return false;
  return useAllReadySources || lessonIds.length + extractionIds.length > 0;
}

export function buildQuizDraftSourceFields(
  useAllReadySources: boolean,
  lessonIds: string[],
  extractionIds: string[],
) {
  return useAllReadySources
    ? { lessonIds: undefined, extractionIds: undefined }
    : { lessonIds, extractionIds };
}

function recomputeReviewState(draft: QuizDraftStructuredOutput): QuizDraftStructuredOutput {
  const issues = draft.reviewIssues ?? [];
  const unresolved = issues.filter(
    (issue) => !issue.resolved && (issue.severity === "blocking" || issue.severity === "warning"),
  );
  const hasBlocking = unresolved.some((issue) => issue.severity === "blocking");

  return {
    ...draft,
    qualityGate: hasBlocking ? "fail" : issues.length > 0 ? "warn" : "pass",
    reviewRequired: unresolved.length > 0,
    reviewState: unresolved.length > 0 ? "needs_review" : "ready",
  };
}

export function markQuestionReviewed(
  draft: QuizDraftStructuredOutput,
  questionIndex: number,
): QuizDraftStructuredOutput {
  return recomputeReviewState({
    ...draft,
    questions: draft.questions.map((question, index) =>
      index === questionIndex ? { ...question, reviewed: true } : question,
    ),
    reviewIssues: (draft.reviewIssues ?? []).map((issue) =>
      issue.questionIndex === questionIndex
        ? { ...issue, resolved: true, resolution: "teacher_reviewed" }
        : issue,
    ),
  });
}

export function acceptReviewWarning(
  draft: QuizDraftStructuredOutput,
  issueId: string,
): QuizDraftStructuredOutput {
  return recomputeReviewState({
    ...draft,
    reviewIssues: (draft.reviewIssues ?? []).map((issue) =>
      issue.id === issueId && issue.severity === "warning"
        ? { ...issue, resolved: true, resolution: "teacher_accepted_warning" }
        : issue,
    ),
  });
}

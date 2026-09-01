import type { AiClassIndexStatus, QuizDraftStructuredOutput } from "../../types/ai";

export type AiDraftPolicyStatus = "loading" | "error" | "ready";
export type AiDraftIndexReadiness = "unavailable" | "stale" | "empty" | "ready";
export interface AiDraftReadinessInput {
  policyStatus: AiDraftPolicyStatus;
  classActive: boolean;
  historicalClass: boolean;
  validQuarter: boolean;
  hasRunningJob: boolean;
  validQuestionCount: boolean;
  indexStatus: AiDraftIndexReadiness;
  hasReadySource: boolean;
  hasSelectedSource: boolean;
  submitting: boolean;
}
export interface AiDraftReadinessBlocker {
  code: string;
  message: string;
  canReindex: boolean;
}

export function getAiDraftReadinessBlockers(
  input: AiDraftReadinessInput,
): AiDraftReadinessBlocker[] {
  const blockers: AiDraftReadinessBlocker[] = [];
  if (input.policyStatus === "loading")
    blockers.push({ code: "policy_loading", message: "Wait for the class academic policy to load.", canReindex: false });
  else if (input.policyStatus === "error")
    blockers.push({ code: "policy_error", message: "Reload the academic policy before generating.", canReindex: false });
  if (!input.classActive)
    blockers.push({ code: "inactive_class", message: "AI Draft is unavailable because this class is inactive.", canReindex: false });
  if (input.historicalClass)
    blockers.push({ code: "historical_class", message: "AI Draft cannot prepare assessments for a historical class.", canReindex: false });
  if (!input.validQuarter)
    blockers.push({ code: "invalid_quarter", message: "Choose a valid quarter from the class policy.", canReindex: false });
  if (input.hasRunningJob)
    blockers.push({ code: "running_job", message: "Wait for the current AI generation job to finish.", canReindex: false });
  if (!input.validQuestionCount)
    blockers.push({ code: "invalid_question_count", message: "Enter a whole-number question count from 1 to 15.", canReindex: false });
  if (input.indexStatus !== "ready")
    blockers.push({
      code: `index_${input.indexStatus}`,
      message:
        input.indexStatus === "unavailable"
          ? "AI source readiness is unavailable. Retry or reindex when the service is ready."
          : input.indexStatus === "stale"
            ? "The class source index is stale. Reindex before generating."
            : "The class source index is empty. Reindex ready class sources.",
      canReindex: true,
    });
  if (!input.hasReadySource)
    blockers.push({ code: "no_ready_source", message: "No indexed class source is ready.", canReindex: false });
  if (!input.hasSelectedSource)
    blockers.push({ code: "no_source_selected", message: "Select a ready source or use all ready sources.", canReindex: false });
  if (input.submitting)
    blockers.push({ code: "submitting", message: "The generation request is already in progress.", canReindex: false });
  return blockers;
}

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

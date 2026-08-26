import type { AiClassIndexStatus, QuizDraftStructuredOutput } from "../../types/ai";
import {
  acceptReviewWarning,
  buildQuizDraftSourceFields,
  canGenerateQuizDraft,
  isGenerationReady,
  markQuestionReviewed,
} from "../teacher-ai-draft/model";

const readyStatus: AiClassIndexStatus = {
  classId: "class-1",
  chunksIndexed: 6,
  lessonChunks: 4,
  extractionChunks: 2,
  questionChunks: 0,
  isStale: false,
  needsReindex: false,
  readyLessons: [],
  lessonBlockers: [],
  readyExtractions: [],
  extractionBlockers: [],
  sourceSummary: {
    lessons: { total: 1, ready: 1, blocked: 0 },
    extractions: { total: 1, ready: 1, blocked: 0 },
    questions: { assessments: 0, assessmentsWithQuestions: 0, questionCount: 0, needsIndex: 0 },
  },
};

it("rejects stale, reindex-required, or empty index status", () => {
  expect(isGenerationReady({ ...readyStatus, needsReindex: true })).toBe(false);
  expect(isGenerationReady({ ...readyStatus, isStale: true })).toBe(false);
  expect(isGenerationReady({ ...readyStatus, chunksIndexed: 0 })).toBe(false);
  expect(isGenerationReady(readyStatus)).toBe(true);
});

it("requires explicit selection when all sources is disabled", () => {
  expect(canGenerateQuizDraft(readyStatus, true, [], [])).toBe(true);
  expect(canGenerateQuizDraft(readyStatus, false, [], [])).toBe(false);
  expect(canGenerateQuizDraft(readyStatus, false, ["lesson-1"], [])).toBe(true);
});

it("builds selected and all-source payload fields", () => {
  expect(buildQuizDraftSourceFields(true, [], [])).toEqual({
    lessonIds: undefined,
    extractionIds: undefined,
  });
  expect(buildQuizDraftSourceFields(false, ["lesson-1"], ["extraction-1"])).toEqual({
    lessonIds: ["lesson-1"],
    extractionIds: ["extraction-1"],
  });
});

it("resolves question issues and warning issues deterministically", () => {
  const draft: QuizDraftStructuredOutput = {
    title: "Quiz",
    questions: [{ id: "question-1", content: "What is 1/2?", type: "multiple_choice" }],
    reviewRequired: true,
    reviewState: "needs_review",
    reviewIssues: [
      {
        id: "issue-1",
        code: "weak_grounding",
        severity: "blocking",
        scope: "question",
        message: "Review",
        questionIndex: 0,
        resolved: false,
      },
      {
        id: "issue-2",
        code: "wording",
        severity: "warning",
        scope: "draft",
        message: "Check wording",
        resolved: false,
      },
    ],
  };

  const reviewed = markQuestionReviewed(draft, 0);
  const accepted = acceptReviewWarning(reviewed, "issue-2");

  expect(accepted.questions[0].reviewed).toBe(true);
  expect(accepted.reviewIssues?.every((issue) => issue.resolved)).toBe(true);
  expect(accepted.reviewRequired).toBe(false);
  expect(accepted.reviewState).toBe("ready");
  expect(accepted.qualityGate).toBe("warn");
});

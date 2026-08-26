# Mobile Teacher AI Draft Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the teacher mobile AI quiz-draft flow reliably select published indexed class sources, queue and recover generation jobs, review generated questions, apply valid drafts, and navigate using the real assessment ID.

**Architecture:** Keep NestJS and `ai-service` as the authoritative contract and change the mobile client to consume that contract exactly. Split pure source-selection/review state from the React Native screen so payload and apply rules can be unit tested without rendering the entire screen. Preserve the existing backend queue and AI generation behavior; this change does not add draft-lesson indexing or modify official academic records.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, Axios, AsyncStorage, Jest, React Test Renderer, NestJS 11, FastAPI, BullMQ.

## Global Constraints

- Only published, indexed lessons and completed indexed extractions are selectable in this implementation.
- `allowDraftSources` is always `false`; true draft-source indexing is separate follow-up scope.
- Mobile reaches AI only through backend `/api/ai/*` routes.
- Keep the backend `success/message/data` envelope unchanged.
- Never use an AI generation `outputId` as an assessment ID.
- Applying a quiz draft must call apply preview first and must honor `canApply`, `reviewRequired`, `qualityGate`, and unresolved review issues.
- Active job recovery is keyed by class ID and stores only non-sensitive job metadata in AsyncStorage.
- Reindex requests use a 150,000 ms timeout, matching web.
- Preserve current web behavior for published indexed sources while removing unsupported draft-source selection.
- Do not change database schema, migrations, backend DTOs, BullMQ payloads, or AI generation persistence.

---

## Contract Decisions

The server contract is already authoritative:

- Index status: `GET /ai/index/classes/:classId/status`
- Reindex: `POST /ai/index/classes/:classId`
- Queue: `POST /ai/teacher/quizzes/jobs`
- Job status: `GET /ai/teacher/jobs/:jobId`
- Result: `GET /ai/teacher/jobs/:jobId/result`
- Save review: `PATCH /ai/teacher/quizzes/jobs/:jobId/draft`
- Apply preview: `POST /ai/teacher/quizzes/jobs/:jobId/apply/preview`
- Apply: `POST /ai/teacher/quizzes/jobs/:jobId/apply`
- Retry: `POST /ai/teacher/quizzes/jobs/:jobId/retry`
- Cancel: `POST /ai/teacher/quizzes/jobs/:jobId/cancel`

The apply response is:

```ts
interface QuizDraftApplyResponse {
  jobId: string;
  outputId?: string;
  alreadyApplied: boolean;
  applyResult: {
    assessmentId: string;
    outputId?: string;
    questionsCreated?: number;
    totalPoints?: number;
    appliedAt?: string;
  };
  preview?: QuizDraftApplyPreview;
}
```

`applyResult.assessmentId` is the only value passed to `TeacherAssessmentEditor`.

## File Map

- Modify `mobile/src/types/ai.ts`: exact index, quiz draft, review, preview, apply, and request contracts.
- Modify `mobile/src/api/services/ai.ts`: typed wrappers for selection payloads, save, preview, apply, retry, cancel, and long reindex timeout.
- Modify `mobile/src/api/__tests__/ai-api.test.ts`: real-shaped contract fixtures and endpoint/payload assertions.
- Create `mobile/src/api/teacher-ai-draft-jobs.ts`: class-keyed active-job persistence.
- Create `mobile/src/api/__tests__/teacher-ai-draft-jobs.test.ts`: persistence behavior.
- Create `mobile/src/screens/teacher-ai-draft/model.ts`: pure readiness, selection, payload, and review-state helpers.
- Create `mobile/src/screens/__tests__/teacher-ai-draft-model.test.ts`: source and review state tests.
- Create `mobile/src/screens/teacher-ai-draft/TeacherAiDraftReviewPanel.tsx`: question/review/apply presentation.
- Modify `mobile/src/screens/TeacherAiDraftScreen.tsx`: orchestration, source picker, polling recovery, review actions, apply preview, and correct navigation.
- Create `mobile/src/screens/__tests__/teacher-ai-draft.test.tsx`: screen-level regression coverage.
- Modify `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.tsx`: make draft lesson blockers non-selectable and always send `allowDraftSources: false`.
- Modify `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.test.tsx`: published-only source-policy regression.

### Task 1: Align Mobile AI Contracts and Service Wrappers

**Files:**
- Modify: `mobile/src/types/ai.ts:130-164`
- Modify: `mobile/src/api/services/ai.ts:1-181`
- Test: `mobile/src/api/__tests__/ai-api.test.ts`

**Interfaces:**
- Consumes: Existing backend and AI-service response envelopes listed under Contract Decisions.
- Produces: `GenerateQuizDraftDto`, `AiClassIndexStatus`, `QuizDraftStructuredOutput`, `QuizDraftApplyPreview`, `QuizDraftApplyResponse`, `UpdateQuizDraftDto`, and typed `aiApi` methods used by later tasks.

- [ ] **Step 1: Add failing API contract tests**

Append tests that use the real server response shapes:

```ts
it("queues a quiz draft with explicit source ids", async () => {
  mockedApiClient.post.mockResolvedValue({
    data: { data: { jobId: "job-1", status: "pending", progressPercent: 5 } },
  });

  await aiApi.createQuizDraftJob({
    classId: "class-1",
    title: "Fractions quiz",
    questionCount: 5,
    questionType: "multiple_choice",
    assessmentType: "quiz",
    passingScore: 60,
    feedbackLevel: "standard",
    classRecordCategory: "written_work",
    sourcePolicy: "published_default",
    allowDraftSources: false,
    lessonIds: ["lesson-1"],
    extractionIds: ["extraction-1"],
  });

  expect(mockedApiClient.post).toHaveBeenCalledWith(
    "/ai/teacher/quizzes/jobs",
    expect.objectContaining({
      classId: "class-1",
      lessonIds: ["lesson-1"],
      extractionIds: ["extraction-1"],
      sourcePolicy: "published_default",
      allowDraftSources: false,
    }),
  );
});

it("uses the long timeout for class reindex", async () => {
  mockedApiClient.post.mockResolvedValue({
    data: { data: { classId: "class-1", chunksIndexed: 4 } },
  });

  await aiApi.reindexClass("class-1");

  expect(mockedApiClient.post).toHaveBeenCalledWith(
    "/ai/index/classes/class-1",
    undefined,
    { timeout: 150_000 },
  );
});

it("returns the nested apply result contract", async () => {
  mockedApiClient.post.mockResolvedValue({
    data: {
      data: {
        jobId: "job-1",
        alreadyApplied: false,
        applyResult: { assessmentId: "assessment-1", outputId: "output-1" },
      },
    },
  });

  const result = await aiApi.applyQuizDraftJob("job-1");

  expect(result.applyResult.assessmentId).toBe("assessment-1");
});

it("exposes save preview retry and cancel quiz endpoints", async () => {
  mockedApiClient.patch.mockResolvedValue({
    data: { data: { jobId: "job-1", status: "completed" } },
  });
  mockedApiClient.post.mockResolvedValue({
    data: { data: { jobId: "job-1", status: "pending", canApply: true } },
  });

  await aiApi.updateQuizDraft("job-1", {
    structuredOutput: { title: "Quiz", questions: [] },
  });
  await aiApi.previewQuizDraftApply("job-1");
  await aiApi.retryQuizDraftJob("job-1");
  await aiApi.cancelQuizDraftJob("job-1");

  expect(mockedApiClient.patch).toHaveBeenCalledWith(
    "/ai/teacher/quizzes/jobs/job-1/draft",
    { structuredOutput: { title: "Quiz", questions: [] } },
  );
  expect(mockedApiClient.post).toHaveBeenCalledWith(
    "/ai/teacher/quizzes/jobs/job-1/apply/preview",
    {},
  );
  expect(mockedApiClient.post).toHaveBeenCalledWith(
    "/ai/teacher/quizzes/jobs/job-1/retry",
    {},
  );
  expect(mockedApiClient.post).toHaveBeenCalledWith(
    "/ai/teacher/quizzes/jobs/job-1/cancel",
    {},
  );
});
```

Also add `patch: jest.fn()` and `delete: jest.fn()` to the `apiClient` mock.

- [ ] **Step 2: Run the contract tests and verify failure**

Run:

```bash
npm --prefix mobile test -- --runInBand src/api/__tests__/ai-api.test.ts
```

Expected: FAIL because the new methods/types and reindex timeout are not implemented, and apply is typed as a top-level `assessmentId`.

- [ ] **Step 3: Replace the reduced mobile types with the canonical fields**

Define these interfaces in `mobile/src/types/ai.ts`:

```ts
export interface AiReadyLessonSource {
  lessonId: string;
  title: string;
  chunkCount: number;
  status: "indexed" | "ready_to_index";
  updatedAt?: string | null;
}

export interface AiLessonSourceBlocker {
  lessonId: string;
  title: string;
  reason: string;
  updatedAt?: string | null;
}

export interface AiReadyExtractionSource {
  extractionId: string;
  title: string;
  chunkCount: number;
  status: "indexed" | "ready_to_index";
  updatedAt?: string | null;
}

export interface AiExtractionSourceBlocker {
  extractionId: string;
  title: string;
  status?: string | null;
  reason: string;
  updatedAt?: string | null;
}

export interface AiClassIndexStatus {
  classId: string;
  chunksIndexed: number;
  lessonChunks: number;
  extractionChunks: number;
  questionChunks: number;
  lastIndexedAt?: string | null;
  latestSourceUpdateAt?: string | null;
  isStale: boolean;
  needsReindex: boolean;
  reason?: string | null;
  readyLessons: AiReadyLessonSource[];
  lessonBlockers: AiLessonSourceBlocker[];
  readyExtractions: AiReadyExtractionSource[];
  extractionBlockers: AiExtractionSourceBlocker[];
  sourceSummary: {
    lessons: { total: number; ready: number; blocked: number };
    extractions: { total: number; ready: number; blocked: number };
    questions: {
      assessments: number;
      assessmentsWithQuestions: number;
      questionCount: number;
      needsIndex: number;
    };
  };
}

export interface QuizDraftReviewIssue {
  id: string;
  code: string;
  severity: "blocking" | "warning" | "info" | string;
  scope: string;
  message: string;
  questionIndex?: number | null;
  optionIndex?: number | null;
  resolved: boolean;
  resolution?: string | null;
}

export interface QuizDraftStructuredOutput {
  title?: string;
  description?: string;
  questions: Array<{
    id?: string;
    content?: string;
    type?: string;
    points?: number;
    explanation?: string;
    reviewed?: boolean;
    options?: Array<{ text?: string; isCorrect?: boolean }>;
  }>;
  qualityGate?: "pass" | "warn" | "fail" | string;
  reviewRequired?: boolean;
  reviewState?: string;
  reviewIssues?: QuizDraftReviewIssue[];
  assessmentId?: string;
  audit?: { applyResult?: QuizDraftApplyResult | null; [key: string]: unknown };
}

export interface QuizDraftApplyResult {
  assessmentId: string;
  outputId?: string;
  questionsCreated?: number;
  totalPoints?: number;
  appliedAt?: string;
}

export interface QuizDraftApplyPreview {
  jobId?: string;
  outputId?: string;
  canApply: boolean;
  alreadyApplied?: boolean;
  blockedReasons: string[];
  applyResult?: QuizDraftApplyResult | null;
  assessment: {
    title: string;
    description?: string;
    totalPoints: number;
    questionCount: number;
  };
  questions?: QuizDraftStructuredOutput["questions"];
  reviewIssues?: QuizDraftReviewIssue[];
}

export interface QuizDraftApplyResponse {
  jobId: string;
  outputId?: string;
  alreadyApplied: boolean;
  applyResult: QuizDraftApplyResult;
  preview?: QuizDraftApplyPreview;
}

export interface GenerateQuizDraftDto {
  classId: string;
  lessonIds?: string[];
  extractionIds?: string[];
  title?: string;
  questionCount: number;
  questionType: string;
  assessmentType: "quiz";
  passingScore: number;
  teacherNote?: string;
  feedbackLevel: "standard";
  classRecordCategory: "written_work";
  sourcePolicy: "published_default";
  allowDraftSources: false;
}

export interface UpdateQuizDraftDto {
  structuredOutput: QuizDraftStructuredOutput;
}
```

- [ ] **Step 4: Implement the typed service methods**

Update `mobile/src/api/services/ai.ts` to accept `GenerateQuizDraftDto`, keep the current defaults in one normalization function, and add:

```ts
const AI_JOB_TIMEOUT_MS = 150_000;

async reindexClass(classId: string) {
  const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
    `/ai/index/classes/${classId}`,
    undefined,
    { timeout: AI_JOB_TIMEOUT_MS },
  );
  return unwrapEnvelope(response.data);
},

async updateQuizDraft(jobId: string, payload: UpdateQuizDraftDto) {
  const response = await apiClient.patch<ApiEnvelope<AiGenerationJob>>(
    `/ai/teacher/quizzes/jobs/${jobId}/draft`,
    payload,
  );
  return normalizeJob(unwrapEnvelope(response.data));
},

async previewQuizDraftApply(jobId: string) {
  const response = await apiClient.post<ApiEnvelope<QuizDraftApplyPreview>>(
    `/ai/teacher/quizzes/jobs/${jobId}/apply/preview`,
    {},
  );
  return unwrapEnvelope(response.data);
},

async applyQuizDraftJob(jobId: string) {
  const response = await apiClient.post<ApiEnvelope<QuizDraftApplyResponse>>(
    `/ai/teacher/quizzes/jobs/${jobId}/apply`,
    {},
  );
  return unwrapEnvelope(response.data);
},

async retryQuizDraftJob(jobId: string) {
  const response = await apiClient.post<ApiEnvelope<AiGenerationJob>>(
    `/ai/teacher/quizzes/jobs/${jobId}/retry`,
    {},
  );
  return normalizeJob(unwrapEnvelope(response.data));
},

async cancelQuizDraftJob(jobId: string) {
  const response = await apiClient.post<ApiEnvelope<AiGenerationJob>>(
    `/ai/teacher/quizzes/jobs/${jobId}/cancel`,
    {},
  );
  return normalizeJob(unwrapEnvelope(response.data));
},
```

Do not change the backend endpoint paths or envelope unwrapping.

- [ ] **Step 5: Run the API tests and mobile typecheck**

Run:

```bash
npm --prefix mobile test -- --runInBand src/api/__tests__/ai-api.test.ts
npm --prefix mobile run typecheck
```

Expected: the API test file passes and TypeScript reports no errors.

- [ ] **Step 6: Commit the contract alignment**

```bash
git add mobile/src/types/ai.ts mobile/src/api/services/ai.ts mobile/src/api/__tests__/ai-api.test.ts
git commit -m "fix(mobile): align teacher quiz draft API contracts"
```

### Task 2: Add Pure Source Selection and Review-State Helpers

**Files:**
- Create: `mobile/src/screens/teacher-ai-draft/model.ts`
- Test: `mobile/src/screens/__tests__/teacher-ai-draft-model.test.ts`

**Interfaces:**
- Consumes: `AiClassIndexStatus`, `GenerateQuizDraftDto`, `QuizDraftStructuredOutput`, and `QuizDraftReviewIssue` from Task 1.
- Produces: `isGenerationReady`, `canGenerateQuizDraft`, `buildQuizDraftSourceFields`, `markQuestionReviewed`, and `acceptReviewWarning`.

- [ ] **Step 1: Write failing model tests**

Create tests covering stale readiness, selected source payloads, all-source fallback, and review resolution:

```ts
import {
  acceptReviewWarning,
  buildQuizDraftSourceFields,
  canGenerateQuizDraft,
  isGenerationReady,
  markQuestionReviewed,
} from "../teacher-ai-draft/model";
import type { AiClassIndexStatus } from "../../types/ai";

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

it("rejects stale or empty index status", () => {
  expect(isGenerationReady({ ...readyStatus, needsReindex: true })).toBe(false);
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
  const draft = {
    title: "Quiz",
    questions: [{ id: "question-1", content: "What is 1/2?" }],
    reviewRequired: true,
    reviewState: "needs_review",
    reviewIssues: [
      { id: "issue-1", code: "weak_grounding", severity: "blocking", scope: "question", message: "Review", questionIndex: 0, resolved: false },
      { id: "issue-2", code: "wording", severity: "warning", scope: "draft", message: "Check wording", resolved: false },
    ],
  };

  const reviewed = markQuestionReviewed(draft, 0);
  const accepted = acceptReviewWarning(reviewed, "issue-2");

  expect(accepted.questions[0].reviewed).toBe(true);
  expect(accepted.reviewIssues?.every((issue) => issue.resolved)).toBe(true);
  expect(accepted.reviewRequired).toBe(false);
  expect(accepted.reviewState).toBe("ready");
});
```

- [ ] **Step 2: Run the model tests and verify failure**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/teacher-ai-draft-model.test.ts
```

Expected: FAIL because `model.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Create `model.ts` with exact behavior:

```ts
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
```

- [ ] **Step 4: Run model tests and typecheck**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/teacher-ai-draft-model.test.ts
npm --prefix mobile run typecheck
```

Expected: all model tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit the model**

```bash
git add mobile/src/screens/teacher-ai-draft/model.ts mobile/src/screens/__tests__/teacher-ai-draft-model.test.ts
git commit -m "test(mobile): define AI draft readiness and review rules"
```

### Task 3: Add Class-Keyed AI Draft Job Recovery

**Files:**
- Create: `mobile/src/api/teacher-ai-draft-jobs.ts`
- Test: `mobile/src/api/__tests__/teacher-ai-draft-jobs.test.ts`

**Interfaces:**
- Consumes: AsyncStorage already installed in `mobile/package.json`.
- Produces: `readTeacherAiDraftJobId`, `writeTeacherAiDraftJobId`, and `clearTeacherAiDraftJobId`.

- [ ] **Step 1: Write failing persistence tests**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearTeacherAiDraftJobId,
  readTeacherAiDraftJobId,
  writeTeacherAiDraftJobId,
} from "../teacher-ai-draft-jobs";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

it("persists reads and clears a job by class", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue("job-1");

  await writeTeacherAiDraftJobId("class-1", "job-1");
  await expect(readTeacherAiDraftJobId("class-1")).resolves.toBe("job-1");
  await clearTeacherAiDraftJobId("class-1");

  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "teacher-ai-draft:class-1:active-job",
    "job-1",
  );
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
    "teacher-ai-draft:class-1:active-job",
  );
});
```

- [ ] **Step 2: Run the persistence test and verify failure**

```bash
npm --prefix mobile test -- --runInBand src/api/__tests__/teacher-ai-draft-jobs.test.ts
```

Expected: FAIL because the persistence module does not exist.

- [ ] **Step 3: Implement the persistence module**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

function activeJobKey(classId: string) {
  return `teacher-ai-draft:${classId}:active-job`;
}

export function readTeacherAiDraftJobId(classId: string) {
  return AsyncStorage.getItem(activeJobKey(classId));
}

export function writeTeacherAiDraftJobId(classId: string, jobId: string) {
  return AsyncStorage.setItem(activeJobKey(classId), jobId);
}

export function clearTeacherAiDraftJobId(classId: string) {
  return AsyncStorage.removeItem(activeJobKey(classId));
}
```

- [ ] **Step 4: Run the persistence test and typecheck**

```bash
npm --prefix mobile test -- --runInBand src/api/__tests__/teacher-ai-draft-jobs.test.ts
npm --prefix mobile run typecheck
```

Expected: persistence test passes and TypeScript reports no errors.

- [ ] **Step 5: Commit job recovery storage**

```bash
git add mobile/src/api/teacher-ai-draft-jobs.ts mobile/src/api/__tests__/teacher-ai-draft-jobs.test.ts
git commit -m "feat(mobile): persist active teacher AI draft jobs"
```

### Task 4: Implement Source Selection, Readiness Gating, Reindex, and Job Lifecycle

**Files:**
- Modify: `mobile/src/screens/TeacherAiDraftScreen.tsx`
- Test: `mobile/src/screens/__tests__/teacher-ai-draft.test.tsx`

**Interfaces:**
- Consumes: Task 1 `aiApi` methods, Task 2 model helpers, and Task 3 persistence functions.
- Produces: A mobile flow that queues only when ready, sends selected IDs, recovers active jobs, exposes retry/cancel, and displays actionable failure details.

- [ ] **Step 1: Write failing screen tests for source selection and job recovery**

Build the test harness using the same React Test Renderer and primitive mocks as `teacher-intervention-workspace.test.tsx`. Add these cases:

```ts
it("disables generation while the class index needs reindex", async () => {
  mockedAiApi.getClassIndexStatus.mockResolvedValue({
    ...readyIndexStatus,
    needsReindex: true,
    isStale: true,
    reason: "Class sources changed after the last index.",
  });

  const renderer = await renderAiDraftScreen();
  expect(findPressableByText(renderer.root, "Generate").props.disabled).toBe(true);
  expect(flattenInstance(renderer.root)).toContain("Class sources changed after the last index.");
});

it("sends the selected lesson id instead of every class source", async () => {
  mockedAiApi.getClassIndexStatus.mockResolvedValue(readyIndexStatus);
  mockedAiApi.createQuizDraftJob.mockResolvedValue(pendingJob);

  const renderer = await renderAiDraftScreen();
  await press(renderer.root, "Fractions lesson");
  await press(renderer.root, "Use all ready sources");
  await press(renderer.root, "Generate");

  expect(mockedAiApi.createQuizDraftJob).toHaveBeenCalledWith(
    expect.objectContaining({
      lessonIds: ["lesson-1"],
      extractionIds: [],
      allowDraftSources: false,
    }),
  );
});

it("restores and polls the class active job", async () => {
  mockedJobStorage.readTeacherAiDraftJobId.mockResolvedValue("job-1");
  mockedAiApi.getTeacherJobStatus.mockResolvedValue(completedJob);
  mockedAiApi.getQuizDraftJobResult.mockResolvedValue(completedResult);

  await renderAiDraftScreen();

  expect(mockedAiApi.getTeacherJobStatus).toHaveBeenCalledWith("job-1");
  expect(mockedAiApi.getQuizDraftJobResult).toHaveBeenCalledWith("job-1");
});

it("shows the detailed error and allows retry after a failed job", async () => {
  mockedAiApi.getTeacherJobStatus.mockResolvedValue({
    ...failedJob,
    errorMessage: "No indexed source content found.",
  });
  mockedAiApi.retryQuizDraftJob.mockResolvedValue(pendingJob);

  const renderer = await renderAiDraftScreenWithJob("job-failed");
  expect(flattenInstance(renderer.root)).toContain("No indexed source content found.");
  await press(renderer.root, "Retry generation");
  expect(mockedAiApi.retryQuizDraftJob).toHaveBeenCalledWith("job-failed");
});
```

Use a ready fixture containing one `readyLessons` row, one `lessonBlockers` row, one `readyExtractions` row, `chunksIndexed: 6`, and `needsReindex: false`.

- [ ] **Step 2: Run the screen test and verify failure**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/teacher-ai-draft.test.tsx
```

Expected: FAIL because the screen has no selectors, readiness gate, persistence restore, or retry action.

- [ ] **Step 3: Add source and lifecycle state to the screen**

Add state and derived readiness:

```ts
const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
const [selectedExtractionIds, setSelectedExtractionIds] = useState<string[]>([]);
const [useAllReadySources, setUseAllReadySources] = useState(true);
const [reindexing, setReindexing] = useState(false);
const [restoringJob, setRestoringJob] = useState(true);

const canGenerate =
  !submitting &&
  !restoringJob &&
  canGenerateQuizDraft(
    indexStatus,
    useAllReadySources,
    selectedLessonIds,
    selectedExtractionIds,
  );
```

Render only `indexStatus.readyLessons` and `indexStatus.readyExtractions` as selectable. Render `lessonBlockers` and `extractionBlockers` as disabled rows with their `reason`. Toggling “Use all ready sources” on clears explicit selections; selecting a row turns it off.

Use this payload in `createJob`:

```ts
const sourceFields = buildQuizDraftSourceFields(
  useAllReadySources,
  selectedLessonIds,
  selectedExtractionIds,
);
const created = await aiApi.createQuizDraftJob({
  classId,
  title: title.trim() || "AI Draft Assessment",
  questionCount: parsedCount,
  questionType,
  teacherNote: teacherNote.trim() || undefined,
  assessmentType: "quiz",
  passingScore: 60,
  feedbackLevel: "standard",
  classRecordCategory: "written_work",
  sourcePolicy: "published_default",
  allowDraftSources: false,
  ...sourceFields,
});
await writeTeacherAiDraftJobId(classId, created.id);
```

- [ ] **Step 4: Add safe reindex behavior**

Replace the inline promise chain with:

```ts
const reindexClass = async () => {
  try {
    setReindexing(true);
    await aiApi.reindexClass(classId);
    await loadStatus();
    Alert.alert("Sources indexed", "Published class sources are ready for AI generation.");
  } catch (error) {
    Alert.alert("Unable to reindex", getErrorMessage(error));
  } finally {
    setReindexing(false);
  }
};
```

Disable Reindex while `reindexing`, and keep Generate disabled until the refreshed status reports `chunksIndexed > 0`, `isStale === false`, and `needsReindex === false`.

- [ ] **Step 5: Restore, poll, retry, cancel, and delete jobs**

On mount, read the class job ID, fetch status, and fetch the result for terminal completed/approved jobs. Poll only non-terminal jobs. On failure, display `job.errorMessage || job.statusMessage || job.message` in that order.

Retry must persist the returned replacement job ID:

```ts
const retryJob = async () => {
  if (!job?.id) return;
  const retried = await aiApi.retryQuizDraftJob(job.id);
  setJob(retried);
  setResult(null);
  await writeTeacherAiDraftJobId(classId, retried.id);
};
```

Cancel and delete must clear class persistence after the server succeeds:

```ts
await aiApi.cancelQuizDraftJob(job.id);
await clearTeacherAiDraftJobId(classId);
setJob(null);
setResult(null);
```

- [ ] **Step 6: Run the focused screen test, full mobile tests, and typecheck**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/teacher-ai-draft.test.tsx
npm --prefix mobile test -- --runInBand
npm --prefix mobile run typecheck
```

Expected: source/lifecycle regression tests pass, all mobile suites pass, and TypeScript reports no errors.

- [ ] **Step 7: Commit source and lifecycle parity**

```bash
git add mobile/src/screens/TeacherAiDraftScreen.tsx mobile/src/screens/__tests__/teacher-ai-draft.test.tsx
git commit -m "fix(mobile): add grounded AI draft source selection"
```

### Task 5: Implement Mobile Review, Apply Preview, and Correct Assessment Navigation

**Files:**
- Create: `mobile/src/screens/teacher-ai-draft/TeacherAiDraftReviewPanel.tsx`
- Modify: `mobile/src/screens/TeacherAiDraftScreen.tsx`
- Modify: `mobile/src/screens/__tests__/teacher-ai-draft.test.tsx`

**Interfaces:**
- Consumes: Task 1 preview/apply/save contracts and Task 2 review helpers.
- Produces: A reviewable draft that cannot apply until valid and navigates using `applyResult.assessmentId`.

- [ ] **Step 1: Add failing review/apply tests**

```ts
it("blocks apply while review issues are unresolved", async () => {
  mockedAiApi.getQuizDraftJobResult.mockResolvedValue(reviewRequiredResult);
  const renderer = await renderAiDraftScreenWithJob("job-1");

  expect(findPressableByText(renderer.root, "Review and apply").props.disabled).toBe(true);
  expect(flattenInstance(renderer.root)).toContain("Finish the review checklist");
});

it("saves teacher review before enabling apply preview", async () => {
  mockedAiApi.getQuizDraftJobResult.mockResolvedValue(reviewRequiredResult);
  mockedAiApi.updateQuizDraft.mockResolvedValue(completedJob);
  const renderer = await renderAiDraftScreenWithJob("job-1");

  await press(renderer.root, "Mark question 1 reviewed");

  expect(mockedAiApi.updateQuizDraft).toHaveBeenCalledWith(
    "job-1",
    expect.objectContaining({
      structuredOutput: expect.objectContaining({ reviewRequired: false, reviewState: "ready" }),
    }),
  );
});

it("previews apply and navigates with applyResult assessment id", async () => {
  mockedAiApi.previewQuizDraftApply.mockResolvedValue({
    canApply: true,
    alreadyApplied: false,
    blockedReasons: [],
    assessment: { title: "Fractions quiz", questionCount: 5, totalPoints: 5 },
  });
  mockedAiApi.applyQuizDraftJob.mockResolvedValue({
    jobId: "job-1",
    alreadyApplied: false,
    applyResult: { assessmentId: "assessment-1", outputId: "output-1" },
  });

  const renderer = await renderReadyAiDraftScreen();
  await press(renderer.root, "Review and apply");
  await confirmLatestAlert();

  expect(navigation.navigate).toHaveBeenCalledWith("TeacherAssessmentEditor", {
    assessmentId: "assessment-1",
    classId: "class-1",
  });
  expect(navigation.navigate).not.toHaveBeenCalledWith(
    "TeacherAssessmentEditor",
    expect.objectContaining({ assessmentId: "output-1" }),
  );
});
```

- [ ] **Step 2: Run the focused test and verify failure**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/teacher-ai-draft.test.tsx
```

Expected: FAIL because direct Apply is still exposed and navigation reads the wrong response field.

- [ ] **Step 3: Create the review panel**

`TeacherAiDraftReviewPanel` accepts:

```ts
interface TeacherAiDraftReviewPanelProps {
  draft: QuizDraftStructuredOutput;
  saving: boolean;
  applying: boolean;
  onMarkQuestionReviewed: (questionIndex: number) => void;
  onAcceptWarning: (issueId: string) => void;
  onPreviewApply: () => void;
}
```

It must render:

- Draft title, question count, `qualityGate`, and `reviewState`.
- Each question with type, points, reviewed state, and a “Mark question N reviewed” action.
- Every unresolved warning with an “Accept warning” action.
- Every unresolved blocking issue as visible blocking copy.
- A “Review and apply” button disabled while saving/applying, when there are no questions, when `qualityGate === "fail"`, or when `reviewRequired === true`.

Do not expose an apply action for the degraded fallback where `outputType === "degraded_unavailable"`.

- [ ] **Step 4: Save review changes through the server**

Use an optimistic update with rollback:

```ts
const persistDraft = async (
  nextDraft: QuizDraftStructuredOutput,
  previousDraft: QuizDraftStructuredOutput,
) => {
  if (!job?.id) return;
  setResult((current) => current ? {
    ...current,
    result: current.result ? { ...current.result, structuredOutput: nextDraft } : current.result,
  } : current);
  try {
    setSavingDraft(true);
    await aiApi.updateQuizDraft(job.id, { structuredOutput: nextDraft });
  } catch (error) {
    setResult((current) => current ? {
      ...current,
      result: current.result ? { ...current.result, structuredOutput: previousDraft } : current.result,
    } : current);
    Alert.alert("Unable to save review", getErrorMessage(error));
  } finally {
    setSavingDraft(false);
  }
};
```

`onMarkQuestionReviewed` uses `markQuestionReviewed`; `onAcceptWarning` uses `acceptReviewWarning`.

- [ ] **Step 5: Preview before apply and navigate with the canonical ID**

```ts
const previewAndApply = async () => {
  if (!job?.id) return;
  const preview = await aiApi.previewQuizDraftApply(job.id);
  if (!preview.canApply) {
    Alert.alert("Draft needs review", preview.blockedReasons[0] || "Resolve review issues before applying.");
    return;
  }
  Alert.alert(
    preview.alreadyApplied ? "Draft already applied" : "Apply quiz draft?",
    `${preview.assessment.title} - ${preview.assessment.questionCount} question(s), ${preview.assessment.totalPoints} point(s).`,
    [
      { text: "Keep reviewing", style: "cancel" },
      { text: preview.alreadyApplied ? "Open assessment" : "Apply draft", onPress: () => void applyJob() },
    ],
  );
};

const applyJob = async () => {
  if (!job?.id) return;
  const response = await aiApi.applyQuizDraftJob(job.id);
  const assessmentId = response.applyResult.assessmentId;
  await clearTeacherAiDraftJobId(classId);
  navigation.navigate("TeacherAssessmentEditor", { assessmentId, classId });
};
```

Delete the `outputId && !questions.length` editor fallback completely.

- [ ] **Step 6: Run review/apply tests, full mobile tests, and typecheck**

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/teacher-ai-draft.test.tsx
npm --prefix mobile test -- --runInBand
npm --prefix mobile run typecheck
```

Expected: review/apply tests pass, the full mobile suite passes, and TypeScript reports no errors.

- [ ] **Step 7: Commit review/apply parity**

```bash
git add mobile/src/screens/teacher-ai-draft/TeacherAiDraftReviewPanel.tsx mobile/src/screens/TeacherAiDraftScreen.tsx mobile/src/screens/__tests__/teacher-ai-draft.test.tsx
git commit -m "fix(mobile): enforce AI draft review before apply"
```

### Task 6: Remove Unsupported Draft-Lesson Selection from Web

**Files:**
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.tsx:536-571,786-835`
- Test: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.test.tsx`

**Interfaces:**
- Consumes: Existing AI index policy, which excludes draft lessons from class chunks.
- Produces: Matching published-indexed source semantics on web and mobile.

- [ ] **Step 1: Add a failing web source-policy test**

```tsx
it("shows draft lessons as blocked and never acknowledges draft sources", async () => {
  mockedAiService.getClassIndexStatus.mockResolvedValue({
    data: {
      ...readyIndexStatus,
      readyLessons: [],
      lessonBlockers: [
        {
          lessonId: "lesson-draft",
          title: "Draft fractions lesson",
          reason: "Lesson is still in draft status.",
        },
      ],
    },
  } as never);

  render(<TeacherAiDraftQuizPage />);

  const draftCheckbox = await screen.findByRole("checkbox", {
    name: /draft fractions lesson/i,
  });
  expect(draftCheckbox).toBeDisabled();
  expect(screen.queryByText(/acknowledge selected draft sources/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the web test and verify failure**

```bash
npm --prefix next-frontend test -- --runInBand --runTestsByPath './app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.test.tsx'
```

Expected: FAIL because draft blockers are currently marked selectable.

- [ ] **Step 3: Enforce published-indexed selection**

In `lessonRows`, change selection to:

```ts
const selectable = !blocker;
```

Remove `draftSourceAcknowledged`, the acknowledgement UI, and draft-source generation guards. Always send:

```ts
sourcePolicy: "published_default",
allowDraftSources: false,
```

Keep draft lessons visible with their blocker reason so teachers understand they must publish and reindex them.

- [ ] **Step 4: Run the web AI-draft tests**

```bash
npm --prefix next-frontend test -- --runInBand --runTestsByPath './app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.test.tsx'
```

Expected: all web AI-draft tests pass.

- [ ] **Step 5: Commit source-policy consistency**

```bash
git add 'next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.tsx' 'next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.test.tsx'
git commit -m "fix(ai): restrict quiz drafts to published indexed sources"
```

### Task 7: Cross-Surface Verification and Manual Mobile Acceptance

**Files:**
- No source changes expected.
- Review all files listed in the File Map.

**Interfaces:**
- Consumes: Completed Tasks 1-6.
- Produces: Evidence that the existing backend/AI path remains intact and the mobile flow works against it.

- [ ] **Step 1: Run the full automated verification set**

```bash
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runInBand
npm --prefix next-frontend test -- --runInBand --runTestsByPath './app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.test.tsx'
npm --prefix backend test -- --runInBand src/modules/ai-mentor/ai-mentor.controller.spec.ts
cd ai-service && UV_CACHE_DIR=/tmp/nexora-mobile-ai-draft-uv-cache uv run pytest -q tests/test_quiz_apply.py tests/test_quiz_generation_service.py tests/test_ai_job_runtime.py
```

Expected:

- Mobile typecheck exits 0.
- All mobile Jest suites pass.
- All web AI-draft page tests pass.
- Backend AI mentor controller tests pass.
- AI quiz apply/generation/runtime tests pass.

- [ ] **Step 2: Start the mobile app with an explicit backend URL**

On Android emulator from a non-Windows shell:

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api npm run start -- --android
```

Expected: Expo opens the app and authenticated backend requests use `/api` on port 3000.

- [ ] **Step 3: Verify the teacher source-selection flow**

Using a teacher-owned class containing at least two published lessons:

1. Open Teacher class detail -> AI draft.
2. Confirm ready and blocked sources are separately visible.
3. Confirm Generate is disabled while index status is stale or needs reindex.
4. Reindex and wait for refreshed readiness.
5. Disable “Use all ready sources.”
6. Select exactly one published indexed lesson.
7. Generate five multiple-choice questions.

Expected: the queued job reaches completed, and every returned provenance/source reference belongs to the selected lesson.

- [ ] **Step 4: Verify recovery and failure handling**

1. Start another job.
2. Navigate away before completion.
3. Return to the same class AI-draft screen.
4. Confirm polling resumes for the persisted job.
5. For a failed job fixture or controlled unavailable-source case, confirm the detailed error appears and Retry starts a replacement job.

Expected: no job becomes inaccessible merely because the screen unmounted.

- [ ] **Step 5: Verify review and apply**

1. Complete all question review actions.
2. Confirm Apply remains disabled while unresolved warnings/blockers exist.
3. Open apply preview and confirm title, question count, and total points.
4. Apply the draft.

Expected: an unpublished assessment is created once, the app opens `TeacherAssessmentEditor` with the real `assessmentId`, and repeating apply does not create a duplicate assessment.

- [ ] **Step 6: Inspect the final diff and worktree**

```bash
git diff --check
git status --short
git log --oneline -6
```

Expected: `git diff --check` has no whitespace errors, status contains only intended files, and commits correspond to the plan tasks.

## Acceptance Criteria

- A teacher can see which published lessons/extractions are indexed, blocked, or need reindexing.
- A teacher can choose one or more indexed lessons/extractions or intentionally use all ready sources.
- Mobile sends the chosen `lessonIds` and `extractionIds` to the existing queue endpoint.
- Generate cannot start with zero indexed chunks or a stale index.
- Reindex does not fail solely because the default 30-second mobile timeout elapsed.
- The active generation job survives navigation and app restart.
- Failed jobs show their detailed `errorMessage` and expose retry/cancel actions.
- Degraded/malformed results do not expose Apply.
- Review-required or quality-gate-failed drafts cannot be applied.
- Review updates are saved through the existing draft PATCH endpoint.
- Apply preview runs before apply.
- Successful apply navigates with `applyResult.assessmentId`.
- `outputId` is never passed as an assessment ID.
- Web and mobile both treat draft lessons as blocked until published and reindexed.
- No schema, migration, auth, grade, enrollment, or official-record behavior changes.

## Explicit Follow-Up Scope

True draft-lesson generation is not part of this plan. If it is required later, create a separate OpenSpec change covering:

- Whether draft lesson chunks may be stored in the shared class index.
- How `allowDraftSources` changes indexing and retrieval filters.
- Teacher-only authorization and explicit acknowledgement.
- Removal of stale draft chunks after publish/unpublish transitions.
- Backend, AI-service, web, and mobile contract tests for that policy.

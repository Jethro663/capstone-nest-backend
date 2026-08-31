import type { AiAssessmentSettings } from "./assessment";
export type AiGenerationStatus =
  | "queued"
  | "pending"
  | "running"
  | "processing"
  | "completed"
  | "approved"
  | "cancelled"
  | "rejected"
  | "failed";

export interface TutorRecommendationPayload {
  id: string;
  title: string;
  reason: string;
  focusText: string;
  lessonId?: string | null;
  assessmentId?: string | null;
  questionId?: string | null;
  sourceChunkId?: string | null;
}

export interface AiTutorBootstrapClass {
  id: string;
  subjectName: string;
  subjectCode: string;
  sectionName?: string | null;
  gradeLevel?: string | null;
  blendedScore?: number | null;
  isAtRisk?: boolean;
  thresholdApplied?: number | null;
}

export interface AiTutorHistoryItem {
  sessionId: string;
  title: string;
  preview?: string;
  updatedAt?: string | null;
  completed?: boolean;
  stage?: string;
}

export interface AiTutorBootstrap {
  classes: AiTutorBootstrapClass[];
  selectedClassId: string | null;
  recentLessons: Array<Record<string, unknown>>;
  recentAttempts: Array<Record<string, unknown>>;
  recommendations: TutorRecommendationPayload[];
  history: AiTutorHistoryItem[];
}

export interface AiTutorQuestion {
  id: string;
  question: string;
  expectedAnswer?: string;
  hint?: string;
}

export interface AiTutorCitation {
  chunkId: string;
  label: string;
  lessonId?: string | null;
  assessmentId?: string | null;
}

export interface AiTutorSessionStart {
  sessionId: string;
  stage: string;
  completed: boolean;
  message: string;
  recommendation: TutorRecommendationPayload;
  lessonPlan: string[];
  lessonBody: string;
  questions: AiTutorQuestion[];
  citations: AiTutorCitation[];
}

export interface AiTutorSessionMessage {
  id: string;
  userText?: string;
  assistantText?: string;
  createdAt?: string | null;
  messageType?: string;
}

export interface AiTutorSessionState {
  stage?: string;
  completed?: boolean;
  lessonPlan?: string[];
  lessonBody?: string;
  questions?: AiTutorQuestion[];
  recommendation?: TutorRecommendationPayload;
}

export interface AiTutorSession {
  sessionId: string;
  state: AiTutorSessionState;
  messages: AiTutorSessionMessage[];
}

export interface AiTutorAnswersResult {
  sessionId: string;
  completed: boolean;
  message: string;
  results: Array<{
    questionId: string;
    decision: string;
    isCorrectEnough: boolean;
    feedback: string;
  }>;
  questions: AiTutorQuestion[];
  retryLesson?: string;
}

export interface AiGenerationJob {
  id: string;
  jobId?: string;
  jobType?: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | string;
  progressPercent?: number | null;
  message?: string | null;
  statusMessage?: string | null;
  errorMessage?: string | null;
  outputId?: string | null;
  outputType?: string | null;
  assessmentId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TeacherAiJobSummary {
  jobId: string;
  jobType: string;
  classId: string | null;
  title: string;
  status: AiGenerationStatus;
  progressPercent: number;
  statusMessage: string | null;
  errorMessage: string | null;
  outputId: string | null;
  assessmentId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ListTeacherAiJobsQuery {
  classId?: string;
  limit?: number;
}

export interface IndexingSummary {
  classId: string;
  chunksIndexed: number;
  lessonChunks?: number;
  extractionChunks?: number;
  questionChunks?: number;
  lastIndexedAt?: string | null;
  degraded?: boolean;
  warnings?: string[];
  embeddingProvider?: string;
  embeddingModel?: string;
}

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

export interface QuizDraftProvenance {
  chunkId?: string;
  sourceType?: string;
  sourceId?: string;
  sourceReference?: string;
  sourceTitle?: string;
  sourceSnippet?: string;
  confidence?: number;
  selectionReason?: string;
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

export interface QuizDraftApplyResult {
  assessmentId: string;
  outputId?: string;
  questionsCreated?: number;
  totalPoints?: number;
  appliedAt?: string;
}

export interface QuizDraftStructuredOutput {
  title: string;
  description?: string;
  blueprint?: {
    title: string;
    description: string;
    conceptCoverage: string[];
    questionBlueprints: Array<{
      intent: string;
      difficulty: string;
      sourceCitation: string;
    }>;
  };
  questions: Array<{
    id?: string;
    type: string;
    content: string;
    points?: number;
    explanation?: string;
    conceptTags?: string[];
    difficulty?: string;
    cognitiveLevel?: string;
    provenance?: QuizDraftProvenance;
    groundingScore?: number;
    issueIds?: string[];
    expectedAnswer?: string;
    rubric?: string;
    reviewed?: boolean;
    options?: Array<{ text: string; isCorrect: boolean; order?: number }>;
  }>;
  qualityGate?: "pass" | "warn" | "fail";
  reviewRequired?: boolean;
  reviewState?: string;
  reviewIssues?: QuizDraftReviewIssue[];
  sourceManifest?: QuizDraftProvenance[];
  audit?: {
    applyResult?: QuizDraftApplyResult | null;
    [key: string]: unknown;
  };
  assessmentId?: string;
  runtime?: {
    assessmentId?: string;
    outputId?: string;
    indexing?: IndexingSummary;
  };
}

export interface UpdateQuizDraftDto {
  structuredOutput: QuizDraftStructuredOutput;
}

export interface QuizDraftApplyPreview {
  assessmentSettings?: AiAssessmentSettings;
  requiresSettingsReview?: boolean;
  jobId?: string;
  outputId?: string;
  canApply: boolean;
  alreadyApplied?: boolean;
  blockedReasons: string[];
  applyResult?: QuizDraftApplyResult | null;
  assessment: {
    title: string;
    description?: string;
    type?: string;
    passingScore?: number;
    feedbackLevel?: string;
    classRecordCategory?: string;
    quarter?: string;
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
  assessmentSettings?: AiAssessmentSettings;
  classId: string;
  lessonIds?: string[];
  extractionIds?: string[];
  title?: string;
  questionCount: number;
  questionType: string;
  assessmentType?: "quiz" | "exam" | "assignment";
  passingScore: number;
  teacherNote?: string;
  feedbackLevel?: "immediate" | "standard" | "detailed";
  classRecordCategory?: "written_work" | "performance_task" | "quarterly_assessment";
  sourcePolicy: "published_default";
  allowDraftSources: false;
}

export type CreateQuizDraftJobInput = Pick<
  GenerateQuizDraftDto,
  "classId" | "questionCount" | "questionType"
> & Partial<Omit<GenerateQuizDraftDto, "classId" | "questionCount" | "questionType">>;

export interface AiGenerationJobResult<TOutput> {
  job: AiGenerationJob;
  result?: {
    outputId?: string;
    outputType?: string;
    structuredOutput?: TOutput;
  } | null;
}

export type AiPolicySourceScope = "recommended_only" | "class_materials";

export interface ClassAiPolicy {
  classId: string;
  mentorExplainEnabled: boolean;
  maxFollowUpTurns: number;
  sourceScope: AiPolicySourceScope;
  strictGrounding: boolean;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpdateClassAiPolicyDto {
  mentorExplainEnabled?: boolean;
  maxFollowUpTurns?: number;
  sourceScope?: AiPolicySourceScope;
  strictGrounding?: boolean;
}

export interface InterventionRecommendationDto {
  note?: string;
}

export interface InterventionRecommendedLesson {
  lessonId: string;
  title: string;
  reason: string;
  chunkId?: string | null;
  scoreBreakdown?: Record<string, number>;
  sourceReference?: string | null;
}

export interface InterventionRecommendedAssessment {
  assessmentId: string;
  title: string;
  reason: string;
}

export interface InterventionStructuredOutput {
  caseId: string;
  weakConcepts: string[];
  recommendedLessons: InterventionRecommendedLesson[];
  recommendedAssessments: InterventionRecommendedAssessment[];
  aiSummary: {
    summary: string;
    teacherActions: string[];
    studentFocus: string[];
  };
  evidencePacket?: {
    weakConcepts?: string[];
    recommendedLessons?: Array<Record<string, unknown>>;
    recommendedAssessments?: Array<Record<string, unknown>>;
    mistakeSample?: Array<Record<string, unknown>>;
  };
  suggestedAssignmentPayload: {
    lessonIds: string[];
    assessmentIds: string[];
    lessonAssignments?: Array<{ lessonId: string; xpAwarded: number; label?: string }>;
    assessmentAssignments?: Array<{ assessmentId: string; xpAwarded: number; label?: string }>;
    note?: string;
  };
  generatedLessonDraft?: {
    title: string;
    summary?: string | null;
    lessonBody: string;
    weakConcepts: string[];
    sourceLessonIds: string[];
    sourceReferences: Array<Record<string, unknown>>;
  } | null;
  generatedGuidedAssessmentDraft?: {
    sourceAssessmentId?: string | null;
    title: string;
    description?: string | null;
    weakConcepts: string[];
    formativeSummary?: string | null;
    sourceReferences: Array<Record<string, unknown>>;
    questions: Array<{
      id: string;
      type: "multiple_choice" | "multiple_select" | "true_false" | "dropdown" | string;
      stem: string;
      explanation: string;
      hint?: string | null;
      reviewHint?: string | null;
      weakConceptTag?: string | null;
      sourceQuestionId?: string | null;
      options: Array<{ id: string; text: string; isCorrect: boolean }>;
    }>;
  } | null;
  note?: string | null;
  runtime?: {
    outputId?: string;
    caseId?: string;
  };
}

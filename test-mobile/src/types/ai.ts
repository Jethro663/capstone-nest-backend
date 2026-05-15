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
  errorMessage?: string | null;
  outputId?: string | null;
  outputType?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AiClassIndexStatus {
  classId: string;
  sourceSummary?: {
    lessons?: { total?: number; ready?: number; blocked?: number };
    extractions?: { total?: number; ready?: number; blocked?: number };
  };
  lessons?: Array<{
    id: string;
    title?: string | null;
    state?: string | null;
    blockerReason?: string | null;
    updatedAt?: string | null;
  }>;
  extractions?: Array<{
    id: string;
    title?: string | null;
    state?: string | null;
    blockerReason?: string | null;
    updatedAt?: string | null;
  }>;
}

export interface QuizDraftStructuredOutput {
  title?: string;
  description?: string;
  questions?: Array<{
    content?: string;
    type?: string;
    points?: number;
    options?: Array<{ text?: string; isCorrect?: boolean }>;
  }>;
}

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

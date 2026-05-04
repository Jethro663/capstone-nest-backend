import type { ClassRecordCategory } from '@/types/assessment';
import type { GradingPeriod, AssessmentType, FeedbackLevel, QuestionType } from '@/utils/constants';

export interface AiCitation {
  chunkId: string;
  sourceType: string;
  lessonId?: string | null;
  assessmentId?: string | null;
  questionId?: string | null;
  label: string;
  scoreBreakdown?: Record<string, number>;
  selectionReason?: string;
  sourceReference?: string;
}

export interface MentorExplainResponse {
  reply: string;
  citations: AiCitation[];
  suggestedNext?: {
    lessonId?: string | null;
    label: string;
  } | null;
  analysisPacket?: {
    mistakeSummary: string;
    likelyMisconceptions: string[];
    requiredEvidence: string[];
    answerGuardrail: string;
  };
  modelUsed: string;
}

export interface MentorExplainDto {
  attemptId: string;
  questionId: string;
  message?: string;
}

export type AiPolicySourceScope = 'recommended_only' | 'class_materials';

export interface ClassAiPolicy {
  classId: string;
  mentorExplainEnabled: boolean;
  maxFollowUpTurns: number;
  sourceScope: AiPolicySourceScope;
  strictGrounding: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateClassAiPolicyDto {
  mentorExplainEnabled?: boolean;
  maxFollowUpTurns?: number;
  sourceScope?: AiPolicySourceScope;
  strictGrounding?: boolean;
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
  status: 'indexed' | 'ready_to_index';
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
  status: 'indexed' | 'ready_to_index';
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
    lessons: {
      total: number;
      ready: number;
      blocked: number;
    };
    extractions: {
      total: number;
      ready: number;
      blocked: number;
    };
    questions: {
      assessments: number;
      assessmentsWithQuestions: number;
      questionCount: number;
      needsIndex: number;
    };
  };
}

export interface InterventionRecommendation {
  jobId: string;
  outputId: string;
  caseId: string;
  weakConcepts: string[];
  recommendedLessons: Array<{
    lessonId: string;
    title: string;
    reason: string;
    chunkId: string;
    scoreBreakdown?: Record<string, number>;
    sourceReference?: string;
  }>;
  recommendedAssessments: Array<{
    assessmentId: string;
    title: string;
    reason: string;
  }>;
  suggestedAssignmentPayload: {
    lessonIds: string[];
    assessmentIds: string[];
    lessonAssignments?: { lessonId: string; xpAwarded: number; label?: string }[];
    assessmentAssignments?: { assessmentId: string; xpAwarded: number; label?: string }[];
    note?: string;
  };
  evidencePacket?: {
    weakConcepts: string[];
    recommendedLessons: Array<Record<string, unknown>>;
    recommendedAssessments: Array<Record<string, unknown>>;
    mistakeSample: Array<Record<string, unknown>>;
  };
}

export interface InterventionRecommendationDto {
  note?: string;
}

export type AiGenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'approved'
  | 'cancelled'
  | 'rejected'
  | 'failed';

export interface AiGenerationJob {
  jobId: string;
  jobType:
    | 'quiz_generation'
    | 'remedial_plan_generation'
    | 'class_lesson_plan_generation'
    | string;
  status: AiGenerationStatus;
  progressPercent: number;
  statusMessage?: string | null;
  errorMessage?: string | null;
  outputId?: string | null;
  assessmentId?: string | null;
  updatedAt?: string | null;
}

export interface AiGenerationJobResult<TStructuredOutput = Record<string, unknown>> {
  job: {
    jobId: string;
    jobType: string;
    status: AiGenerationStatus;
    outputId: string;
    assessmentId?: string | null;
    updatedAt?: string | null;
  };
  result: {
    outputId: string;
    outputType: string;
    structuredOutput: TStructuredOutput;
  };
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
    type: QuestionType;
    content: string;
    points?: number;
    explanation?: string;
    conceptTags?: string[];
    options?: Array<{
      text: string;
      isCorrect: boolean;
      order?: number;
    }>;
  }>;
  assessmentId?: string;
  runtime?: {
    assessmentId?: string;
    outputId?: string;
    indexing?: IndexingSummary;
  };
}

export interface GenerateQuizDraftDto {
  classId: string;
  lessonIds?: string[];
  extractionIds?: string[];
  title?: string;
  questionCount: number;
  questionType: QuestionType;
  assessmentType: AssessmentType;
  passingScore: number;
  teacherNote?: string;
  feedbackLevel: FeedbackLevel;
  classRecordCategory?: ClassRecordCategory;
  quarter?: GradingPeriod;
}

export interface GenerateQuizDraftResponse {
  jobId: string;
  outputId: string;
  assessmentId: string;
  title: string;
  blueprint?: QuizDraftStructuredOutput['blueprint'];
  sourceCitations?: Array<{
    chunkId: string;
    sourceReference?: string;
    selectionReason?: string;
    scoreBreakdown?: Record<string, number>;
  }>;
  questionsCreated: number;
  message: string;
  indexing?: IndexingSummary;
}

export interface InterventionStructuredOutput {
  caseId: string;
  weakConcepts: string[];
  recommendedLessons: InterventionRecommendation['recommendedLessons'];
  recommendedAssessments: InterventionRecommendation['recommendedAssessments'];
  aiSummary: {
    summary: string;
    teacherActions: string[];
    studentFocus: string[];
  };
  evidencePacket?: InterventionRecommendation['evidencePacket'];
  suggestedAssignmentPayload: InterventionRecommendation['suggestedAssignmentPayload'];
  generatedLessonDraft?: {
    title: string;
    summary?: string | null;
    lessonBody: string;
    weakConcepts: string[];
    sourceLessonIds: string[];
    sourceReferences: Array<{
      lessonId?: string;
      chunkId?: string;
      title?: string;
      sourceReference?: string;
      selectionReason?: string;
    }>;
  } | null;
  generatedGuidedAssessmentDraft?: {
    sourceAssessmentId?: string | null;
    title: string;
    description?: string | null;
    weakConcepts: string[];
    formativeSummary?: string | null;
    sourceReferences: Array<{
      assessmentId?: string;
      questionId?: string;
      sourceReference?: string;
      selectionReason?: string;
    }>;
    questions: Array<{
      id: string;
      type: 'multiple_choice' | 'multiple_select' | 'true_false' | 'dropdown';
      stem: string;
      explanation: string;
      hint?: string | null;
      weakConceptTag?: string | null;
      sourceQuestionId?: string | null;
      options: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
      }>;
    }>;
  } | null;
  note?: string | null;
  runtime?: {
    outputId?: string;
    caseId?: string;
  };
}

export type LessonPlanAnchorType = 'module' | 'lesson';
export type LessonPlanClassProfile = 'excelling' | 'mixed' | 'struggling';

export interface LessonPlanHeader {
  instructionalFormat?: string;
  schoolName?: string;
  quarter?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  schoolYear?: string;
  sectionName?: string;
  gradeLevel?: string;
  learningArea?: string;
  subjectCode?: string;
  teacherName?: string;
  moduleTitle?: string;
  lessonTitle?: string;
}

export interface LessonPlanProcedureMap {
  review: string[];
  purpose: string[];
  examples: string[];
  guidedPractice: string[];
  mastery: string[];
  application: string[];
  generalization: string[];
  evaluation: string[];
  remediationOrEnrichment: string[];
}

export interface LessonPlanDifferentiation {
  support: string[];
  core: string[];
  enrichment: string[];
}

export interface LessonPlanStructuredOutput {
  header: LessonPlanHeader;
  classProfile: LessonPlanClassProfile;
  evidenceSummary: string;
  objectives: string[];
  contentOrSubjectMatter: string;
  learningResources: string[];
  procedures: LessonPlanProcedureMap;
  assessment: string[];
  remarks: string;
  reflection: string;
  assignmentOrHomeExtension: string;
  differentiation: LessonPlanDifferentiation;
  safeguards: string[];
  metadata?: {
    classId?: string;
    anchorType?: LessonPlanAnchorType;
    anchorId?: string;
    weakConcepts?: string[];
    performanceSummary?: Record<string, unknown>;
  };
  runtime?: {
    outputId?: string;
    classProfile?: LessonPlanClassProfile;
    header?: LessonPlanHeader;
  };
}

export interface GenerateLessonPlanDto {
  classId: string;
  anchorType: LessonPlanAnchorType;
  anchorId: string;
  teacherNote?: string;
  header?: {
    instructionalFormat?: string;
    schoolName?: string;
    quarter?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  };
}

export interface UpdateLessonPlanDraftDto {
  structuredOutput: LessonPlanStructuredOutput;
}

export interface UpdateQuizDraftDto {
  structuredOutput: QuizDraftStructuredOutput;
}

export interface StudentTutorClassSummary {
  id: string;
  subjectName: string;
  subjectCode: string;
  sectionName?: string | null;
  gradeLevel?: string | null;
  blendedScore?: number | null;
  isAtRisk?: boolean | null;
  thresholdApplied?: number | null;
}

export interface StudentTutorRecentLesson {
  lessonId: string;
  title: string;
  completedAt?: string | null;
  progressPercentage?: number | null;
}

export interface StudentTutorRecentAttempt {
  attemptId: string;
  assessmentId: string;
  title: string;
  attemptNumber: number;
  score?: number | null;
  passed?: boolean | null;
  passingScore?: number | null;
  submittedAt?: string | null;
}

export interface StudentTutorRecommendation {
  id: string;
  title: string;
  reason: string;
  focusText: string;
  lessonId?: string | null;
  assessmentId?: string | null;
  questionId?: string | null;
  sourceChunkId?: string | null;
}

export interface StudentTutorHistoryItem {
  sessionId: string;
  title: string;
  preview: string;
  updatedAt?: string | null;
  completed: boolean;
  stage?: string | null;
}

export interface StudentTutorBootstrapResponse {
  classes: StudentTutorClassSummary[];
  selectedClassId?: string | null;
  recentLessons: StudentTutorRecentLesson[];
  recentAttempts: StudentTutorRecentAttempt[];
  recommendations: StudentTutorRecommendation[];
  history: StudentTutorHistoryItem[];
}

export interface StudentTutorQuestion {
  id: string;
  question: string;
  expectedAnswer?: string;
  hint?: string;
}

export interface StudentTutorCitation {
  chunkId: string;
  label: string;
  lessonId?: string | null;
  assessmentId?: string | null;
  scoreBreakdown?: Record<string, number>;
  selectionReason?: string;
  sourceReference?: string;
}

export interface StudentTutorPlan {
  teachingGoal: string;
  likelyMisconceptions: string[];
  requiredEvidence: string[];
  questionDifficulty: string;
  answerGuardrail: string;
}

export interface StudentTutorSessionStartResponse {
  sessionId: string;
  stage: string;
  completed: boolean;
  message: string;
  recommendation: StudentTutorRecommendation;
  lessonPlan: string[];
  lessonBody: string;
  questions: StudentTutorQuestion[];
  tutorPlan?: StudentTutorPlan;
  citations: StudentTutorCitation[];
}

export interface StudentTutorMessageResponse {
  sessionId: string;
  stage: string;
  completed: boolean;
  message: string;
  questions: StudentTutorQuestion[];
  citations: StudentTutorCitation[];
}

export interface StudentTutorAnswerResult {
  questionId: string;
  isCorrectEnough: boolean;
  feedback: string;
}

export interface StudentTutorAnswerResponse {
  sessionId: string;
  stage: string;
  completed: boolean;
  message: string;
  results: StudentTutorAnswerResult[];
  questions: StudentTutorQuestion[];
  retryLesson?: string;
}

export interface StudentTutorSessionLogEntry {
  id: string;
  userText: string;
  assistantText: string;
  createdAt?: string | null;
  messageType?: string | null;
}

export interface StudentTutorSessionState {
  sessionKind: string;
  stage: string;
  classId: string;
  classLabel: string;
  recommendation: StudentTutorRecommendation;
  tutorPlan?: StudentTutorPlan;
  lessonPlan: string[];
  lessonBody: string;
  questions: StudentTutorQuestion[];
  citations: StudentTutorCitation[];
  round: number;
  completed: boolean;
  messageType?: string | null;
}

export interface StudentTutorSessionResponse {
  sessionId: string;
  state: StudentTutorSessionState;
  messages: StudentTutorSessionLogEntry[];
}

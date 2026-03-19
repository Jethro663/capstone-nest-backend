import type { ClassRecordCategory } from '@/types/assessment';
import type { GradingPeriod, AssessmentType, FeedbackLevel, QuestionType } from '@/utils/constants';

export interface AiCitation {
  chunkId: string;
  sourceType: string;
  lessonId?: string | null;
  assessmentId?: string | null;
  questionId?: string | null;
  label: string;
}

export interface MentorExplainResponse {
  reply: string;
  citations: AiCitation[];
  suggestedNext?: {
    lessonId?: string | null;
    label: string;
  } | null;
  modelUsed: string;
}

export interface MentorExplainDto {
  attemptId: string;
  questionId: string;
  message?: string;
}

export interface IndexingSummary {
  classId: string;
  chunksIndexed: number;
  lessonChunks?: number;
  extractionChunks?: number;
  questionChunks?: number;
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
}

export interface InterventionRecommendationDto {
  note?: string;
}

export type AiGenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'failed';

export interface AiGenerationJob {
  jobId: string;
  jobType: 'quiz_generation' | 'remedial_plan_generation' | string;
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
  suggestedAssignmentPayload: InterventionRecommendation['suggestedAssignmentPayload'];
  note?: string | null;
  runtime?: {
    outputId?: string;
    caseId?: string;
  };
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

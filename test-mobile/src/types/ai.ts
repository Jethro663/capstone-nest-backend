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

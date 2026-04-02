export type JaMode = "practice" | "ask" | "review";

export type JaPracticeEventType =
  | "focus_lost"
  | "focus_restored"
  | "focus_strike"
  | "resumed"
  | "completed"
  | "deleted";

export interface JaPracticeClassSummary {
  id: string;
  subjectName: string;
  subjectCode: string;
  sectionName?: string | null;
  gradeLevel?: string | null;
}

export interface JaPracticeRecommendation {
  id: string;
  title: string;
  reason: string;
  focusText: string;
  lessonId?: string | null;
  assessmentId?: string | null;
  questionId?: string | null;
  sourceChunkId?: string | null;
}

export interface JaPracticeSessionSummary {
  id: string;
  status: "active" | "completed";
  currentIndex: number;
  questionCount: number;
  strikeCount: number;
  rewardState: "pending" | "awarded";
  groundingStatus: string;
  startedAt: string;
  completedAt?: string | null;
}

export interface JaPracticeProgress {
  xpTotal: number;
  streakDays: number;
  sessionsCompleted: number;
  lastActivityAt?: string | null;
}

export interface JaPracticeBootstrapResponse {
  classes: JaPracticeClassSummary[];
  selectedClassId?: string | null;
  recommendations: JaPracticeRecommendation[];
  recentLessons: Array<Record<string, unknown>>;
  recentAttempts: Array<Record<string, unknown>>;
  sessions: JaPracticeSessionSummary[];
  progress?: JaPracticeProgress | null;
}

export interface JaPracticeItemOption {
  id: string;
  text: string;
  order: number;
}

export interface JaPracticeSessionItem {
  id: string;
  orderIndex: number;
  itemType: string;
  prompt: string;
  options?: JaPracticeItemOption[] | null;
  hint?: string | null;
  explanation?: string | null;
  citations?: Array<Record<string, unknown>> | null;
  validation?: Record<string, unknown> | null;
  response?: {
    id: string;
    studentAnswer: Record<string, unknown>;
    isCorrect: boolean;
    scoreDelta: number;
    feedback?: string | null;
    answeredAt: string;
  } | null;
}

export interface JaPracticeSessionResponse {
  session: JaPracticeSessionSummary & {
    classId: string;
    mode: "practice" | "review";
    sourceSnapshot?: Record<string, unknown> | null;
  };
  items: JaPracticeSessionItem[];
}

export interface JaPracticeSubmitResponseResult {
  sessionId: string;
  itemId: string;
  isCorrect: boolean;
  feedback: string;
  currentIndex: number;
  answeredCount: number;
  questionCount: number;
}

export interface JaPracticeCompleteResult {
  sessionId: string;
  totalScore: number;
  questionCount: number;
  awardedNow: boolean;
  xpAwarded: number;
}

export interface JaAskThreadSummary {
  id: string;
  title: string;
  status: "active" | "archived";
  updatedAt: string;
  lastMessageAt?: string | null;
}

export interface JaAskMessage {
  id: string;
  role: "student" | "assistant" | "system";
  content: string;
  blocked: boolean;
  quickAction?: string | null;
  citations?: Array<Record<string, unknown>> | null;
  createdAt?: string;
}

export interface JaAskThreadResponse {
  thread: {
    id: string;
    classId: string;
    title: string;
    status?: string;
  };
  messages: JaAskMessage[];
}

export interface JaAskResponsePayload {
  thread: {
    id: string;
    classId: string;
    title: string;
  };
  message: JaAskMessage;
  blocked: boolean;
  reason?: string | null;
  insufficientEvidence?: boolean;
}

export interface JaReviewAttemptSummary {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  submittedAt: string;
  score: number | null;
  passed: boolean | null;
}

export interface JaHubResponse {
  classes: JaPracticeClassSummary[];
  selectedClassId: string | null;
  progress: JaPracticeProgress | null;
  mastery: {
    classId: string;
    percent: number;
    label: string;
  } | null;
  badges: Array<{
    id: string;
    label: string;
    level: number;
    unlocked: boolean;
  }>;
  practice: JaPracticeBootstrapResponse;
  ask: {
    threads: JaAskThreadSummary[];
  };
  review: {
    eligibleAttempts: JaReviewAttemptSummary[];
    sessions?: JaPracticeSessionSummary[];
  };
}

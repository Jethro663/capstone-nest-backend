export interface EligibleClass {
  classId: string;
  class: {
    id: string;
    subjectName: string;
    subjectCode: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
    } | null;
  };
  interventionCaseId: string | null;
  isAtRisk: boolean;
  blendedScore: number | null;
  thresholdApplied: number;
  openedAt: string | null;
}

export type LxpPathStatus = "active" | "completed";

export interface LxpPathSummary {
  classId: string;
  class: EligibleClass["class"];
  interventionCaseId: string | null;
  status: LxpPathStatus;
  isAtRisk: boolean;
  blendedScore: number | null;
  thresholdApplied: number;
  openedAt: string | null;
  closedAt: string | null;
  counts: {
    steps: number;
    replays: number;
    pending: number;
    total: number;
    completed: number;
  };
  progress: {
    totalCheckpoints: number;
    completedCheckpoints: number;
    completionPercent: number;
  };
}

export interface EligibilityResponse {
  threshold: number;
  eligibleClasses: EligibleClass[];
  paths?: LxpPathSummary[];
}

export interface StudentInterventionAlert {
  caseId: string;
  classId: string;
  status: "pending" | "active";
  subjectName?: string | null;
  subjectCode?: string | null;
  section?: {
    id: string;
    name: string;
    gradeLevel: string;
  } | null;
  triggerScore: number | null;
  thresholdApplied: number;
  openedAt: string | null;
  hasAssignedPath: boolean;
}

export interface StudentInterventionAlertsResponse {
  alerts: StudentInterventionAlert[];
  count: number;
}

export interface LxpCheckpoint {
  id: string;
  type: "lesson_review" | "assessment_retry" | "guided_assessment" | "generated_lesson_review";
  label: string;
  order: number;
  isCompleted: boolean;
  completedAt: string | null;
  xpAwarded: number;
  lesson?: { id: string; title: string; description?: string | null; order?: number } | null;
  assessment?: {
    id: string;
    title: string;
    type?: "quiz" | "exam" | "assignment" | "file_upload";
    description?: string | null;
    passingScore?: number | null;
    dueDate?: string | null;
  } | null;
  generatedLesson?: GeneratedLessonContent | null;
  guidedAssessment?: GuidedAssessmentContent | null;
  guidedAttemptSummary?: GuidedAssessmentAttemptSummary | null;
}

export interface GeneratedLessonContent {
  id: string;
  title: string;
  summary?: string | null;
  lessonBody: string;
  weakConcepts: string[];
  sourceLessonIds?: string[];
  sourceReferences?: Array<Record<string, unknown>>;
  status?: "draft" | "approved" | "rejected" | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface GuidedAssessmentQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface GuidedAssessmentQuestion {
  id: string;
  type: "multiple_choice" | "multiple_select" | "true_false" | "dropdown";
  stem: string;
  explanation: string;
  hint?: string | null;
  reviewHint?: string | null;
  weakConceptTag?: string | null;
  options: GuidedAssessmentQuestionOption[];
}

export interface GuidedAssessmentContent {
  id: string;
  title: string;
  description?: string | null;
  weakConcepts: string[];
  sourceAssessmentId?: string | null;
  sourceReferences?: Array<Record<string, unknown>>;
  formativeSummary?: string | null;
  questions: GuidedAssessmentQuestion[];
  status?: "draft" | "approved" | "rejected" | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface GuidedAssessmentAttemptState {
  id: string;
  status: "in_progress" | "submitted";
  attemptNumber?: number;
  currentQuestionIndex: number;
  responses: Array<{
    questionId: string;
    answer?: string | string[];
    isCorrect?: boolean;
    explanationShown?: boolean;
    weakConceptTag?: string | null;
  }>;
  hintedQuestionIds: string[];
  scorePercent: number | null;
  submittedAt?: string | null;
}

export interface GuidedAssessmentAttemptSummary {
  maxAttempts: number;
  attemptsUsed: number;
  remainingAttempts: number;
  canRetry: boolean;
  isLocked: boolean;
  passingScore: number;
  passed: boolean;
  bestAttemptId: string | null;
  bestScorePercent: number | null;
  latestScorePercent: number | null;
  attempts: Array<{
    id: string;
    attemptNumber: number;
    status: "in_progress" | "submitted";
    scorePercent: number | null;
    correctCount: number | null;
    totalQuestions: number | null;
    submittedAt?: string | null;
    startedAt?: string | null;
  }>;
}

export interface GuidedAssessmentSessionResponse {
  assignmentId: string;
  checkpointLabel?: string;
  guidedAssessment: GuidedAssessmentContent;
  attempt: GuidedAssessmentAttemptState;
  attemptSummary: GuidedAssessmentAttemptSummary;
}

export interface GuidedAssessmentScoreComparison {
  sourceAssessmentId: string | null;
  baselineAttemptId: string | null;
  baselineScorePercent: number | null;
  baselineSubmittedAt?: string | null;
  currentAttemptId: string;
  currentScorePercent: number;
  currentSubmittedAt?: string | null;
  deltaScorePercent: number | null;
  trend: "improved" | "declined" | "unchanged" | "no_baseline";
}

export interface GuidedAssessmentResultResponse {
  assignmentId: string;
  attemptId: string;
  guidedAssessment: GuidedAssessmentContent | null;
  scorePercent: number;
  correctCount: number;
  totalQuestions?: number;
  attemptNumber?: number;
  passingScore?: number;
  passed?: boolean;
  attemptSummary?: GuidedAssessmentAttemptSummary;
  responses: Array<{
    questionId: string;
    answer?: string | string[];
    isCorrect?: boolean;
    explanationShown?: boolean;
    weakConceptTag?: string | null;
  }>;
  hintedQuestionIds: string[];
  formativeSummary: Record<string, unknown> | null;
  scoreComparison?: GuidedAssessmentScoreComparison | null;
  submittedAt?: string | null;
}

export interface PlaylistResponse {
  interventionCase: {
    id: string;
    status: string;
    openedAt: string;
    closedAt?: string | null;
    thresholdApplied: number;
    triggerScore: number | null;
  };
  progress: {
    xpTotal: number;
    starsTotal?: number;
    streakDays: number;
    checkpointsCompleted: number;
    completionPercent: number;
  };
  checkpoints: LxpCheckpoint[];
}

export interface LxpOverviewResponse {
  selectedClass: {
    classId: string;
    subjectName: string;
    subjectCode: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
    } | null;
    blendedScore: number | null;
    thresholdApplied: number;
    lastComputedAt: string | null;
  };
  interventionStatus: {
    caseId: string;
    status: string;
    code: "on_track" | "improving" | "needs_attention";
    label: string;
    message: string;
    openedAt: string;
    closedAt: string | null;
    triggerScore: number | null;
    thresholdApplied: number;
  };
  progress: {
    xpTotal: number;
    starsTotal: number;
    streakDays: number;
    checkpointsCompleted: number;
    totalCheckpoints: number;
    completionPercent: number;
    lastActivityAt: string | null;
  };
  subjectMastery: Array<{
    classId: string;
    subjectName: string;
    subjectCode: string;
    masteryPercent: number | null;
    thresholdApplied: number;
    status: "needs_attention" | "on_track" | "improving";
    isSelected: boolean;
    lastComputedAt: string | null;
  }>;
  recommendedAction: {
    assignmentId: string;
    type: "lesson_review" | "assessment_retry" | "guided_assessment" | "generated_lesson_review";
    title: string;
    subtitle: string;
    xpAwarded: number;
    href: string | null;
  } | null;
  upcomingAssessments: Array<{
    assignmentId: string;
    assessmentId: string;
    title: string;
    dueDate: string | null;
    type?: "quiz" | "exam" | "assignment" | "file_upload";
    passingScore: number | null;
    xpAwarded: number;
    href: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    occurredAt: string;
  }>;
  weakFocusItems: Array<{
    id: string;
    source: "performance" | "checkpoint";
    title: string;
    subtitle: string;
    masteryPercent: number | null;
    href: string;
  }>;
}

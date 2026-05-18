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

export type LxpPathStatus = 'active' | 'completed';

export interface LxpPathSummary {
  classId: string;
  class: EligibleClass['class'];
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

export interface LxpCheckpoint {
  id: string;
  type:
    | 'lesson_review'
    | 'assessment_retry'
    | 'generated_lesson_review'
    | 'guided_assessment';
  label: string;
  order: number;
  isCompleted: boolean;
  completedAt: string | null;
  xpAwarded: number;
  lesson?: { id: string; title: string; description?: string | null; order?: number } | null;
  generatedLesson?: GeneratedLessonContent | null;
  assessment?: {
    id: string;
    title: string;
    type?: 'quiz' | 'exam' | 'assignment' | 'file_upload';
    description?: string | null;
    passingScore?: number | null;
    dueDate?: string | null;
  } | null;
  guidedAssessment?: GuidedAssessmentContent | null;
}

export interface GeneratedLessonContent {
  id: string;
  title: string;
  summary?: string | null;
  lessonBody: string;
  weakConcepts: string[];
  sourceLessonIds?: string[];
  sourceReferences?: Array<Record<string, unknown>>;
  status?: 'draft' | 'approved' | 'rejected' | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
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
  status?: 'draft' | 'approved' | 'rejected' | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
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
    starsTotal: number;
    streakDays: number;
    checkpointsCompleted: number;
    completionPercent: number;
  };
  checkpoints: LxpCheckpoint[];
}

export interface LxpOverviewSelectedClass {
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
}

export interface LxpOverviewStatus {
  caseId: string;
  status: string;
  code: 'on_track' | 'improving' | 'needs_attention';
  label: string;
  message: string;
  openedAt: string;
  closedAt: string | null;
  triggerScore: number | null;
  thresholdApplied: number;
}

export interface LxpOverviewProgress {
  xpTotal: number;
  starsTotal: number;
  streakDays: number;
  checkpointsCompleted: number;
  totalCheckpoints: number;
  completionPercent: number;
  lastActivityAt: string | null;
}

export interface LxpOverviewSubjectMasteryRow {
  classId: string;
  subjectName: string;
  subjectCode: string;
  masteryPercent: number | null;
  thresholdApplied: number;
  status: 'needs_attention' | 'on_track' | 'improving';
  isSelected: boolean;
  lastComputedAt: string | null;
}

export interface LxpOverviewRecommendedAction {
  assignmentId: string;
  type:
    | 'lesson_review'
    | 'assessment_retry'
    | 'generated_lesson_review'
    | 'guided_assessment';
  title: string;
  subtitle: string;
  xpAwarded: number;
  href: string | null;
}

export interface LxpOverviewAssessmentItem {
  assignmentId: string;
  assessmentId: string;
  title: string;
  dueDate: string | null;
  type?: 'quiz' | 'exam' | 'assignment' | 'file_upload';
  passingScore: number | null;
  xpAwarded: number;
  href: string;
}

export interface LxpOverviewActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  occurredAt: string;
}

export interface LxpOverviewWeakFocusItem {
  id: string;
  source: 'performance' | 'checkpoint';
  title: string;
  subtitle: string;
  masteryPercent: number | null;
  href: string;
}

export interface LxpOverviewResponse {
  selectedClass: LxpOverviewSelectedClass;
  interventionStatus: LxpOverviewStatus;
  progress: LxpOverviewProgress;
  subjectMastery: LxpOverviewSubjectMasteryRow[];
  recommendedAction: LxpOverviewRecommendedAction | null;
  upcomingAssessments: LxpOverviewAssessmentItem[];
  recentActivity: LxpOverviewActivityItem[];
  weakFocusItems: LxpOverviewWeakFocusItem[];
}

export interface TeacherInterventionQueueItem {
  id: string;
  classId: string;
  status: 'pending' | 'active' | 'completed' | 'dismissed';
  studentId: string;
  student?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  openedAt: string;
  triggerScore: number | null;
  thresholdApplied: number;
  isCurrentlyAtRisk: boolean;
  latestBlendedScore: number | null;
  latestThreshold: number;
  aiPlanEligible: boolean;
  totalCheckpoints: number;
  completedCheckpoints: number;
  completionPercent: number;
  progress: {
    xpTotal: number;
    starsTotal: number;
    streakDays: number;
    checkpointsCompleted: number;
    lastActivityAt: string | null;
  };
}

export type TeacherPathScoreSource = 'guided_assessment' | 'assessment_retry';

export interface TeacherPathScore {
  source: TeacherPathScoreSource;
  assignmentId: string | null;
  attemptId: string;
  scorePercent: number;
  correctCount?: number | null;
  totalQuestions?: number | null;
  passed?: boolean | null;
  submittedAt: string | null;
}

export interface TeacherInterventionAssignment {
  id: string;
  type:
    | 'lesson_review'
    | 'assessment_retry'
    | 'generated_lesson_review'
    | 'guided_assessment';
  label: string;
  order: number;
  isCompleted: boolean;
  completedAt: string | null;
  xpAwarded: number;
  lesson?: {
    id: string;
    title: string;
    description: string | null;
  } | null;
  assessment?: {
    id: string;
    title: string;
    type: string | null;
    passingScore: number | null;
    dueDate: string | null;
  } | null;
  generatedLesson?: GeneratedLessonContent | null;
  guidedAssessment?: GuidedAssessmentContent | null;
  score?: TeacherPathScore | null;
}

export interface TeacherInterventionQueueResponse {
  classId: string;
  threshold: number;
  count: number;
  queue: TeacherInterventionQueueItem[];
}

export interface TeacherPendingInterventionCountResponse {
  pendingCount: number;
  classBreakdown: Array<{
    classId: string;
    subjectName: string;
    subjectCode: string;
    pendingCount: number;
  }>;
}

export interface TeacherInterventionCaseDetail {
  id: string;
  classId: string;
  studentId: string;
  student?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  status: 'pending' | 'active' | 'completed' | 'dismissed';
  openedAt: string;
  closedAt: string | null;
  triggerScore: number | null;
  thresholdApplied: number;
  note: string | null;
  completion: {
    totalCheckpoints: number;
    completedCheckpoints: number;
    completionPercent: number;
  };
  progress: {
    xpTotal: number;
    starsTotal: number;
    streakDays: number;
    checkpointsCompleted: number;
    lastActivityAt: string | null;
  };
  pathScore?: TeacherPathScore | null;
  canRegenerate?: boolean;
  assignments: TeacherInterventionAssignment[];
  generatedArtifacts?: {
    generatedLesson: GeneratedLessonContent | null;
    guidedAssessment: GuidedAssessmentContent | null;
  } | null;
  latestSnapshot: {
    assessmentAverage: number | null;
    classRecordAverage: number | null;
    blendedScore: number | null;
    thresholdApplied: number;
    isAtRisk: boolean;
    lastComputedAt: string;
  } | null;
  weakConcepts: Array<{
    concept: string;
    masteryScore: number;
    evidenceCount: number;
    errorCount: number;
    updatedAt: string;
  }>;
  recentRiskTransitions: Array<{
    id: string;
    previousIsAtRisk: boolean | null;
    currentIsAtRisk: boolean;
    blendedScore: number | null;
    thresholdApplied: number | null;
    triggerSource: string;
    createdAt: string;
  }>;
  links: {
    performancePage: string;
  };
}

export interface TeacherInterventionHistoryRow {
  id: string;
  classId: string;
  studentId: string;
  student?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  status: 'pending' | 'active' | 'completed' | 'dismissed';
  openedAt: string;
  closedAt: string | null;
  triggerSource: string | null;
  triggerScore: number | null;
  thresholdApplied: number;
  note: string | null;
  completion: {
    totalCheckpoints: number;
    completedCheckpoints: number;
    completionPercent: number;
  };
  pathScore: TeacherPathScore | null;
  canRegenerate: boolean;
  assignments: TeacherInterventionAssignment[];
}

export interface TeacherInterventionHistoryResponse {
  classId: string;
  scoreThreshold: number;
  history: TeacherInterventionHistoryRow[];
}

export interface RegenerateInterventionPathResponse {
  sourceCaseId: string;
  reusedExisting: boolean;
  scoreThreshold: number;
  pathScore: TeacherPathScore;
  case: TeacherInterventionQueueItem;
}

export interface LxpClassReport {
  classId: string;
  threshold: number;
  summary: {
    totalCases: number;
    pendingCases: number;
    activeCases: number;
    completedCases: number;
    interventionParticipation: number;
    averageDelta: number | null;
  };
  rows: Array<{
    id: string;
    studentId: string;
    status: string;
    triggerScore: number | null;
    currentBlendedScore: number | null;
    improvementDelta: number | null;
    openedAt: string;
    closedAt: string | null;
    student?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
  }>;
  leaderboard: Array<{
    rank: number;
    studentId: string;
    xpTotal: number;
    starsTotal: number;
    streakDays: number;
    checkpointsCompleted: number;
    lastActivityAt: string | null;
    student?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
  }>;
}

export type SystemEvaluationTargetModule =
  | 'lms'
  | 'lxp'
  | 'ai_mentor'
  | 'intervention'
  | 'overall';

export type SystemEvaluationFormType = 'system' | 'ja_hub';
export type SystemEvaluationAudienceRole = 'student' | 'teacher';
export type SystemEvaluationCampaignStatus = 'draft' | 'active' | 'closed';
export type SystemEvaluationAssignmentStatus =
  | 'pending'
  | 'submitted'
  | 'expired';

export interface SystemEvaluationQuestion {
  key: string;
  label: string;
}

export interface AssignedSystemEvaluationItem {
  id: string;
  campaignId: string;
  formType: SystemEvaluationFormType;
  targetModule: SystemEvaluationTargetModule;
  title: string;
  description: string;
  audienceRole: SystemEvaluationAudienceRole;
  classId: string | null;
  class?: {
    id: string;
    subjectName: string;
    subjectCode: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
    } | null;
  } | null;
  startsAt: string;
  endsAt: string;
  status: SystemEvaluationAssignmentStatus;
  submittedAt?: string | null;
  questions: SystemEvaluationQuestion[];
}

export interface MySystemEvaluationsResponse {
  pending: AssignedSystemEvaluationItem[];
  completed: AssignedSystemEvaluationItem[];
}

export interface CreateSystemEvaluationCampaignPayload {
  formType: SystemEvaluationFormType;
  audienceRole: SystemEvaluationAudienceRole;
  classId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status?: SystemEvaluationCampaignStatus;
}

export interface SystemEvaluationCampaign {
  id: string;
  formType: SystemEvaluationFormType;
  targetModule: SystemEvaluationTargetModule;
  audienceRole: SystemEvaluationAudienceRole;
  classId: string | null;
  class?: AssignedSystemEvaluationItem['class'];
  title: string;
  startsAt: string;
  endsAt: string;
  status: SystemEvaluationCampaignStatus;
  createdAt: string;
  updatedAt: string;
  assignmentCount: number;
  submittedCount: number;
}

export interface SystemEvaluationCampaignListResponse {
  campaigns: SystemEvaluationCampaign[];
  count: number;
}

export interface SystemEvaluationRow {
  id: string;
  submittedBy: string;
  campaignId?: string | null;
  targetModule: SystemEvaluationTargetModule;
  usabilityScore: number | string;
  functionalityScore: number | string;
  performanceScore: number | string;
  satisfactionScore: number | string;
  overallScore?: number | string | null;
  questionRatingsJson?: Record<string, number> | null;
  feedback: string | null;
  aiContextMetadata?: {
    sessionType?: 'mentor_chat' | 'mistake_explanation' | 'student_tutor';
    attemptId?: string;
    questionId?: string;
    classId?: string;
    sourceFlow?: string;
  } | null;
  createdAt: string;
  submitter?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  campaign?: {
    id: string;
    title: string;
    formType: SystemEvaluationFormType;
    audienceRole: SystemEvaluationAudienceRole;
    status: SystemEvaluationCampaignStatus;
  } | null;
}

export interface SystemEvaluationListResponse {
  count: number;
  rows: SystemEvaluationRow[];
  summary?: {
    averages: {
      usabilityScore: number;
      functionalityScore: number;
      performanceScore: number;
      satisfactionScore: number;
    };
    feedbackCount: number;
    moduleBreakdown: Array<{
      targetModule: SystemEvaluationTargetModule;
      count: number;
      averages: {
        usabilityScore: number;
        functionalityScore: number;
        performanceScore: number;
        satisfactionScore: number;
      };
    }>;
  };
}

export interface ApproveGeneratedRemedialPayload {
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
}

export interface GeneratedArtifactApprovalResponse {
  caseId?: string;
  generatedLesson: GeneratedLessonContent | null;
  guidedAssessment: GuidedAssessmentContent | null;
}

export interface GuidedAssessmentQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface GuidedAssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'multiple_select' | 'true_false' | 'dropdown';
  stem: string;
  explanation: string;
  hint?: string | null;
  weakConceptTag?: string | null;
  options: GuidedAssessmentQuestionOption[];
}

export interface GuidedAssessmentAttemptState {
  id: string;
  status: 'in_progress' | 'submitted';
  attemptNumber?: number;
  currentQuestionIndex: number;
  responses: Array<{
    questionId: string;
    answer?: string | string[];
    isCorrect?: boolean;
    explanationShown?: boolean;
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
    status: 'in_progress' | 'submitted';
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
  trend: 'improved' | 'declined' | 'unchanged' | 'no_baseline';
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

export type TeacherEvaluationType =
  | 'teacher_class'
  | 'ja_hub'
  | 'learners_path';

export interface TeacherEvaluationQuestion {
  key: string;
  label: string;
}

export interface StudentTeacherEvaluationItem {
  classId: string;
  gradingPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  schoolYear: string;
  evaluationType: TeacherEvaluationType;
  title: string;
  description: string;
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
  questions: TeacherEvaluationQuestion[];
}

export interface StudentTeacherEvaluationCompletedItem {
  id: string;
  classId: string;
  gradingPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  evaluationType: TeacherEvaluationType;
  title: string;
  class: StudentTeacherEvaluationItem['class'] | null;
  submittedAt: string;
}

export interface StudentTeacherEvaluationDashboardResponse {
  currentAcademicState: {
    schoolYear: string;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  };
  pending: StudentTeacherEvaluationItem[];
  completed: StudentTeacherEvaluationCompletedItem[];
}

export interface TeacherEvaluationCategoryAverage {
  key: string;
  label: string;
  average: number;
}

export interface TeacherEvaluationSummaryResponse {
  classes: Array<{
    id: string;
    subjectName: string;
    subjectCode: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
    } | null;
  }>;
  periods: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'>;
  evaluationType: TeacherEvaluationType;
  tabTitle: string;
  tabDescription: string;
  overview: {
    responseCount: number;
    eligibleCount: number;
    responseRate: number;
    averageOverall: number;
    latestSubmittedAt: string | null;
  };
  categoryAverages: TeacherEvaluationCategoryAverage[];
  comments: Array<{
    id: string;
    comment: string;
    submittedAt: string;
    gradingPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    classId: string;
    classLabel: string;
  }>;
  trends: Array<{
    classId: string;
    gradingPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    classLabel: string;
    responseCount: number;
    eligibleCount: number;
  }>;
}

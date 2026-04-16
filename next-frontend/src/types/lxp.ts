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

export interface EligibilityResponse {
  threshold: number;
  eligibleClasses: EligibleClass[];
}

export interface LxpCheckpoint {
  id: string;
  type: 'lesson_review' | 'assessment_retry';
  label: string;
  order: number;
  isCompleted: boolean;
  completedAt: string | null;
  xpAwarded: number;
  lesson?: { id: string; title: string; description?: string | null; order?: number } | null;
  assessment?: {
    id: string;
    title: string;
    type?: 'quiz' | 'exam' | 'assignment' | 'file_upload';
    description?: string | null;
    passingScore?: number | null;
    dueDate?: string | null;
  } | null;
}

export interface PlaylistResponse {
  interventionCase: {
    id: string;
    status: string;
    openedAt: string;
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
  type: 'lesson_review' | 'assessment_retry';
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
  assignments: Array<{
    id: string;
    type: 'lesson_review' | 'assessment_retry';
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
  }>;
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

export interface SystemEvaluationRow {
  id: string;
  submittedBy: string;
  targetModule: SystemEvaluationTargetModule;
  usabilityScore: number | string;
  functionalityScore: number | string;
  performanceScore: number | string;
  satisfactionScore: number | string;
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

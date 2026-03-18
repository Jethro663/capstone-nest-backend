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

export interface TeacherInterventionQueueItem {
  id: string;
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

export interface LxpClassReport {
  classId: string;
  threshold: number;
  summary: {
    totalCases: number;
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
}

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
  type: "lesson_review" | "assessment_retry";
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
    type: "lesson_review" | "assessment_retry";
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

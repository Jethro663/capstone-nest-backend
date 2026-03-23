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
  type: "lesson_review" | "assessment_retry";
  label: string;
  order: number;
  isCompleted: boolean;
  completedAt: string | null;
  xpAwarded: number;
  lesson?: { id: string; title: string; description?: string | null; order?: number } | null;
  assessment?: { id: string; title: string; description?: string | null; passingScore?: number | null } | null;
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
    streakDays: number;
    checkpointsCompleted: number;
    completionPercent: number;
  };
  checkpoints: LxpCheckpoint[];
}

export interface StudentOwnClassPerformance {
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
  } | null;
  assessmentAverage: number | null;
  classRecordAverage: number | null;
  blendedScore: number | null;
  assessmentSampleSize: number;
  classRecordSampleSize: number;
  hasData: boolean;
  isAtRisk: boolean;
  thresholdApplied: number;
  lastComputedAt: string | Date;
}

export interface StudentOwnPerformanceSummary {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  threshold: number;
  classes: StudentOwnClassPerformance[];
  overall: {
    totalClasses: number;
    classesWithData: number;
    atRiskClasses: number;
    averageBlendedScore: number | null;
  };
}

export interface TeacherClassPerformanceSummary {
  classId: string;
  totalStudents?: number;
  atRiskCount?: number;
  averageBlendedScore?: number | null;
  thresholdApplied?: number;
  [key: string]: unknown;
}

export interface TeacherClassAtRiskStudentRow {
  studentId?: string;
  firstName?: string;
  lastName?: string;
  blendedScore?: number | null;
  assessmentAverage?: number | null;
  classRecordAverage?: number | null;
  thresholdApplied?: number;
  [key: string]: unknown;
}

export interface TeacherClassAtRiskResponse {
  classId?: string;
  students?: TeacherClassAtRiskStudentRow[];
  [key: string]: unknown;
}

export type InterventionQuizTrend =
  | "improved"
  | "declined"
  | "unchanged"
  | "awaiting_retry";

export interface TeacherInterventionQuizComparisonRow {
  caseId: string;
  caseStatus: "pending" | "active" | "completed" | "dismissed";
  caseOpenedAt: string | Date;
  studentId: string;
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  assignmentId: string;
  assessmentId: string;
  assessmentTitle: string;
  beforeAttemptId: string | null;
  beforeScorePercent: number | null;
  beforeSubmittedAt: string | Date | null;
  afterAttemptId: string | null;
  afterScorePercent: number | null;
  afterSubmittedAt: string | Date | null;
  deltaScorePercent: number | null;
  trend: InterventionQuizTrend;
}

export interface TeacherInterventionQuizComparisonResponse {
  classId: string;
  count: number;
  improvedCount: number;
  declinedCount: number;
  unchangedCount: number;
  awaitingRetryCount: number;
  comparisons: TeacherInterventionQuizComparisonRow[];
}

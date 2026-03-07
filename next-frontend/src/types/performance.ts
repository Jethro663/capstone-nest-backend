export interface PerformanceStudentRow {
  studentId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
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

export interface ClassPerformanceSummary {
  classId: string;
  threshold: number;
  totalStudents: number;
  studentsWithData: number;
  atRiskCount: number;
  atRiskRate: number;
  averages: {
    blended: number | null;
    assessment: number | null;
    classRecord: number | null;
  };
  students: PerformanceStudentRow[];
}

export interface ClassAtRiskResponse {
  classId: string;
  threshold: number;
  count: number;
  students: PerformanceStudentRow[];
}

export interface PerformanceLogEntry {
  id: string;
  studentId: string;
  student?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  previousIsAtRisk: boolean | null;
  currentIsAtRisk: boolean;
  assessmentAverage: number | null;
  classRecordAverage: number | null;
  blendedScore: number | null;
  thresholdApplied: number | null;
  triggerSource: string;
  createdAt: string | Date;
}

export interface ClassPerformanceLogsResponse {
  classId: string;
  threshold: number;
  count: number;
  logs: PerformanceLogEntry[];
}

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

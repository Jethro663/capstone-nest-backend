import type { ClassItem } from './class';

export type ReportTab =
  | 'classRecord'
  | 'studentMasterList'
  | 'classEnrollment'
  | 'studentPerformance'
  | 'interventionParticipation'
  | 'assessmentSummary'
  | 'systemUsage';

export interface ReportQuery {
  classId?: string;
  sectionId?: string;
  gradingPeriod?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  studentId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  export?: 'csv';
}

export interface PaginatedReportResponse<T> {
  success: boolean;
  data: T;
  filters: ReportQuery;
  generatedAt: string;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface StudentMasterListRow {
  enrollmentId: string;
  enrolledAt: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  lrn: string | null;
  gradeLevel: string | null;
  classId: string | null;
  subjectName: string | null;
  subjectCode: string | null;
  sectionId: string | null;
  sectionName: string | null;
}

export interface ClassEnrollmentRow {
  id: string;
  subjectName: string;
  subjectCode: string;
  schoolYear: string;
  section: ClassItem['section'] | null;
  teacher: ClassItem['teacher'] | null;
  enrollmentCount: number;
  students: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    lrn: string | null;
    gradeLevel: string | null;
    enrolledAt: string;
  }[];
}

export interface StudentPerformanceReportRow {
  classId: string;
  subjectName: string;
  subjectCode: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  assessmentAverage: number | null;
  classRecordAverage: number | null;
  blendedScore: number | null;
  isAtRisk: boolean | null;
  thresholdApplied: number | null;
  lastComputedAt: string | null;
}

export interface InterventionParticipationRow {
  caseId: string;
  classId: string;
  subjectName: string | null;
  subjectCode: string | null;
  sectionName: string | null;
  studentId: string;
  studentName: string;
  email: string | null;
  status: string;
  triggerScore: number | string | null;
  thresholdApplied: number | string | null;
  openedAt: string;
  closedAt: string | null;
  assignmentCount: number;
  completedAssignments: number;
  completionRate: number;
  xpTotal: number;
  checkpointsCompleted: number;
}

export interface AssessmentSummaryRow {
  id: string;
  title: string;
  type: string;
  classId: string;
  subjectName: string | null;
  subjectCode: string | null;
  sectionName: string | null;
  quarter: string | null;
  isPublished: boolean;
  dueDate: string | null;
  totalPoints: number;
  maxAttempts: number;
  submittedAttempts: number;
  uniqueStudents: number;
  averageScore: number | null;
}

export interface SystemUsageReport {
  lessonCompletions: number;
  assessmentSubmissions: number;
  interventionOpens: number;
  interventionClosures: number;
  topActions: {
    action: string;
    total: number;
  }[];
}

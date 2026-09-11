export interface TranscriptQuery {
  page?: number;
  limit?: number;
  status?: "all" | "enrolled" | "dropped" | "completed";
  search?: string;
}

export interface TranscriptRow {
  id: string;
  studentId: string;
  classId: string | null;
  sectionId: string;
  status: string;
  enrolledAt: string;
  class: {
    id: string;
    subjectName: string;
    subjectCode: string;
    schoolYear: string;
  } | null;
  section: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
  } | null;
}

export interface TranscriptResponse {
  success: boolean;
  data: TranscriptRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AssessmentHistoryQuery {
  page?: number;
  limit?: number;
  submission?: "all" | "submitted" | "in_progress";
  search?: string;
}

export interface AssessmentHistoryRow {
  id: string;
  assessmentId: string;
  attemptNumber: number;
  score: number | null;
  scorePercent?: number | null;
  scoreBreakdown?: import("./assessment").AcademicScoreBreakdown | null;
  isSubmitted: boolean;
  submittedAt?: string | null;
  startedAt?: string | null;
  returnedAt?: string | null;
  passed?: boolean | null;
  assessment: {
    id: string;
    title: string;
    classId: string;
    dueDate?: string | null;
    quarter?: string | null;
    type: string;
    totalPoints: number;
    class: {
      id: string;
      subjectName: string;
      subjectCode: string;
    } | null;
  } | null;
}

export interface AssessmentHistoryResponse {
  success: boolean;
  data: AssessmentHistoryRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TeacherReportQuery {
  classId?: string;
  sectionId?: string;
  gradingPeriod?: "Q1" | "Q2" | "Q3" | "Q4";
  studentId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  export?: "csv";
}

export type TeacherReportRow = Record<string, unknown>;

export interface TeacherPaginatedReportResponse<T> {
  success: boolean;
  data: T;
  filters: TeacherReportQuery;
  count?: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  generatedAt: string;
  csv: string;
}

export type AdminReportKey =
  | "class-record"
  | "student-master-list"
  | "class-enrollment"
  | "student-performance"
  | "intervention-participation"
  | "assessment-summary"
  | "system-usage";

export type AdminReportQuery = TeacherReportQuery;

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
  section: { id: string; name: string; gradeLevel: string } | null;
  teacher: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  enrollmentCount: number;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    lrn: string | null;
    gradeLevel: string | null;
    enrolledAt: string;
  }>;
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
  topActions: Array<{ action: string; total: number }>;
}

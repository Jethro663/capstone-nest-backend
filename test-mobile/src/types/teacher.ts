export type TeacherSectionVisibilityStatus = "all" | "active" | "archived" | "hidden";

export interface TeacherSection {
  id: string;
  name: string;
  gradeLevel: string;
  schoolYear: string;
  roomNumber?: string | null;
  capacity?: number;
  isActive?: boolean;
  isHidden?: boolean;
  enrollmentCount?: number;
  adviser?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export interface TeacherSectionsListResponse {
  success?: boolean;
  data: TeacherSection[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TeacherSectionRosterStudent {
  id: string;
  studentId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  lrn?: string | null;
  profilePicture?: string | null;
}

export interface TeacherSectionCandidate {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  lrn?: string | null;
  gradeLevel?: string;
  profilePicture?: string | null;
  isEligible?: boolean;
  eligibilityReason?: string | null;
  hasActiveSectionEnrollment?: boolean;
  enrolledSectionId?: string | null;
  enrolledSectionName?: string | null;
}

export interface TeacherSectionScheduleSlot {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export interface TeacherSectionScheduleClassEntry {
  classId: string;
  subjectName: string;
  subjectCode: string;
  room: string;
  isActive: boolean;
  schedules: TeacherSectionScheduleSlot[];
}

export interface TeacherSectionSchedulePayload {
  section: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
    roomNumber?: string | null;
  };
  classes: TeacherSectionScheduleClassEntry[];
}

export interface TeacherClassRecord {
  id: string;
  classId: string;
  gradingPeriod?: string;
  status?: string;
  finalizedAt?: string | null;
  class?: {
    id: string;
    subjectName?: string;
    subjectCode?: string;
    schoolYear?: string;
  } | null;
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
}

export type TeacherReportRow = Record<string, unknown>;

export interface TeacherPaginatedReportResponse<T> {
  success?: boolean;
  data: T;
  count?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  generatedAt?: string;
  csv?: string;
}

export interface TeacherInterventionCase {
  id?: string;
  caseId?: string;
  classId?: string;
  className?: string;
  classCode?: string;
  studentId?: string;
  studentName?: string;
  status?: string;
  triggerScore?: number | null;
  thresholdApplied?: number | null;
  openedAt?: string | null;
  closedAt?: string | null;
}

export interface TeacherInterventionQueueResponse {
  queue: TeacherInterventionCase[];
  summary?: {
    active?: number;
    resolved?: number;
    total?: number;
  };
}

export interface TeacherPendingInterventionCountResponse {
  pendingCount: number;
}

export type TeacherEvaluationType = "teacher_class" | "ja_hub" | "learners_path";

export interface TeacherEvaluationSummaryResponse {
  evaluationType: TeacherEvaluationType;
  overallAverage?: number | null;
  responseCount?: number;
  classAverages?: Array<{
    classId: string;
    classCode?: string;
    className?: string;
    averageScore?: number | null;
    responseCount?: number;
  }>;
  gradingPeriodBreakdown?: Array<{
    gradingPeriod: "Q1" | "Q2" | "Q3" | "Q4";
    averageScore?: number | null;
    responseCount?: number;
  }>;
}

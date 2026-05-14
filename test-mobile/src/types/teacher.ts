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
  studentCount?: number;
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

export interface TeacherSectionStudentProfile {
  student: {
    id: string;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    email?: string | null;
    status?: string | null;
    profile?: {
      lrn?: string | null;
      gradeLevel?: string | null;
      profilePicture?: string | null;
      phone?: string | null;
      address?: string | null;
      familyName?: string | null;
      familyRelationship?: string | null;
      familyContact?: string | null;
    } | null;
  };
  section: {
    id: string;
    name: string;
    gradeLevel?: string | null;
    schoolYear?: string | null;
  };
  enrollments?: Array<{
    id: string;
    classId?: string | null;
    enrolledAt?: string | null;
    status?: string | null;
    class?: {
      id: string;
      subjectCode?: string | null;
      subjectName?: string | null;
    } | null;
  }>;
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
  student?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  status?: string;
  triggerScore?: number | null;
  thresholdApplied?: number | null;
  openedAt?: string | null;
  closedAt?: string | null;
  aiPlanEligible?: boolean;
}

export interface TeacherInterventionCaseDetail {
  case?: TeacherInterventionCase;
  student?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  class?: {
    id: string;
    subjectName?: string | null;
    subjectCode?: string | null;
  } | null;
  assignments?: Array<{
    assignmentId?: string;
    id?: string;
    type?: string;
    label?: string;
    status?: string;
    xpAwarded?: number;
    lesson?: { id: string; title?: string | null } | null;
    assessment?: { id: string; title?: string | null } | null;
  }>;
  generatedArtifacts?: Array<{
    id?: string;
    type?: string;
    status?: string;
    title?: string | null;
  }>;
  progress?: {
    completionPercent?: number;
    completedCheckpoints?: number;
    totalCheckpoints?: number;
  };
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

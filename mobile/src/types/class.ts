export interface ClassSchedule {
  id: string;
  days: ScheduleDay[];
  startTime: string;
  endTime: string;
}

export type ScheduleDay = "M" | "T" | "W" | "Th" | "F" | "Sa" | "Su";

export interface ClassItem {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel?: string;
  sectionId: string;
  section?: { id: string; name: string; gradeLevel: string } | null;
  teacherId?: string | null;
  teacher?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  schoolYear: string;
  room?: string;
  isActive: boolean;
  schedules?: ClassSchedule[];
  enrollmentCount?: number;
  createdAt?: string;
  updatedAt?: string;
  className?: string;
  name?: string;
  enrollments?: Array<{
    id: string;
    student?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      lrn?: string | null;
      profile?: {
        lrn?: string | null;
        profilePicture?: string | null;
      } | null;
    };
  }>;
  isHidden?: boolean;
  cardBannerUrl?: string | null;
  cardPreset?: string | null;
}

export type ClassVisibilityStatus = "all" | "active" | "inactive";

export interface EnrollmentRecord {
  id: string;
  studentId?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    lrn?: string | null;
    profilePicture?: string;
    profile?: {
      lrn?: string | null;
      profilePicture?: string | null;
    } | null;
  } | null;
}

export interface EnrollStudentDto {
  studentId: string;
}

export interface CreateClassDto {
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel?: string;
  sectionId: string;
  teacherId: string;
  schoolYear: string;
  room: string;
  schedules: Array<{ days: ScheduleDay[]; startTime: string; endTime: string }>;
  gradingProfile: {
    writtenWork: number;
    performanceTask: number;
    quarterlyAssessment: number;
  };
  academicWeightProfile?: "academic" | "practical";
  templateId?: string;
}

export interface UpdateClassDto {
  subjectName?: string;
  subjectCode?: string;
  subjectGradeLevel?: string;
  sectionId?: string;
  teacherId?: string;
  schoolYear?: string;
  room?: string;
  schedules?: Array<{
    days: ScheduleDay[];
    startTime: string;
    endTime: string;
  }>;
  isActive?: boolean;
  cardPreset?: string;
  cardBannerUrl?: string | null;
}

export interface TeacherStudentAssessmentHistoryItem {
  assessmentId: string;
  title: string;
  type: string;
  dueDate?: string | null;
  statusLabel: string;
  submittedAt?: string | null;
  score?: number | null;
  scorePercent?: number | null;
  scoreBreakdown?: import("./assessment").AcademicScoreBreakdown | null;
  totalPoints?: number | null;
}

export interface TeacherClassStudentOverview {
  student: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    status?: string | null;
    profile?: {
      lrn?: string | null;
      profilePicture?: string | null;
      phone?: string | null;
      address?: string | null;
      gradeLevel?: string | null;
    } | null;
  };
  classInfo: {
    classId: string;
    subjectName?: string | null;
    subjectCode?: string | null;
    sectionLabel?: string | null;
  };
  standing: {
    gradingPeriod?: string | null;
    overallGradePercent?: number | null;
    components: {
      writtenWorkPercent?: number | null;
      performanceTaskPercent?: number | null;
      quarterlyExamPercent?: number | null;
    };
  };
  history: {
    finished: TeacherStudentAssessmentHistoryItem[];
    late: TeacherStudentAssessmentHistoryItem[];
    pending: TeacherStudentAssessmentHistoryItem[];
  };
}

export type TeacherClassStudentProfile =
  TeacherClassStudentOverview["student"] & {
    profile?: TeacherClassStudentOverview["student"]["profile"];
  };

export interface StudentMasterlistSection {
  id: string;
  name: string;
  gradeLevel: string;
  schoolYear: string;
}

export interface StudentMasterlistItem {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  profilePicture?: string | null;
  lrn?: string | null;
  gradeLevel?: string | null;
  section: StudentMasterlistSection | null;
  isEligible: boolean;
  disabledReason: string | null;
}

export interface StudentMasterlistQuery {
  gradeLevel?: string;
  sectionId?: string;
  search?: string;
  eligibility?: "all" | "eligible" | "mismatch";
  sortBy?:
    | "lastName"
    | "firstName"
    | "email"
    | "gradeLevel"
    | "lrn"
    | "eligibility";
  sortDirection?: "asc" | "desc";
  prioritizeEligible?: boolean;
  page?: number;
  limit?: number;
}

export interface StudentMasterlistResponse {
  data: StudentMasterlistItem[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  classContext?: {
    classId: string;
    sectionId?: string;
    classGradeLevel?: string;
  };
}

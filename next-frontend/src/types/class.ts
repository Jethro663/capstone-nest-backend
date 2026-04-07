import type { ScheduleDay } from '@/utils/constants';

export interface ClassSchedule {
  id: string;
  days: ScheduleDay[];
  startTime: string;
  endTime: string;
}

export interface ClassItem {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel?: string;
  sectionId: string;
  section?: { id: string; name: string; gradeLevel: string };
  teacherId: string;
  teacher?: { id: string; firstName?: string; lastName?: string; email?: string };
  schoolYear: string;
  room?: string;
  cardPreset?: string;
  cardBannerUrl?: string | null;
  isActive: boolean;
  isHidden?: boolean;
  schedules?: ClassSchedule[];
  enrollments?: Enrollment[];
  createdAt?: string;
  updatedAt?: string;
  // Computed/joined
  className?: string;
  name?: string;
}

export interface CreateClassDto {
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel?: string;
  sectionId: string;
  teacherId: string | null;
  schoolYear: string;
  room?: string;
  cardPreset?: string;
  cardBannerUrl?: string | null;
  templateId?: string;
  schedules?: { days: ScheduleDay[]; startTime: string; endTime: string }[];
}

export type ClassVisibilityStatus = 'all' | 'active' | 'archived' | 'hidden';

export interface UpdateClassDto {
  subjectName?: string;
  subjectCode?: string;
  subjectGradeLevel?: string;
  sectionId?: string;
  teacherId?: string | null;
  schoolYear?: string;
  room?: string;
  cardPreset?: string;
  cardBannerUrl?: string | null;
  isActive?: boolean;
  schedules?: { days: ScheduleDay[]; startTime: string; endTime: string }[];
}

export interface EnrollStudentDto {
  studentId: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  sectionId?: string;
  student?: { id: string; firstName?: string; lastName?: string; email?: string; lrn?: string; profile?: { lrn?: string; profilePicture?: string } };
}

export type StudentClassPresentationMode = 'solid' | 'gradient' | 'preset';
export type StudentCourseViewMode = 'card' | 'wide';

export interface StudentClassPresentationPreference {
  classId: string;
  styleMode: StudentClassPresentationMode;
  styleToken: string;
  updatedAt?: string;
}

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
  status: string;
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
  page?: number;
  limit?: number;
}

export interface TeacherClassStudentProfile {
  classInfo: {
    id: string;
    subjectName: string;
    subjectCode: string;
  };
  student: {
    id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    status: string;
    profile: {
      lrn?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
      phone?: string | null;
      address?: string | null;
      gradeLevel?: string | null;
      familyName?: string | null;
      familyRelationship?: string | null;
      familyContact?: string | null;
      profilePicture?: string | null;
    } | null;
  };
  section: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
    roomNumber?: string | null;
    adviser: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    } | null;
  } | null;
}

export interface TeacherStudentAssessmentHistoryItem {
  assessmentId: string;
  title: string;
  type: string;
  dueDate?: string | null;
  status:
    | 'finished'
    | 'late'
    | 'not_started'
    | 'in_progress';
  statusLabel: string;
  submittedAt?: string | null;
  returnedAt?: string | null;
  isLate: boolean;
  lateByMinutes: number;
  score?: number | null;
  directScore?: number | null;
  totalPoints?: number | null;
  passed?: boolean | null;
  isReturned: boolean;
}

export interface TeacherClassStudentOverview {
  classInfo: {
    id: string;
    subjectName: string;
    subjectCode: string;
    sectionLabel: string;
  };
  student: TeacherClassStudentProfile['student'];
  section: TeacherClassStudentProfile['section'];
  standing: {
    gradingPeriod: string | null;
    overallGradePercent: number | null;
    components: {
      writtenWorkPercent: number | null;
      performanceTaskPercent: number | null;
      quarterlyExamPercent: number | null;
    };
  };
  history: {
    finished: TeacherStudentAssessmentHistoryItem[];
    late: TeacherStudentAssessmentHistoryItem[];
    pending: TeacherStudentAssessmentHistoryItem[];
  };
}

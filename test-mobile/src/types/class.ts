export interface ClassSchedule {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export interface ClassItem {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel?: string;
  sectionId: string;
  section?: { id: string; name: string; gradeLevel: string } | null;
  teacherId: string;
  teacher?: { id: string; firstName?: string; lastName?: string; email?: string } | null;
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
    profilePicture?: string;
  } | null;
}

export interface EnrollStudentDto {
  studentId: string;
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
  sortBy?: "lastName" | "firstName" | "email" | "gradeLevel" | "lrn" | "eligibility";
  sortDirection?: "asc" | "desc";
  prioritizeEligible?: boolean;
  page?: number;
  limit?: number;
}

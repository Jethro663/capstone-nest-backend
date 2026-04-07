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
}

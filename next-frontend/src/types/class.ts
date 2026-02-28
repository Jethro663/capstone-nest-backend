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
  isActive: boolean;
  schedules?: ClassSchedule[];
  enrollmentCount?: number;
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
  teacherId: string;
  schoolYear: string;
  room?: string;
  schedules?: { days: ScheduleDay[]; startTime: string; endTime: string }[];
}

export interface UpdateClassDto {
  subjectName?: string;
  subjectCode?: string;
  subjectGradeLevel?: string;
  sectionId?: string;
  teacherId?: string;
  schoolYear?: string;
  room?: string;
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
  student?: { id: string; firstName?: string; lastName?: string; email?: string; lrn?: string };
}

export interface StudentProfile {
  id: string;
  userId: string;
  lrn?: string;
  dob?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  gender?: string;
  phone?: string;
  address?: string;
  gradeLevel?: string;
  familyName?: string;
  familyRelationship?: string;
  familyContact?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherProfile {
  userId: string;
  department?: string;
  specialization?: string;
  profilePicture?: string;
  contactNumber?: string;
  employeeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileDto {
  lrn?: string;
  dob?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  familyName?: string;
  familyRelationship?: string;
  familyContact?: string;
  gradeLevel?: string;
  profilePicture?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

export interface AcademicEnrollmentRow {
  id: string;
  studentId: string;
  classId: string | null;
  sectionId: string;
  status: string;
  enrolledAt: string;
  class?: {
    id: string;
    subjectName: string;
    subjectCode: string;
    schoolYear: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
      schoolYear: string;
    } | null;
  } | null;
  section?: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
  } | null;
}

export interface AcademicPerformanceRow {
  studentId: string;
  classId: string;
  assessmentAverage: number | string | null;
  classRecordAverage: number | string | null;
  blendedScore: number | string | null;
  assessmentSampleSize: number;
  classRecordSampleSize: number;
  hasData: boolean;
  isAtRisk: boolean;
  thresholdApplied: number | string;
  lastComputedAt: string;
  class?: {
    id: string;
    subjectName: string;
    subjectCode: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
    } | null;
  } | null;
}

export interface AcademicAssessmentAttempt {
  id: string;
  assessmentId: string;
  attemptNumber: number;
  score: number | null;
  isSubmitted: boolean;
  submittedAt?: string | null;
  expiresAt?: string | null;
  assessment?: {
    id: string;
    title: string;
    classId: string;
    dueDate?: string | null;
    quarter?: string | null;
    type: string;
    totalPoints: number;
    class?: {
      id: string;
      subjectName: string;
      subjectCode: string;
    } | null;
  } | null;
}

export interface AcademicInterventionSummary {
  id: string;
  status: string;
  triggerScore: number | string | null;
  thresholdApplied: number | string;
  openedAt: string;
  closedAt?: string | null;
  note?: string | null;
  assignmentCount: number;
  completedAssignments: number;
  class?: {
    id: string;
    subjectName: string;
    subjectCode: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
    } | null;
  } | null;
}

export interface AcademicLxpProgress {
  studentId: string;
  classId: string;
  xpTotal: number;
  streakDays: number;
  checkpointsCompleted: number;
  lastActivityAt?: string | null;
  class?: {
    id: string;
    subjectName: string;
    subjectCode: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
    } | null;
  } | null;
}

export interface AcademicClassRecordHistory {
  id: string;
  classRecordId: string;
  finalPercentage: number | string;
  remarks: 'Passed' | 'For Intervention';
  computedAt: string;
  classRecord?: {
    id: string;
    classId: string;
    gradingPeriod: string;
    status: string;
    class?: {
      id: string;
      subjectName: string;
      subjectCode: string;
    } | null;
  } | null;
}

export interface AcademicSummary {
  profile: StudentProfile | null;
  currentEnrollments: AcademicEnrollmentRow[];
  enrollmentHistory: AcademicEnrollmentRow[];
  performanceSummary: AcademicPerformanceRow[];
  assessmentHistory: AcademicAssessmentAttempt[];
  interventionSummary: AcademicInterventionSummary[];
  lxpProgress: AcademicLxpProgress[];
  classRecordHistory: AcademicClassRecordHistory[];
}

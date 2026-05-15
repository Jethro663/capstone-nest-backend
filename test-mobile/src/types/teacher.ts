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

export interface GeneratedLessonContent {
  id?: string;
  title: string;
  summary?: string | null;
  lessonBody?: string | null;
  weakConcepts?: string[];
  sourceLessonIds?: string[];
  sourceReferences?: Array<Record<string, unknown>>;
  status?: "draft" | "approved" | "rejected" | string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface GuidedAssessmentQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface GuidedAssessmentQuestion {
  id: string;
  type: "multiple_choice" | "multiple_select" | "true_false" | "dropdown" | string;
  stem: string;
  explanation?: string | null;
  hint?: string | null;
  weakConceptTag?: string | null;
  sourceQuestionId?: string | null;
  options?: GuidedAssessmentQuestionOption[];
}

export interface GuidedAssessmentContent {
  id?: string;
  title: string;
  description?: string | null;
  weakConcepts?: string[];
  sourceAssessmentId?: string | null;
  sourceReferences?: Array<Record<string, unknown>>;
  formativeSummary?: string | null;
  questions?: GuidedAssessmentQuestion[];
  status?: "draft" | "approved" | "rejected" | string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
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
  isCurrentlyAtRisk?: boolean;
  latestBlendedScore?: number | null;
  latestThreshold?: number | null;
  totalCheckpoints?: number;
  completedCheckpoints?: number;
  completionPercent?: number;
  progress?: {
    completionPercent?: number;
    completedCheckpoints?: number;
    totalCheckpoints?: number;
  } | null;
}

export interface TeacherInterventionCaseDetail {
  id?: string;
  classId?: string;
  studentId?: string;
  status?: string;
  openedAt?: string | null;
  closedAt?: string | null;
  triggerScore?: number | null;
  thresholdApplied?: number | null;
  note?: string | null;
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
    isCompleted?: boolean;
    completedAt?: string | null;
    lesson?: { id: string; title?: string | null; description?: string | null; order?: number } | null;
    assessment?: { id: string; title?: string | null; type?: string; description?: string | null; passingScore?: number | null; dueDate?: string | null } | null;
    generatedLesson?: GeneratedLessonContent | null;
    guidedAssessment?: GuidedAssessmentContent | null;
  }>;
  generatedArtifacts?:
    | Array<{
        id?: string;
        type?: string;
        status?: string;
        title?: string | null;
      }>
    | {
        generatedLesson?: GeneratedLessonContent | null;
        guidedAssessment?: GuidedAssessmentContent | null;
      }
    | null;
  completion?: {
    completionPercent?: number;
    completedCheckpoints?: number;
    totalCheckpoints?: number;
  };
  progress?: {
    completionPercent?: number;
    completedCheckpoints?: number;
    totalCheckpoints?: number;
    xpTotal?: number;
    starsTotal?: number;
    streakDays?: number;
    checkpointsCompleted?: number;
    lastActivityAt?: string | null;
  };
  latestSnapshot?: {
    assessmentAverage?: number | null;
    classRecordAverage?: number | null;
    blendedScore?: number | null;
    thresholdApplied?: number | null;
    isAtRisk?: boolean;
    lastComputedAt?: string | null;
  } | null;
  weakConcepts?: Array<{
    concept?: string;
    masteryScore?: number;
    evidenceCount?: number;
    errorCount?: number;
    updatedAt?: string | null;
  }>;
  recentRiskTransitions?: Array<{
    id?: string;
    previousIsAtRisk?: boolean | null;
    currentIsAtRisk?: boolean;
    blendedScore?: number | null;
    thresholdApplied?: number | null;
    triggerSource?: string;
    createdAt?: string | null;
  }>;
  canRegenerate?: boolean;
}

export interface ApproveGeneratedRemedialPayload {
  generatedLessonDraft?: {
    title: string;
    summary?: string | null;
    lessonBody: string;
    weakConcepts: string[];
    sourceLessonIds: string[];
    sourceReferences: Array<Record<string, unknown>>;
  } | null;
  generatedGuidedAssessmentDraft?: {
    sourceAssessmentId?: string | null;
    title: string;
    description?: string | null;
    weakConcepts: string[];
    formativeSummary?: string | null;
    sourceReferences: Array<Record<string, unknown>>;
    questions: GuidedAssessmentQuestion[];
  } | null;
}

export interface GeneratedArtifactApprovalResponse {
  caseId?: string;
  generatedLesson: GeneratedLessonContent | null;
  guidedAssessment: GuidedAssessmentContent | null;
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

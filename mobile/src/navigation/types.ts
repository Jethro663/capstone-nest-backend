export type {
  StudentParityRouteName,
  StudentSupportRouteName,
} from "./student-route-manifest";
export type {
  TeacherParityRouteName,
  TeacherStackRouteName,
  TeacherTabRouteName,
} from "./teacher-route-manifest";

export type ClassDetailInitialTab = "modules" | "assignments" | "announcements" | "discussion" | "calendar";
export type JaPanel = "practice" | "ask" | "review" | "lxp";
export type LxpMobileTab = "paths" | "steps" | "replays" | "case" | "overview";
export type TeacherClassDetailTab =
  | "modules"
  | "assessments"
  | "announcements"
  | "extraction"
  | "discussion"
  | "classRecord"
  | "calendar"
  | "students";

export type JaRouteParams = {
  panel?: JaPanel;
  classId?: string;
  lxpClassId?: string;
  lxpTab?: LxpMobileTab;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ClassWorkspace: { classId: string };
  ClassDetail: { classId: string; initialTab?: ClassDetailInitialTab };
  ModuleDetail: { classId: string; moduleId: string };
  Calendar: { classId?: string } | undefined;
  Courses: undefined;
  Lessons: undefined;
  LessonDetail: { lessonId: string; classId?: string };
  AssessmentDetail: { assessmentId: string; classId: string };
  AssessmentTake: { assessmentId: string };
  AssessmentResults: { attemptId: string };
  AssessmentHistory: { assessmentId?: string; classId?: string } | undefined;
  LXP: { classId?: string; tab?: LxpMobileTab } | undefined;
  StudentGuidedAssessment: { classId: string; assignmentId: string };
  StudentJaReviewAssessment: { classId: string; assessmentId?: string; attemptId?: string; title?: string };
  StudentEvaluations: undefined;
  Chatbot: { classId?: string } | undefined;
  Performance: undefined;
  Transcript: undefined;
  AiTutor: { classId?: string } | undefined;
  TeacherClassDetail: { classId: string; initialTab?: TeacherClassDetailTab };
  TeacherModuleDetail: { classId: string; moduleId: string };
  TeacherModuleFileDetail: { classId: string; moduleId: string; fileId: string; itemId?: string };
  TeacherLessonDetail: { lessonId: string; classId?: string };
  TeacherLessonEditor: { lessonId: string; classId?: string };
  TeacherAssessmentDetail: { assessmentId: string; classId?: string };
  TeacherAssessmentEditor: { assessmentId?: string; classId?: string } | undefined;
  TeacherAssessmentReview: { attemptId: string; assessmentId?: string; classId?: string };
  TeacherAssessmentAttemptResult: { attemptId: string; assessmentId?: string; classId?: string };
  TeacherCalendar: { classId?: string } | undefined;
  TeacherCreateModule: { classId: string };
  TeacherCreateAssessment: { classId: string };
  TeacherClassAddStudents: { classId: string };
  TeacherClassStudentOverview: { classId: string; studentId: string };
  TeacherSectionDetail: { sectionId: string };
  TeacherSectionAddStudents: { sectionId: string };
  TeacherSectionStudentProfile: { sectionId: string; studentId: string };
  TeacherExtractionDetail: { extractionId: string; classId?: string };
  TeacherAiDraft: { classId: string; jobId?: string };
  TeacherInterventionDetail: { caseId: string; classId?: string };
  TeacherLibrary: undefined;
  TeacherClassRecord: undefined;
  TeacherReports: undefined;
  TeacherInterventions: { classId?: string } | undefined;
  TeacherPerformance: undefined;
  TeacherEvaluations: undefined;
  TeacherAnnouncements: undefined;
  TeacherMore: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Classes: undefined;
  Sections: undefined;
  Assessments: undefined;
  JA: JaRouteParams | undefined;
  Announcements: undefined;
  Profile: undefined;
  More: undefined;
  // Deprecated keys kept temporarily for migration-only screen compatibility.
  LXP: undefined;
  Progress: undefined;
  Lessons: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  VerifyEmail: { email: string; flow?: "activation" | "verification" };
  ForgotPassword: undefined;
  ResetPassword: { email?: string; code?: string } | undefined;
  SetInitialPassword: { email: string };
};

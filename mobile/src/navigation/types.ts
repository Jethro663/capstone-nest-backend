import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type {
  StudentParityRouteName,
  StudentSupportRouteName,
} from "./student-route-manifest";
export type {
  TeacherDrawerRouteName,
  TeacherParityRouteName,
  TeacherStackRouteName,
} from "./teacher-route-manifest";

export type ClassDetailInitialTab =
  | "modules"
  | "assignments"
  | "announcements"
  | "discussion"
  | "calendar";
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

export type TeacherClassDetailSource =
  | "classes"
  | "home"
  | "announcements"
  | "calendar";
export type TeacherModuleDetailSource = "class" | "library";
export type TeacherLessonDetailSource = "module" | "lessons";
export type TeacherAiDraftSource = "class" | "assessments";
export type StudentClassDetailSource =
  | "classes"
  | "home"
  | "calendar"
  | "courses"
  | "assessments";
export type StudentModuleDetailSource = "class";
export type StudentLessonDetailSource = "module" | "class" | "home" | "ja";
export type StudentAssessmentDetailSource =
  | "assessments"
  | "class"
  | "home"
  | "calendar"
  | "history";

export type AdminToolSection =
  | "users"
  | "evaluations"
  | "calendar"
  | "library"
  | "reports"
  | "audit"
  | "diagnostics"
  | "roster"
  | "templates"
  | "settings"
  | "records"
  | "userReports"
  | "chatbot";

export type JaRouteParams = {
  panel?: JaPanel;
  classId?: string;
  lxpClassId?: string;
  lxpTab?: LxpMobileTab;
};

export type RootStackParamList = {
  CompleteProfile: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  TeacherDrawer: NavigatorScreenParams<MainTabParamList> | undefined;
  Notifications: undefined;
  AdminTools: { section?: AdminToolSection };
  AdminAcademic: undefined;
  AdminSettingsAcademicYear: undefined;
  AdminSettingsAssessmentsGrading: undefined;
  AdminSettingsYearTransition: undefined;
  AdminSettingsLearnerCompletion: undefined;
  AdminSettingsAuditRecovery: undefined;
  AdminSettingsDemoMode: undefined;
  AdminSettingsResetSchoolData: undefined;
  AdminStudentReadiness: undefined;
  AdminAnnouncements: undefined;
  AdminLifecycleReview: {
    targetType: "CLASS" | "SECTION" | "STUDENT";
    targetId: string;
    targetLabel: string;
    isActive: boolean;
    sectionId?: string;
    classId?: string;
  };
  AdminSectionDetail: { sectionId: string };
  AdminTemplateDetail: { templateId: string };
  AdminCreateUser: undefined;
  AdminUserDetail: { userId: string };
  ClassWorkspace: { classId: string };
  ClassDetail: {
    classId: string;
    initialTab?: ClassDetailInitialTab;
    source?: StudentClassDetailSource;
  };
  ModuleDetail: {
    classId: string;
    moduleId: string;
    source?: StudentModuleDetailSource;
  };
  Calendar: { classId?: string } | undefined;
  Courses: undefined;
  Lessons: undefined;
  LessonDetail: {
    lessonId: string;
    classId?: string;
    moduleId?: string;
    source?: StudentLessonDetailSource;
  };
  AssessmentDetail: {
    assessmentId: string;
    classId: string;
    source?: StudentAssessmentDetailSource;
  };
  AssessmentTake: { assessmentId: string };
  AssessmentResults: { attemptId: string };
  AssessmentHistory: { assessmentId?: string; classId?: string } | undefined;
  LXP: { classId?: string; tab?: LxpMobileTab } | undefined;
  StudentGuidedAssessment: { classId: string; assignmentId: string };
  StudentGeneratedLesson: { classId: string; assignmentId: string };
  StudentJaReviewAssessment: {
    classId: string;
    assessmentId?: string;
    attemptId?: string;
    title?: string;
  };
  StudentEvaluations: undefined;
  Chatbot: { classId?: string } | undefined;
  Performance: undefined;
  Transcript: undefined;
  AiTutor: { classId?: string } | undefined;
  TeacherClassDetail: {
    classId: string;
    initialTab?: TeacherClassDetailTab;
    source?: TeacherClassDetailSource;
  };
  TeacherModuleDetail: {
    classId: string;
    moduleId: string;
    source?: TeacherModuleDetailSource;
  };
  TeacherModuleFileDetail: {
    classId: string;
    moduleId: string;
    fileId: string;
    itemId?: string;
  };
  TeacherLessonDetail: {
    lessonId: string;
    classId?: string;
    moduleId?: string;
    source?: TeacherLessonDetailSource;
    moduleSource?: TeacherModuleDetailSource;
  };
  TeacherLessonEditor: { lessonId: string; classId?: string };
  TeacherLessons: undefined;
  TeacherAssessmentDetail: { assessmentId: string; classId?: string };
  TeacherAssessmentEditor:
    | { assessmentId?: string; classId?: string; created?: boolean }
    | undefined;
  TeacherAssessmentReview: {
    attemptId: string;
    assessmentId?: string;
    classId?: string;
  };
  TeacherAssessmentAttemptResult: {
    attemptId: string;
    assessmentId?: string;
    classId?: string;
  };
  TeacherCalendar: { classId?: string } | undefined;
  TeacherCreateModule: { classId: string };
  TeacherCreateAssessment: { classId: string };
  TeacherClassAddStudents: {
    classId: string;
    sourceTab?: TeacherClassDetailTab;
  };
  TeacherClassStudentOverview: { classId: string; studentId: string };
  TeacherSectionDetail: { sectionId: string };
  TeacherSectionAddStudents: { sectionId: string };
  TeacherSectionStudentProfile: { sectionId: string; studentId: string };
  TeacherExtractionDetail: { extractionId: string; classId?: string };
  TeacherAiDraft: {
    classId: string;
    jobId?: string;
    source?: TeacherAiDraftSource;
    sourceTab?: TeacherClassDetailTab;
  };
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
  Academic: undefined;
  Home: undefined;
  AdminUsers: { section?: AdminToolSection } | undefined;
  AdminSections: undefined;
  AdminClasses: undefined;
  AdminRoster: { section?: AdminToolSection } | undefined;
  AdminAnnouncements: undefined;
  AdminEvaluations: { section?: AdminToolSection } | undefined;
  AdminCalendar: { section?: AdminToolSection } | undefined;
  AdminTemplates: { section?: AdminToolSection } | undefined;
  AdminLibrary: { section?: AdminToolSection } | undefined;
  AdminReports: { section?: AdminToolSection } | undefined;
  AdminAudit: { section?: AdminToolSection } | undefined;
  AdminDiagnostics: { section?: AdminToolSection } | undefined;
  AdminSettings: { section?: AdminToolSection } | undefined;
  AdminClassRecord: { section?: AdminToolSection } | undefined;
  AdminUserReports: { section?: AdminToolSection } | undefined;
  AdminChatbot: { section?: AdminToolSection } | undefined;
  Dashboard: undefined;
  StudentCalendar: undefined;
  Classes: undefined;
  Sections: undefined;
  Assessments: undefined;
  TeacherCalendar: { classId?: string } | undefined;
  TeacherLessons: undefined;
  TeacherLibrary: undefined;
  TeacherClassRecord: undefined;
  TeacherAnnouncements: undefined;
  TeacherReports: undefined;
  TeacherInterventions: { classId?: string } | undefined;
  TeacherPerformance: undefined;
  TeacherEvaluations: undefined;
  JA: JaRouteParams | undefined;
  Announcements: undefined;
  Profile: undefined;
  More: undefined;
  // Deprecated keys kept temporarily for migration-only screen compatibility.
  LXP: undefined;
  Progress: undefined;
  Lessons: undefined;
};

export type TeacherDrawerScreenProps<RouteName extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, RouteName>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type AuthStackParamList = {
  Login: undefined;
  VerifyEmail: { email: string; flow?: "activation" | "verification" };
  ForgotPassword: undefined;
  ResetPassword: { email?: string; code?: string } | undefined;
  SetInitialPassword: { email: string };
};

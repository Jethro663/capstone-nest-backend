export type {
  StudentParityRouteName,
  StudentSupportRouteName,
} from "./student-route-manifest";

export type ClassDetailInitialTab = "modules" | "assignments" | "announcements" | "calendar";

export type RootStackParamList = {
  MainTabs: undefined;
  ClassWorkspace: { classId: string };
  ClassDetail: { classId: string; initialTab?: ClassDetailInitialTab };
  ModuleDetail: { classId: string; moduleId: string };
  Courses: undefined;
  Lessons: undefined;
  LessonDetail: { lessonId: string; classId?: string };
  AssessmentDetail: { assessmentId: string; classId: string };
  AssessmentTake: { assessmentId: string };
  AssessmentResults: { attemptId: string };
  AssessmentHistory: { assessmentId?: string; classId?: string } | undefined;
  LXP: undefined;
  Chatbot: { classId?: string } | undefined;
  Performance: undefined;
  Transcript: undefined;
  AiTutor: { classId?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Classes: undefined;
  Assessments: undefined;
  JA: undefined;
  Announcements: undefined;
  Profile: undefined;
  // Deprecated keys kept temporarily for migration-only screen compatibility.
  LXP: undefined;
  Progress: undefined;
  Lessons: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

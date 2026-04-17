export const studentParityRouteNames = [
  "Dashboard",
  "Classes",
  "ClassDetail",
  "ModuleDetail",
  "Courses",
  "Lessons",
  "LessonDetail",
  "Assessments",
  "AssessmentDetail",
  "AssessmentTake",
  "AssessmentResults",
  "AssessmentHistory",
  "Announcements",
  "JA",
  "LXP",
  "Chatbot",
  "Performance",
  "Profile",
  "Transcript",
] as const;

export type StudentParityRouteName = (typeof studentParityRouteNames)[number];

export type RootStackParamList = {
  MainTabs: undefined;
  ClassWorkspace: { classId: string };
  ClassDetail: { classId: string };
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

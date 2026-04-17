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
  Chatbot: { classId?: string } | undefined;
  Performance: undefined;
  Transcript: undefined;
  LXP: undefined;
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

export const studentTabRouteNames = [
  "Dashboard",
  "Classes",
  "Assessments",
  "JA",
  "Announcements",
  "Profile",
] as const satisfies ReadonlyArray<keyof MainTabParamList>;

export const studentParityStackRouteNames = [
  "ClassDetail",
  "ModuleDetail",
  "Courses",
  "Lessons",
  "LessonDetail",
  "AssessmentDetail",
  "AssessmentTake",
  "AssessmentResults",
  "AssessmentHistory",
  "Chatbot",
  "Performance",
  "Transcript",
  "LXP",
] as const satisfies ReadonlyArray<keyof RootStackParamList>;

export const studentSupportStackRouteNames = ["ClassWorkspace", "AiTutor"] as const satisfies ReadonlyArray<
  keyof RootStackParamList
>;

export const studentParityRouteNames = [
  ...studentTabRouteNames,
  ...studentParityStackRouteNames,
] as const;

export type StudentParityRouteName = (typeof studentParityRouteNames)[number];
export type StudentSupportRouteName = (typeof studentSupportStackRouteNames)[number];

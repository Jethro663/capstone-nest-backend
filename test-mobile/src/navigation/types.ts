export type RootStackParamList = {
  MainTabs: undefined;
  ClassWorkspace: { classId: string };
  AssessmentDetail: { assessmentId: string; classId: string };
  AssessmentTake: { assessmentId: string };
  AssessmentResults: { attemptId: string };
  AiTutor: { classId?: string } | undefined;
};

export type MainTabParamList = {
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

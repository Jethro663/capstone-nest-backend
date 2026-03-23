export type RootStackParamList = {
  MainTabs: undefined;
  SubjectLessons: { classId: string };
  AssessmentDetail: { assessmentId: string; classId: string };
  AssessmentTake: { assessmentId: string };
  AssessmentResults: { attemptId: string };
  AiTutor: { classId?: string } | undefined;
};

export type MainTabParamList = {
  Lessons: undefined;
  Assessments: undefined;
  LXP: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

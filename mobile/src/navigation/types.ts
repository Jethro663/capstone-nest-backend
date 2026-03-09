export type AuthStackParamList = {
  Login: undefined;
  VerifyEmail: { email: string; flow?: 'activation' | 'verification' } | undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string; code?: string } | undefined;
  SetActivationPassword: { email: string } | undefined;
};

export type StudentTabParamList = {
  Dashboard: undefined;
  Courses: undefined;
  Lxp: undefined;
  Announcements: undefined;
  Profile: undefined;
};

export type StudentRouteParamList = {
  StudentTabs: undefined;
  ClassDetail: { classId: string };
  LessonDetail: { lessonId: string; classId?: string };
  AssessmentDetail: { assessmentId: string; classId?: string };
  AssessmentTake: { assessmentId: string; attemptId?: string; timeLimit?: number | null };
  AssessmentResults: { assessmentId: string; attemptId: string };
  Performance: undefined;
};

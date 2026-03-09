import type { AssessmentType, QuestionType, FeedbackLevel, GradingPeriod } from '@/utils/constants';

export type ClassRecordCategory = 'written_work' | 'performance_task' | 'quarterly_assessment';

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  classId: string;
  type: AssessmentType;
  totalPoints?: number;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number | null;
  dueDate?: string;
  isPublished: boolean;
  feedbackLevel?: FeedbackLevel;
  feedbackDelayHours?: number;
  classRecordCategory?: ClassRecordCategory;
  quarter?: GradingPeriod;
  questions?: AssessmentQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  type: QuestionType;
  content: string;
  points: number;
  order: number;
  isRequired?: boolean;
  explanation?: string;
  imageUrl?: string;
  options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface CreateAssessmentDto {
  title: string;
  description?: string;
  classId: string;
  type?: AssessmentType;
  dueDate?: string;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number;
  feedbackLevel?: FeedbackLevel;
  feedbackDelayHours?: number;
  classRecordCategory?: ClassRecordCategory;
  quarter?: GradingPeriod;
}

export interface UpdateAssessmentDto {
  title?: string;
  description?: string;
  type?: AssessmentType;
  dueDate?: string | null;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number | null;
  isPublished?: boolean;
  feedbackLevel?: FeedbackLevel;
  feedbackDelayHours?: number;
  classRecordCategory?: ClassRecordCategory;
  quarter?: GradingPeriod;
}

export interface CreateQuestionDto {
  assessmentId: string;
  type: QuestionType;
  content: string;
  points: number;
  order: number;
  isRequired?: boolean;
  explanation?: string;
  imageUrl?: string;
  options?: { text: string; isCorrect: boolean; order: number }[];
}

export interface UpdateQuestionDto {
  type?: QuestionType;
  content?: string;
  points?: number;
  order?: number;
  isRequired?: boolean;
  explanation?: string;
  imageUrl?: string;
  options?: { text: string; isCorrect: boolean; order: number }[];
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  studentId: string;
  attemptNumber?: number;
  score?: number;
  totalPoints?: number;
  passed?: boolean;
  isSubmitted?: boolean;
  timeSpentSeconds?: number;
  startedAt?: string;
  submittedAt?: string;
  createdAt?: string;
  isReturned?: boolean;
  returnedAt?: string;
  teacherFeedback?: string;
}

export interface SubmitAssessmentDto {
  assessmentId: string;
  responses: {
    questionId: string;
    studentAnswer?: string;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
  }[];
  timeSpentSeconds: number;
}

export interface AttemptResult {
  attempt: AssessmentAttempt;
  score: number;
  passed: boolean;
  isReturned: boolean;
  attemptNumber: number;
  teacherFeedback: string;
  responses: {
    questionId: string;
    studentAnswer?: string;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
    isCorrect?: boolean;
    pointsEarned?: number;
    question?: AssessmentQuestion;
  }[];
}

export interface StartAttemptResult {
  attempt: AssessmentAttempt;
  timeLimitMinutes: number | null;
}

export interface AssessmentStats {
  totalAttempts: number;
  submittedAttempts?: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  averageTimeSeconds?: number;
  completionRate?: number;
  totalEnrolled?: number;
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'turned_in' | 'returned';

export interface StudentSubmission {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  status: SubmissionStatus;
  attempt?: AssessmentAttempt;
  totalAttempts?: number;
}

export interface SubmissionsResponse {
  assessment: {
    id: string;
    title: string;
    type: string;
    classRecordCategory?: string;
    quarter?: string;
    totalPoints: number;
    dueDate?: string;
    isPublished: boolean;
  };
  submissions: StudentSubmission[];
  summary: {
    total: number;
    notStarted: number;
    inProgress: number;
    turnedIn: number;
    returned: number;
  };
}

// Question analytics types
export interface OptionAnalytics {
  optionId: string;
  text: string;
  isCorrect: boolean;
  selectionCount: number;
  selectionPercent: number;
}

export interface QuestionAnalytics {
  questionId: string;
  content: string;
  type: string;
  points: number;
  totalResponses: number;
  correctCount: number;
  correctPercent: number;
  averagePoints: number;
  options: OptionAnalytics[];
  textAnswers: string[];
}

export interface QuestionAnalyticsResponse {
  totalResponses: number;
  questions: QuestionAnalytics[];
}

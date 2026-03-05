import type { AssessmentType, QuestionType, FeedbackLevel } from '@/utils/constants';

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
}

export interface UpdateAssessmentDto {
  title?: string;
  description?: string;
  type?: AssessmentType;
  dueDate?: string;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number | null;
  isPublished?: boolean;
  feedbackLevel?: FeedbackLevel;
  feedbackDelayHours?: number;
}

export interface CreateQuestionDto {
  assessmentId: string;
  type: QuestionType;
  content: string;
  points: number;
  order: number;
  isRequired?: boolean;
  explanation?: string;
  options?: { text: string; isCorrect: boolean; order: number }[];
}

export interface UpdateQuestionDto {
  type?: QuestionType;
  content?: string;
  points?: number;
  order?: number;
  isRequired?: boolean;
  explanation?: string;
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
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

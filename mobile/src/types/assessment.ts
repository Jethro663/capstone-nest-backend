export type AssessmentType =
  | 'quiz'
  | 'exam'
  | 'assignment'
  | 'written_work'
  | 'performance_task'
  | 'quarterly_assessment';

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'fill_blank'
  | 'dropdown';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
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
  questions?: AssessmentQuestion[];
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

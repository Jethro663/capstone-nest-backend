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
  closeWhenDue?: boolean;
  randomizeQuestions?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
  strictMode?: boolean;
  fileUploadInstructions?: string;
  teacherAttachmentFileId?: string | null;
  teacherAttachmentFile?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  } | null;
  allowedUploadMimeTypes?: string[];
  allowedUploadExtensions?: string[];
  maxUploadSizeBytes?: number;
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
  closeWhenDue?: boolean;
  randomizeQuestions?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
  strictMode?: boolean;
  fileUploadInstructions?: string;
  teacherAttachmentFileId?: string;
  allowedUploadMimeTypes?: string[];
  allowedUploadExtensions?: string[];
  maxUploadSizeBytes?: number;
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
  closeWhenDue?: boolean;
  randomizeQuestions?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
  strictMode?: boolean;
  fileUploadInstructions?: string;
  teacherAttachmentFileId?: string | null;
  allowedUploadMimeTypes?: string[];
  allowedUploadExtensions?: string[];
  maxUploadSizeBytes?: number;
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
  expiresAt?: string | null;
  lastQuestionIndex?: number;
  currentQuestionStartedAt?: string | null;
  currentQuestionDeadlineAt?: string | null;
  violationCount?: number;
  questionOrder?: string[] | null;
  draftResponses?: {
    questionId: string;
    studentAnswer?: string;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
  }[];
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isReturned?: boolean;
  returnedAt?: string;
  teacherFeedback?: string;
  submittedFileId?: string | null;
  submittedFileOriginalName?: string | null;
  submittedFileMimeType?: string | null;
  submittedFileSizeBytes?: number | null;
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
  submittedFile?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  } | null;
}

export interface StartAttemptResult {
  attempt: AssessmentAttempt;
  timeLimitMinutes: number | null;
  expiresAt?: string | null;
  strictMode?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
}

export interface OngoingAttemptResult {
  attempt: AssessmentAttempt;
  timeLimitMinutes: number | null;
  expiresAt?: string | null;
  strictMode?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
}

export interface OngoingAttemptSummary {
  id: string;
  assessmentId: string;
  assessmentTitle?: string;
  startedAt?: string;
  expiresAt?: string | null;
  lastQuestionIndex?: number;
  timeLimitMinutes?: number | null;
}

export interface UpdateAttemptProgressDto {
  currentQuestionIndex?: number;
  responses?: {
    questionId: string;
    questionIndex?: number;
    studentAnswer?: string;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
  }[];
  registerViolation?: boolean;
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

export interface StudentAttemptSummary {
  id: string;
  attemptNumber?: number;
  score?: number;
  passed?: boolean;
  isSubmitted?: boolean;
  isReturned?: boolean;
  submittedAt?: string;
  returnedAt?: string;
  teacherFeedback?: string;
  timeSpentSeconds?: number;
  isLate?: boolean;
  lateByMinutes?: number;
}

export interface StudentSubmission {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  status: SubmissionStatus;
  attempt?: StudentAttemptSummary | null;
  attempts?: StudentAttemptSummary[];
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
  totalAttempts?: number;
  uniqueSubmitterCount?: number;
  questions: QuestionAnalytics[];
}

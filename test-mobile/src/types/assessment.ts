export type AssessmentType =
  | "quiz"
  | "exam"
  | "assignment"
  | "written_work"
  | "performance_task"
  | "quarterly_assessment"
  | "file_upload";

export type QuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "short_answer"
  | "fill_blank"
  | "dropdown"
  | "essay";

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
  strictMode?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
  fileUploadInstructions?: string | null;
  allowedUploadMimeTypes?: string[] | null;
  allowedUploadExtensions?: string[] | null;
  maxUploadSizeBytes?: number | null;
  teacherAttachmentFileId?: string | null;
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
  updatedAt?: string;
  expiresAt?: string | null;
  lastQuestionIndex?: number;
  violationCount?: number;
  draftResponses?: SubmitAssessmentDto["responses"];
  submittedFileId?: string | null;
  submittedFileOriginalName?: string | null;
  submittedFileMimeType?: string | null;
  submittedFileSizeBytes?: number | null;
  submittedFile?: {
    id: string;
    originalName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    inlineUrl?: string | null;
    downloadUrl?: string | null;
  } | null;
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

export interface OngoingAttemptResult {
  attempt: AssessmentAttempt;
  timeLimitMinutes: number | null;
  expiresAt?: string | null;
  strictMode?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
}

export interface UpdateAttemptProgressDto {
  currentQuestionIndex?: number;
  responses?: SubmitAssessmentDto["responses"];
  registerViolation?: boolean;
}

export interface UploadedAssessmentFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  filePath?: string;
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

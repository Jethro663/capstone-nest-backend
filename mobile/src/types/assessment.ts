import type { AcademicCapabilities } from "./academic-grading";
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
  imageUrl?: string | null;
  imageDisplayMode?: "default" | "expanded";
  imageZoom?: number | null;
  imagePositionX?: number | null;
  imagePositionY?: number | null;
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
  imageUrl?: string | null;
  imageDisplayMode?: "default" | "expanded";
  imageZoom?: number | null;
  imagePositionX?: number | null;
  imagePositionY?: number | null;
  options?: QuestionOption[];
}

export interface AssessmentFileRecord {
  id: string;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string | null;
  inlineUrl?: string | null;
  downloadUrl?: string | null;
}

export interface Assessment {
  isCoreTemplateAsset?: boolean | null;
  academicCapabilities?: AcademicCapabilities;
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
  teacherAttachmentFile?: AssessmentFileRecord | null;
  dueDate?: string;
  isPublished: boolean;
  classRecordCategory?: string | null;
  quarter?: string | null;
  questions?: AssessmentQuestion[];
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
  allowedUploadMimeTypes?: string[];
  allowedUploadExtensions?: string[];
  maxUploadSizeBytes?: number;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number | null;
  classRecordCategory?: string | null;
  quarter?: "Q1" | "Q2" | "Q3" | "Q4" | null;
}

export interface UpdateAssessmentDto {
  title?: string;
  description?: string;
  type?: AssessmentType;
  dueDate?: string;
  closeWhenDue?: boolean;
  randomizeQuestions?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
  strictMode?: boolean;
  fileUploadInstructions?: string;
  allowedUploadMimeTypes?: string[];
  allowedUploadExtensions?: string[];
  maxUploadSizeBytes?: number;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number | null;
  isPublished?: boolean;
  classRecordCategory?: string | null;
  quarter?: "Q1" | "Q2" | "Q3" | "Q4" | null;
}

export interface QuestionOptionInput {
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface CreateQuestionDto {
  assessmentId: string;
  type: QuestionType;
  content: string;
  points: number;
  order: number;
  isRequired?: boolean;
  explanation?: string;
  options?: QuestionOptionInput[];
}

export interface UpdateQuestionDto {
  content?: string;
  points?: number;
  order?: number;
  isRequired?: boolean;
  explanation?: string;
  options?: QuestionOptionInput[];
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
  submittedFile?: AssessmentFileRecord | null;
  submittedFiles?: AssessmentFileRecord[] | null;
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

export interface UploadedAssessmentSubmission {
  attemptId: string;
  file: UploadedAssessmentFile;
  files?: UploadedAssessmentFile[];
}

export interface RemovedAssessmentSubmissionFiles {
  attemptId: string;
  files: UploadedAssessmentFile[];
}

export interface AttemptResult {
  attempt: AssessmentAttempt;
  score: number;
  passed: boolean;
  isReturned: boolean;
  attemptNumber: number;
  teacherFeedback: string;
  returnedAt?: string | null;
  directScore?: number | null;
  responses: {
    questionId: string;
    studentAnswer?: string;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
    isCorrect?: boolean;
    pointsEarned?: number;
    question?: AssessmentQuestion;
  }[];
  submittedFile?: AssessmentFileRecord | null;
  submittedFiles?: AssessmentFileRecord[] | null;
  assessment?: {
    id: string;
    title?: string;
    type?: string;
    totalPoints?: number;
    passingScore?: number;
  };
}

export interface TeacherAssessmentSubmission {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  status: "not_started" | "in_progress" | "turned_in" | "returned";
  latestAttemptId?: string | null;
  latestAttemptNumber?: number | null;
  latestAttemptScore?: number | null;
  latestAttemptSubmittedAt?: string | null;
  latestAttemptReturnedAt?: string | null;
  teacherFeedback?: string | null;
  directScore?: number | null;
  submittedFiles?: AssessmentFileRecord[] | null;
  submittedFile?: AssessmentFileRecord | null;
  timeline?: Array<{
    type: string;
    occurredAt: string;
    summary?: string | null;
  }> | null;
}

export interface TeacherAssessmentSubmissionSummary {
  total: number;
  notStarted: number;
  inProgress: number;
  turnedIn: number;
  returned: number;
}

export interface TeacherAssessmentSubmissionsResponse {
  submissions: TeacherAssessmentSubmission[];
  summary: TeacherAssessmentSubmissionSummary;
}

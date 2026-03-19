import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  IsEnum,
  IsArray,
  Min,
  ValidateNested,
  ArrayNotEmpty,
  IsDateString,
  ValidateIf,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  MULTIPLE_SELECT = 'multiple_select',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  FILL_BLANK = 'fill_blank',
  DROPDOWN = 'dropdown',
}

export enum AssessmentType {
  QUIZ = 'quiz',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
  FILE_UPLOAD = 'file_upload',
}

export enum FeedbackLevel {
  IMMEDIATE = 'immediate', // Score only, no answers
  STANDARD = 'standard', // Answers + explanations (delayed)
  DETAILED = 'detailed', // Full feedback with hints (delayed longer)
}

export enum ClassRecordCategory {
  WRITTEN_WORK = 'written_work',
  PERFORMANCE_TASK = 'performance_task',
  QUARTERLY_ASSESSMENT = 'quarterly_assessment',
}

export enum Quarter {
  Q1 = 'Q1',
  Q2 = 'Q2',
  Q3 = 'Q3',
  Q4 = 'Q4',
}

// ==========================================
// Assessment DTOs
// ==========================================

export class CreateAssessmentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType = AssessmentType.QUIZ;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  closeWhenDue?: boolean = true;

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean = false;

  @IsOptional()
  @IsBoolean()
  timedQuestionsEnabled?: boolean = false;

  @IsOptional()
  @ValidateIf((o) => o.questionTimeLimitSeconds !== null)
  @IsInt()
  @Min(5)
  questionTimeLimitSeconds?: number | null;

  @IsOptional()
  @IsBoolean()
  strictMode?: boolean = false;

  @IsOptional()
  @IsString()
  fileUploadInstructions?: string;

  @IsOptional()
  @IsUUID()
  teacherAttachmentFileId?: string;

  @IsOptional()
  @IsUUID()
  rubricSourceFileId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUploadMimeTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUploadExtensions?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(104857600)
  maxUploadSizeBytes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  passingScore?: number = 60;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number = 1;

  @IsOptional()
  @ValidateIf((o) => o.timeLimitMinutes !== null)
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsEnum(FeedbackLevel)
  feedbackLevel?: FeedbackLevel = FeedbackLevel.STANDARD;

  @IsOptional()
  @IsInt()
  feedbackDelayHours?: number = 24;

  @IsOptional()
  @IsEnum(ClassRecordCategory)
  classRecordCategory?: ClassRecordCategory;

  @IsOptional()
  @IsEnum(Quarter)
  quarter?: Quarter;
}

export class RubricCriterionDto {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  points: number;
}

export class UpdateAssessmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  closeWhenDue?: boolean;

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  timedQuestionsEnabled?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.questionTimeLimitSeconds !== null)
  @IsInt()
  @Min(5)
  questionTimeLimitSeconds?: number | null;

  @IsOptional()
  @IsBoolean()
  strictMode?: boolean;

  @IsOptional()
  @IsString()
  fileUploadInstructions?: string;

  @IsOptional()
  @ValidateIf((o) => o.teacherAttachmentFileId !== null)
  @IsUUID()
  teacherAttachmentFileId?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.rubricSourceFileId !== null)
  @IsUUID()
  rubricSourceFileId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  rubricCriteria?: RubricCriterionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUploadMimeTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUploadExtensions?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(104857600)
  maxUploadSizeBytes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @ValidateIf((o) => o.timeLimitMinutes !== null)
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsEnum(FeedbackLevel)
  feedbackLevel?: FeedbackLevel;

  @IsOptional()
  @IsInt()
  feedbackDelayHours?: number;

  @IsOptional()
  @IsEnum(ClassRecordCategory)
  classRecordCategory?: ClassRecordCategory;

  @IsOptional()
  @IsEnum(Quarter)
  quarter?: Quarter;
}

// ==========================================
// Question DTOs
// ==========================================

export class OptionDto {
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsInt()
  order: number;
}

export class CreateQuestionDto {
  @IsUUID()
  assessmentId: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  content: string;

  @IsInt()
  points: number = 1;

  @IsInt()
  order: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = true;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  points?: number;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
}

// ==========================================
// Assessment Attempt DTOs
// ==========================================

export class ResponseAnswerDto {
  @IsUUID()
  questionId: string;

  @IsOptional()
  @IsString()
  studentAnswer?: string; // For short answer/text questions

  @IsOptional()
  @IsUUID()
  selectedOptionId?: string; // For multiple choice/select

  @IsOptional()
  @IsArray()
  selectedOptionIds?: string[]; // For multiple select
}

export class ProgressResponseAnswerDto extends ResponseAnswerDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  questionIndex?: number;
}

export class SubmitAssessmentDto {
  @IsUUID()
  assessmentId: string;

  @IsArray()
  @Type(() => ResponseAnswerDto)
  responses: ResponseAnswerDto[];

  @IsInt()
  timeSpentSeconds: number;
}

export class StartAssessmentDto {
  @IsUUID()
  assessmentId: string;
}

export class UpdateAttemptProgressDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  currentQuestionIndex?: number;

  @IsOptional()
  @IsArray()
  @Type(() => ProgressResponseAnswerDto)
  responses?: ProgressResponseAnswerDto[];

  @IsOptional()
  @IsBoolean()
  registerViolation?: boolean;
}

// ==========================================
// Grade Return DTOs (MS Teams-like)
// ==========================================

export class ReturnedRubricScoreDto {
  @IsString()
  @MinLength(1)
  criterionId: string;

  @IsInt()
  @Min(0)
  pointsEarned: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ReturnGradeDto {
  @IsOptional()
  @IsString()
  teacherFeedback?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  directScore?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnedRubricScoreDto)
  rubricScores?: ReturnedRubricScoreDto[];
}

export class BulkReturnGradesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  attemptIds: string[];

  @IsOptional()
  @IsString()
  teacherFeedback?: string;
}

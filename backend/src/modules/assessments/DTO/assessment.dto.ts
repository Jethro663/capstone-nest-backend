import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsEnum, IsArray, Min, ValidateNested } from 'class-validator';
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
}

export enum FeedbackLevel {
  IMMEDIATE = 'immediate',       // Score only, no answers
  STANDARD = 'standard',         // Answers + explanations (delayed)
  DETAILED = 'detailed',         // Full feedback with hints (delayed longer)
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
  dueDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  passingScore?: number = 60;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @IsOptional()
  @IsEnum(FeedbackLevel)
  feedbackLevel?: FeedbackLevel = FeedbackLevel.STANDARD;

  @IsOptional()
  @IsInt()
  feedbackDelayHours?: number = 24;
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
  dueDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsEnum(FeedbackLevel)
  feedbackLevel?: FeedbackLevel;

  @IsOptional()
  @IsInt()
  feedbackDelayHours?: number;
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

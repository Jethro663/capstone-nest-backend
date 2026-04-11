import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { systemEvaluationTargetEnum } from '../../../drizzle/schema';

const systemTargets = systemEvaluationTargetEnum.enumValues;
export type SystemEvaluationTarget = (typeof systemTargets)[number];
const aiSessionTypes = ['mentor_chat', 'mistake_explanation', 'student_tutor'] as const;
export type AiSessionType = (typeof aiSessionTypes)[number];

export class LessonAssignmentDto {
  @IsUUID('4')
  lessonId: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  xpAwarded: number;
}

export class AssessmentAssignmentDto {
  @IsUUID('4')
  assessmentId: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  xpAwarded: number;
}

export class AssignInterventionDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  lessonIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assessmentIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonAssignmentDto)
  lessonAssignments?: LessonAssignmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentAssignmentDto)
  assessmentAssignments?: AssessmentAssignmentDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class ResolveInterventionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class AiEvaluationContextDto {
  @IsOptional()
  @IsIn(aiSessionTypes)
  sessionType?: AiSessionType;

  @IsOptional()
  @IsUUID('4')
  attemptId?: string;

  @IsOptional()
  @IsUUID('4')
  questionId?: string;

  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceFlow?: string;
}

export class SubmitSystemEvaluationDto {
  @IsIn(systemTargets)
  targetModule: SystemEvaluationTarget;

  @IsInt()
  @Min(1)
  @Max(5)
  usabilityScore: number;

  @IsInt()
  @Min(1)
  @Max(5)
  functionalityScore: number;

  @IsInt()
  @Min(1)
  @Max(5)
  performanceScore: number;

  @IsInt()
  @Min(1)
  @Max(5)
  satisfactionScore: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiEvaluationContextDto)
  aiContextMetadata?: AiEvaluationContextDto;
}

export class ListSystemEvaluationsQueryDto {
  @IsOptional()
  @IsIn(systemTargets)
  targetModule?: SystemEvaluationTarget;

  @IsOptional()
  @IsUUID('4')
  aiClassId?: string;

  @IsOptional()
  @IsIn(aiSessionTypes)
  aiSessionType?: AiSessionType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  aiSourceFlow?: string;
}

import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { systemEvaluationTargetEnum } from '../../../drizzle/schema';

const systemTargets = systemEvaluationTargetEnum.enumValues;
export type SystemEvaluationTarget = (typeof systemTargets)[number];

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
  feedback?: string;
}

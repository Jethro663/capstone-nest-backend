import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { systemEvaluationTargetEnum } from '../../../drizzle/schema';

const systemTargets = systemEvaluationTargetEnum.enumValues;
export type SystemEvaluationTarget = (typeof systemTargets)[number];

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

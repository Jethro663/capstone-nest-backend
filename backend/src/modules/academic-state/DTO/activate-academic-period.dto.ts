import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { PeriodKey } from '../academic-policy';

export class ActivateAcademicPeriodDto {
  @IsString()
  @Matches(/^\d{4}-\d{4}$/)
  expectedSchoolYear: string;
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) expectedQuarter: PeriodKey;
  @IsInt() @Min(1) expectedVersion: number;
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) targetQuarter: PeriodKey;
  @IsString() @MinLength(1) currentPassword: string;
  @IsUUID('4') requestId: string;
  @IsOptional() @IsBoolean() override?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

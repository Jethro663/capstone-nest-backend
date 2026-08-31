import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  ValidateNested,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class AssessmentPeriodMappingDto {
  @IsOptional() @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) Q1?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  @IsOptional() @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) Q2?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  @IsOptional() @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) Q3?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  @IsOptional() @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) Q4?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  @IsOptional() @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) unassigned?:
    | 'Q1'
    | 'Q2'
    | 'Q3'
    | 'Q4';
}

export class TransitionAcademicStateDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentPeriodMappingDto)
  assessmentPeriodMapping?: AssessmentPeriodMappingDto;
  @IsString()
  @Matches(/^\d{4}-\d{4}$/)
  expectedSchoolYear: string;

  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'])
  expectedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';

  @IsInt()
  @Min(1)
  expectedVersion: number;

  @IsString()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'schoolYear must be in YYYY-YYYY format',
  })
  schoolYear: string;

  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmationText: string;
}

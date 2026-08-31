import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';

export class AcademicRepairReasonDto {
  @IsString()
  @MinLength(5)
  reason: string;
}
export class ClassifyAcademicSubjectDto extends AcademicRepairReasonDto {
  @IsIn(['academic', 'practical'])
  profile: 'academic' | 'practical';
}
export class RepairAssessmentPeriodDto extends AcademicRepairReasonDto {
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'])
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}
export class RepairAcademicStateDto extends AcademicRepairReasonDto {
  @IsUUID()
  selectedStateId: string;
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  expectedStateIds: string[];
  @IsInt()
  @Min(1)
  expectedVersion: number;
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'])
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  @IsString()
  @MinLength(1)
  currentPassword: string;
}

export class AcademicExamMappingDto {
  @IsUUID() itemId: string;
  @IsIn(['ST1', 'ST2', 'TE']) component: 'ST1' | 'ST2' | 'TE';
}
export class RepairWorkbookPolicyDto extends AcademicRepairReasonDto {
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => AcademicExamMappingDto)
  examinations: AcademicExamMappingDto[];
}

export class RetireDuplicateClassDto extends AcademicRepairReasonDto {
  @IsUUID() canonicalClassId: string;
}

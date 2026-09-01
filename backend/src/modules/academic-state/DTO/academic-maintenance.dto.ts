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
  Matches,
  ValidateBy,
} from 'class-validator';

const IsConsecutiveSchoolYear = () =>
  ValidateBy({
    name: 'isConsecutiveSchoolYear',
    validator: {
      validate(value: unknown) {
        if (typeof value !== 'string') return false;
        const match = /^(\d{4})-(\d{4})$/.exec(value);
        return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
      },
      defaultMessage: () => 'school year must use consecutive YYYY-YYYY values',
    },
  });

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

export class PreviewAcademicStateAlignmentDto {
  @IsConsecutiveSchoolYear()
  sourceSchoolYear: string;

  @IsConsecutiveSchoolYear()
  targetSchoolYear: string;

  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'])
  targetQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';

  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  classIds: string[];
}

export class AcademicAlignmentConfirmationDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  text: string;
}

export class ExecuteAcademicStateAlignmentDto
  extends PreviewAcademicStateAlignmentDto
  implements AcademicRepairReasonDto
{
  @Matches(/^[a-f0-9]{64}$/)
  manifestHash: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AcademicAlignmentConfirmationDto)
  confirmations: AcademicAlignmentConfirmationDto[];

  @IsString()
  @MinLength(5)
  reason: string;

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

import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { PeriodKey } from '../academic-policy';

export class EvidenceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
export class ReferencedEvidenceDto extends EvidenceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  sourceReference: string;
}
export class ExternalPeriodGradeDto extends ReferencedEvidenceDto {
  @IsUUID('4') studentId: string;
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) period: PeriodKey;
  @IsInt() @Min(0) @Max(100) grade: number;
}
export class SelectAnnualSourceDto extends EvidenceDto {
  @IsUUID('4') studentId: string;
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) period: PeriodKey;
  @IsIn(['period_revision', 'external']) sourceType:
    | 'period_revision'
    | 'external';
  @IsUUID('4') sourceId: string;
}
export class RecordRemediationDto extends ReferencedEvidenceDto {
  @IsInt() @Min(0) @Max(100) remedialClassMark: number;
}
export class ScheduleBackSubjectDto extends EvidenceDto {
  @IsString() @Matches(/^\d{4}-\d{4}$/) schoolYear: string;
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) period: PeriodKey;
}
export class ClearBackSubjectDto extends ReferencedEvidenceDto {
  @IsInt() @Min(75) @Max(100) grade: number;
}

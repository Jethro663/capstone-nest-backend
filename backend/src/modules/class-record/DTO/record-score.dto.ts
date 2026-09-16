import {
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsIn,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CLASS_RECORD_SCORE_STATUSES,
  type ClassRecordScoreStatus,
} from '../../../common/contracts/class-record-score-status';

export class RecordScoreDto {
  @IsUUID('4', { message: 'studentId must be a valid UUID' })
  studentId: string;

  @ValidateIf((value: RecordScoreDto) => value.status !== 'excused')
  @Type(() => Number)
  @IsNumber({}, { message: 'score must be a number' })
  @Min(0, { message: 'score must be at least 0' })
  score?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'bonusPoints must be a number' })
  @Min(0, { message: 'bonusPoints must be at least 0' })
  bonusPoints?: number;

  @ValidateIf((value: RecordScoreDto) => (value.bonusPoints ?? 0) > 0)
  @IsString()
  @MaxLength(2000)
  bonusReason?: string;

  @IsOptional()
  @IsIn(CLASS_RECORD_SCORE_STATUSES)
  status?: ClassRecordScoreStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

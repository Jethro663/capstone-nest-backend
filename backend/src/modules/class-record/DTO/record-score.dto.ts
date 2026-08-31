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

export class RecordScoreDto {
  @IsUUID('4', { message: 'studentId must be a valid UUID' })
  studentId: string;

  @ValidateIf((value: RecordScoreDto) => value.status !== 'excused')
  @Type(() => Number)
  @IsNumber({}, { message: 'score must be a number' })
  @Min(0, { message: 'score must be at least 0' })
  score?: number | null;

  @IsOptional()
  @IsIn(['recorded', 'excused'])
  status?: 'recorded' | 'excused';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

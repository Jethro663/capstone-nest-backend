import { IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordScoreDto {
  @IsUUID('4', { message: 'studentId must be a valid UUID' })
  studentId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'score must be a number' })
  @Min(0, { message: 'score must be at least 0' })
  score: number;
}

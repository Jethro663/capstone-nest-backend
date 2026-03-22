import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateClassRecordItemDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'maxScore must be a number' })
  @Min(0, { message: 'maxScore must be at least 0' })
  maxScore: number;
}

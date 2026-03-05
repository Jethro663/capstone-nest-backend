import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordScoreDto } from './record-score.dto';

export class BulkRecordScoresDto {
  @IsArray({ message: 'scores must be an array' })
  @ArrayMinSize(1, { message: 'scores must contain at least one entry' })
  @ValidateNested({ each: true })
  @Type(() => RecordScoreDto)
  scores: RecordScoreDto[];
}

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryPerformanceLogsDto {
  @IsOptional()
  @IsUUID('4', { message: 'studentId must be a valid UUID' })
  studentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(200, { message: 'limit cannot exceed 200' })
  limit?: number = 50;
}

import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePerformanceAnalysisJobDto {
  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}


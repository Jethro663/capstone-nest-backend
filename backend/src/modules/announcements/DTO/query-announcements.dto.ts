import { IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAnnouncementsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class QueryTeacherAnnouncementsDto extends QueryAnnouncementsDto {
  @ApiPropertyOptional({
    description: 'Limit the feed to one class owned by the teacher',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;
}

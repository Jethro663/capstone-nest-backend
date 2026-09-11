import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsString,
  MaxLength,
  IsIn,
} from 'class-validator';
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

export class QueryAdminAnnouncementsDto extends QueryAnnouncementsDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ['all', 'pinned', 'scheduled', 'published'] })
  @IsOptional()
  @IsIn(['all', 'pinned', 'scheduled', 'published'])
  state?: 'all' | 'pinned' | 'scheduled' | 'published';
}

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsISO8601,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Reminder: Project due tomorrow' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: '<p>Please submit your projects by 11:59 PM.</p>' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'ISO 8601 future date to schedule the announcement',
    example: '2026-03-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'UUIDs of uploaded files to attach',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];
}

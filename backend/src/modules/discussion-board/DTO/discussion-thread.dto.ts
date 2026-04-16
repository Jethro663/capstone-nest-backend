import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const DISCUSSION_THEME_IDS = [
  'classic',
  'sunrise',
  'ocean',
  'forest',
  'graphite',
] as const;

export type DiscussionThemeId = (typeof DISCUSSION_THEME_IDS)[number];

export class DiscussionLinkAttachmentDto {
  @ApiProperty({
    example: 'https://example.com/reference',
    description: 'External link attachment URL',
  })
  @IsUrl({ require_protocol: true })
  url: string;

  @ApiPropertyOptional({
    example: 'Reference material',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label?: string;
}

export class CreateDiscussionThreadDto {
  @ApiProperty({ example: 'Week 2 Open Forum' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: '<p>Share your insights and questions for this week.</p>',
  })
  @IsString()
  @MinLength(1)
  bodyHtml: string;

  @ApiPropertyOptional({ enum: DISCUSSION_THEME_IDS, default: 'classic' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  themeId?: DiscussionThemeId;

  @ApiPropertyOptional({
    description: 'Maximum active comments per student for this thread.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  commentLimitPerStudent?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'Uploaded file IDs for image/pdf thread attachments.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  fileAttachmentIds?: string[];

  @ApiPropertyOptional({
    type: [DiscussionLinkAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DiscussionLinkAttachmentDto)
  linkAttachments?: DiscussionLinkAttachmentDto[];
}

export class UpdateDiscussionThreadDto {
  @ApiPropertyOptional({ example: 'Updated Thread Title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: '<p>Updated thread body</p>' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  bodyHtml?: string;

  @ApiPropertyOptional({ enum: DISCUSSION_THEME_IDS })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  themeId?: DiscussionThemeId;

  @ApiPropertyOptional({
    description: 'Maximum active comments per student for this thread.',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  commentLimitPerStudent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'Replace existing file attachments with this file list.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  fileAttachmentIds?: string[];

  @ApiPropertyOptional({
    description: 'Replace existing link attachments with this list.',
    type: [DiscussionLinkAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DiscussionLinkAttachmentDto)
  linkAttachments?: DiscussionLinkAttachmentDto[];
}

export class QueryDiscussionThreadsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

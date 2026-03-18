import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  IsNotEmpty,
  IsIn,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const CONTENT_BLOCK_TYPES = [
  'text',
  'image',
  'video',
  'question',
  'file',
  'divider',
] as const;
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

/** Used for nested validation in ReorderBlocksDto */
export class BlockOrderItem {
  @IsUUID()
  id: string;

  @IsInt()
  order: number;
}

export class LessonOrderItem {
  @IsUUID()
  id: string;

  @IsInt()
  order: number;
}

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

export class CreateContentBlockDto {
  /** Injected from the URL param by the controller — optional in body */
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsString()
  @IsIn(CONTENT_BLOCK_TYPES)
  type: ContentBlockType;

  @IsInt()
  order: number;

  /** Must be present — matches the NOT NULL constraint in the schema */
  @IsNotEmpty()
  content: any;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateContentBlockDto {
  @IsOptional()
  @IsString()
  @IsIn(CONTENT_BLOCK_TYPES)
  type?: ContentBlockType;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReorderBlocksDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BlockOrderItem)
  blocks: BlockOrderItem[];
}

export class ReorderLessonsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LessonOrderItem)
  lessons: LessonOrderItem[];
}

export class BulkLessonIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  lessonIds: string[];
}

export class BulkLessonDraftStateDto extends BulkLessonIdsDto {
  @IsBoolean()
  isDraft: boolean;
}

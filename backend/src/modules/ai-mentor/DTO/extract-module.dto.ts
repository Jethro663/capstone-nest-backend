import {
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for triggering module extraction on an already-uploaded PDF.
 *
 * The `fileId` must reference an existing row in `uploaded_files`.
 */
export class ExtractModuleDto {
  @ApiProperty({
    description: 'UUID of the uploaded PDF file (from uploaded_files table)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  fileId: string;
}

/**
 * DTO for applying an extraction — optionally selecting specific lessons.
 */
export class ApplyExtractionDto {
  @ApiPropertyOptional({
    description:
      'Array of lesson indices (0-based) to apply. If omitted, all lessons are applied.',
    example: [0, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  lessonIndices?: number[];
}

/**
 * Block within a lesson for the UpdateExtractionDto.
 */
export class ExtractionBlockDto {
  @ApiProperty({ description: 'Block type', example: 'text' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Display order', example: 0 })
  @IsNumber()
  order: number;

  @ApiProperty({ description: 'Block content object' })
  @IsObject()
  content: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Block metadata object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * A single lesson in the extraction content.
 */
export class ExtractionLessonDto {
  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Lesson description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Content blocks for this lesson',
    type: [ExtractionBlockDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionBlockDto)
  blocks: ExtractionBlockDto[];
}

/**
 * DTO for updating the structured content of a completed extraction.
 * Used when the teacher edits extracted content before applying.
 */
export class UpdateExtractionDto {
  @ApiPropertyOptional({ description: 'Module title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Module description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of lessons with blocks',
    type: [ExtractionLessonDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionLessonDto)
  lessons: ExtractionLessonDto[];
}

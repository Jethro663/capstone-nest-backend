import {
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsString,
  ValidateNested,
  IsObject,
  IsBoolean,
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
      'Array of section indices (0-based) to apply. If omitted, all sections are applied.',
    example: [0, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  sectionIndices?: number[];

  @ApiPropertyOptional({
    description:
      'Legacy alias of sectionIndices for backward compatibility.',
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

  @ApiProperty({
    description: 'Block content object or plain string',
    oneOf: [{ type: 'object' }, { type: 'string' }],
  })
  content: Record<string, unknown> | string;

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

export class ExtractionAssessmentOptionDto {
  @ApiProperty({ description: 'Option text' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Whether this option is correct' })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class ExtractionAssessmentQuestionDto {
  @ApiProperty({ description: 'Question content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Question type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Points' })
  @IsOptional()
  @IsNumber()
  points?: number;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: 'Explanation' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Optional image URL (supports data URL)' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Optional concept tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conceptTags?: string[];

  @ApiPropertyOptional({
    description: 'Options',
    type: [ExtractionAssessmentOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionAssessmentOptionDto)
  options?: ExtractionAssessmentOptionDto[];
}

export class ExtractionAssessmentDraftDto {
  @ApiPropertyOptional({ description: 'Draft assessment title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Draft assessment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Assessment type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Passing score' })
  @IsOptional()
  @IsNumber()
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Feedback level' })
  @IsOptional()
  @IsString()
  feedbackLevel?: string;

  @ApiPropertyOptional({
    description: 'Draft questions',
    type: [ExtractionAssessmentQuestionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionAssessmentQuestionDto)
  questions?: ExtractionAssessmentQuestionDto[];
}

export class ExtractionSectionDto {
  @ApiProperty({ description: 'Section title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Section description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({
    description: 'Lesson blocks for this section',
    type: [ExtractionBlockDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionBlockDto)
  lessonBlocks: ExtractionBlockDto[];

  @ApiPropertyOptional({
    description: 'Optional draft assessment for this section',
    type: ExtractionAssessmentDraftDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExtractionAssessmentDraftDto)
  assessmentDraft?: ExtractionAssessmentDraftDto;

  @ApiPropertyOptional({ description: 'Section confidence score' })
  @IsOptional()
  @IsNumber()
  confidence?: number;
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

  @ApiPropertyOptional({
    description: 'Section-based extraction payload (canonical)',
    type: [ExtractionSectionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionSectionDto)
  sections?: ExtractionSectionDto[];

  @ApiPropertyOptional({
    description: 'Legacy lessons payload alias (accepted for compatibility)',
    type: [ExtractionLessonDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionLessonDto)
  lessons?: ExtractionLessonDto[];
}

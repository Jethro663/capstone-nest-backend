import {
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsInt,
  IsIn,
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

  @ApiProperty({
    description:
      'Teacher-selected target section count for structured extraction.',
    example: 4,
    enum: [3, 4, 5],
  })
  @IsInt()
  @IsIn([3, 4, 5])
  targetSectionCount: 3 | 4 | 5;

  @ApiPropertyOptional({
    description: 'Extraction output style.',
    enum: ['faithful', 'clean', 'student_friendly'],
    default: 'clean',
  })
  @IsOptional()
  @IsString()
  @IsIn(['faithful', 'clean', 'student_friendly'])
  extractionStyle?: 'faithful' | 'clean' | 'student_friendly';
}

export class RetryExtractionDto {
  @ApiPropertyOptional({
    description: 'Optional target section count override for retry.',
    enum: [3, 4, 5],
  })
  @IsOptional()
  @IsInt()
  @IsIn([3, 4, 5])
  targetSectionCount?: 3 | 4 | 5;

  @ApiPropertyOptional({
    description: 'Optional extraction style override for retry.',
    enum: ['faithful', 'clean', 'student_friendly'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['faithful', 'clean', 'student_friendly'])
  extractionStyle?: 'faithful' | 'clean' | 'student_friendly';
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
    description: 'Legacy alias of sectionIndices for backward compatibility.',
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

  @ApiPropertyOptional({
    description: 'Optional image URL (supports data URL)',
  })
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

export class ExtractionMediaCandidateDto {
  @ApiProperty({ description: 'Candidate section index', example: 0 })
  @IsNumber()
  sectionIndex: number;

  @ApiProperty({ description: 'Assignment score', example: 0.88 })
  @IsNumber()
  score: number;

  @ApiPropertyOptional({
    description: 'Whether the candidate was an explicit citation match',
  })
  @IsOptional()
  @IsBoolean()
  explicitMatch?: boolean;

  @ApiPropertyOptional({ description: 'Assignment score breakdown object' })
  @IsOptional()
  @IsObject()
  scoreBreakdown?: Record<string, number>;
}

export class ExtractionMediaAssetDto {
  @ApiProperty({ description: 'Stable media asset id' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Media URL or data URL' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  pageNumber?: number;

  @ApiPropertyOptional({ description: 'Caption text' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: 'Anchor text found near the image' })
  @IsOptional()
  @IsString()
  anchorText?: string;

  @ApiPropertyOptional({ description: 'Image keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Figure references', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  figureReferences?: string[];

  @ApiPropertyOptional({ description: 'Selected section index for this image' })
  @IsOptional()
  @IsNumber()
  selectedSectionIndex?: number | null;

  @ApiPropertyOptional({ description: 'Assignment confidence score' })
  @IsOptional()
  @IsNumber()
  assignmentConfidence?: number;

  @ApiPropertyOptional({ description: 'Assignment score breakdown object' })
  @IsOptional()
  @IsObject()
  assignmentBreakdown?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Candidate section scores',
    type: [ExtractionMediaCandidateDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionMediaCandidateDto)
  candidateSections?: ExtractionMediaCandidateDto[];

  @ApiPropertyOptional({
    description: 'Whether a teacher has reviewed this image placement',
  })
  @IsOptional()
  @IsBoolean()
  teacherReviewed?: boolean;

  @ApiPropertyOptional({ description: 'Review state label' })
  @IsOptional()
  @IsString()
  reviewState?: string;
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

  @ApiPropertyOptional({ description: 'Graph keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  graphKeywords?: string[];

  @ApiPropertyOptional({ description: 'Figure references', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  figureReferences?: string[];
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
    description:
      'Teacher review issue state from the extraction review workspace',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  reviewIssues?: Record<string, unknown>[];

  @ApiPropertyOptional({
    description: 'Teacher review state after local issue resolution',
  })
  @IsOptional()
  @IsString()
  reviewState?: string;

  @ApiPropertyOptional({
    description: 'Legacy lessons payload alias (accepted for compatibility)',
    type: [ExtractionLessonDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionLessonDto)
  lessons?: ExtractionLessonDto[];

  @ApiPropertyOptional({
    description: 'Extracted image assets and teacher review state',
    type: [ExtractionMediaAssetDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionMediaAssetDto)
  mediaAssets?: ExtractionMediaAssetDto[];
}

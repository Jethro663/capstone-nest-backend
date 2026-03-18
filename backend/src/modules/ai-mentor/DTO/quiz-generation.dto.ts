import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssessmentType,
  ClassRecordCategory,
  FeedbackLevel,
  Quarter,
  QuestionType,
} from '../../assessments/DTO/assessment.dto';

export class GenerateQuizDraftDto {
  @ApiProperty({
    description: 'Class where the assessment draft will be created',
    example: '7c6b6047-f8ef-483b-8d51-c4bac7ed13d2',
  })
  @IsUUID()
  classId: string;

  @ApiPropertyOptional({
    description: 'Limit generation to specific lessons',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  lessonIds?: string[];

  @ApiPropertyOptional({
    description: 'Optionally include a reviewed extraction as source material',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  extractionIds?: string[];

  @ApiPropertyOptional({
    description: 'Title for the generated draft assessment',
    example: 'Fractions Diagnostic Quiz',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'How many questions to generate',
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  questionCount?: number = 5;

  @ApiPropertyOptional({
    description: 'Default question type to bias generation toward',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType = QuestionType.MULTIPLE_CHOICE;

  @ApiPropertyOptional({
    description: 'Assessment type to create',
    enum: AssessmentType,
    default: AssessmentType.QUIZ,
  })
  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType = AssessmentType.QUIZ;

  @ApiPropertyOptional({
    description: 'Passing score for the draft assessment',
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passingScore?: number = 60;

  @ApiPropertyOptional({
    description: 'Optional teacher instruction to guide generation',
    example: 'Prioritize conceptual understanding and avoid purely memorization-based items.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  teacherNote?: string;

  @ApiPropertyOptional({
    enum: FeedbackLevel,
    default: FeedbackLevel.STANDARD,
  })
  @IsOptional()
  @IsEnum(FeedbackLevel)
  feedbackLevel?: FeedbackLevel = FeedbackLevel.STANDARD;

  @ApiPropertyOptional({ enum: ClassRecordCategory })
  @IsOptional()
  @IsEnum(ClassRecordCategory)
  classRecordCategory?: ClassRecordCategory;

  @ApiPropertyOptional({ enum: Quarter })
  @IsOptional()
  @IsEnum(Quarter)
  quarter?: Quarter;
}

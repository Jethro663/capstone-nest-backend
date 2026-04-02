import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class JaPracticeRecommendationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  focusText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lessonId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assessmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  questionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceChunkId?: string | null;
}

export class JaPracticeBootstrapQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class JaHubQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class CreateJaPracticeSessionDto {
  @ApiProperty()
  @IsUUID()
  classId: string;

  @ApiPropertyOptional({ type: JaPracticeRecommendationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JaPracticeRecommendationDto)
  recommendation?: JaPracticeRecommendationDto;
}

export class SubmitJaPracticeResponseDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsObject()
  answer: Record<string, unknown>;
}

export class LogJaPracticeEventDto {
  @ApiProperty({
    enum: [
      'focus_lost',
      'focus_restored',
      'focus_strike',
      'resumed',
      'completed',
      'deleted',
    ],
  })
  @IsString()
  @IsIn([
    'focus_lost',
    'focus_restored',
    'focus_strike',
    'resumed',
    'completed',
    'deleted',
  ])
  eventType:
    | 'focus_lost'
    | 'focus_restored'
    | 'focus_strike'
    | 'resumed'
    | 'completed'
    | 'deleted';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class CompleteJaPracticeSessionDto {
  @ApiPropertyOptional({
    description: 'Reserved for replay summary metadata.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class JaAskBootstrapQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class CreateJaAskThreadDto {
  @ApiProperty()
  @IsUUID()
  classId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;
}

export class SendJaAskMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quickAction?: string;
}

export class JaReviewBootstrapQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class CreateJaReviewSessionDto {
  @ApiProperty()
  @IsUUID()
  classId: string;

  @ApiProperty()
  @IsUUID()
  attemptId: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(20)
  questionCount?: number = 10;
}

export class JaReviewEventDto extends LogJaPracticeEventDto {}

export class JaReviewSubmitResponseDto extends SubmitJaPracticeResponseDto {}

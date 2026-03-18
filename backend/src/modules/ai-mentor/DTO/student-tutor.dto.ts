import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ImageAttachmentDto } from './image-attachment.dto';

export class TutorRecommendationPayloadDto {
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

export class StudentTutorStartDto {
  @ApiProperty()
  @IsUUID()
  classId: string;

  @ApiProperty({ type: TutorRecommendationPayloadDto })
  @ValidateNested()
  @Type(() => TutorRecommendationPayloadDto)
  recommendation: TutorRecommendationPayloadDto;
}

export class StudentTutorMessageDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ type: [ImageAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAttachmentDto)
  attachments?: ImageAttachmentDto[];
}

export class StudentTutorAnswersDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  answers: string[];

  @ApiPropertyOptional({ type: [ImageAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAttachmentDto)
  attachments?: ImageAttachmentDto[];
}

export class StudentTutorBootstrapQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;
}

import {
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

export class MentorExplainDto {
  @ApiProperty({
    description: 'Assessment attempt to explain',
    example: '0d8703f0-8249-4b14-9df9-94db137e0fd1',
  })
  @IsUUID()
  attemptId: string;

  @ApiProperty({
    description: 'Specific question to explain',
    example: '4af90fe7-7e0a-4d5c-8bd1-9ea38b9aab6e',
  })
  @IsUUID()
  questionId: string;

  @ApiPropertyOptional({
    description: 'Optional follow-up prompt from the student',
    example: 'Can you explain why my answer is wrong without giving me the answer directly?',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({
    description: 'Optional image attachments for image-based explanations',
    type: [ImageAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAttachmentDto)
  attachments?: ImageAttachmentDto[];
}

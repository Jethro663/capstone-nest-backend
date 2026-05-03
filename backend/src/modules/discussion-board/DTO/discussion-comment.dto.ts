import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDiscussionCommentDto {
  @ApiPropertyOptional({
    example: '<p>I agree with this explanation.</p>',
    description: 'Optional comment body in rich text HTML.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  bodyHtml?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Uploaded image file IDs for comment attachments.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsUUID('4', { each: true })
  attachmentFileIds?: string[];
}

export class SetDiscussionReactionDto {
  @ApiPropertyOptional({
    enum: ['like', 'heart', 'wow'],
    example: 'heart',
  })
  @IsString()
  @IsIn(['like', 'heart', 'wow'])
  reactionType: 'like' | 'heart' | 'wow';
}

export class ReportDiscussionCommentDto {
  @ApiPropertyOptional({
    enum: [
      'inappropriate',
      'spam',
      'off_topic',
      'harassment',
      'academic_dishonesty',
    ],
    example: 'inappropriate',
  })
  @IsString()
  @IsIn([
    'inappropriate',
    'spam',
    'off_topic',
    'harassment',
    'academic_dishonesty',
  ])
  reasonCode:
    | 'inappropriate'
    | 'spam'
    | 'off_topic'
    | 'harassment'
    | 'academic_dishonesty';

  @ApiPropertyOptional({
    example: 'Contains personal attacks toward another learner.',
    description: 'Optional moderator notes for audit trail follow-up.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

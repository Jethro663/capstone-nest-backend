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

import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ImageAttachmentDto } from './image-attachment.dto';

/**
 * DTO for the JAKIPIR AI Mentor chat endpoint.
 *
 * Send a `message` to start a new conversation.
 * Include `sessionId` (returned from a previous response) to continue
 * a multi-turn conversation — Ja will remember what was said before.
 */
export class ChatRequestDto {
  @ApiProperty({
    description: 'The message to send to Ja (JAKIPIR AI Mentor)',
    example: 'Hi Ja, can you help me understand fractions?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Message must be 2000 characters or fewer' })
  message: string;

  @ApiPropertyOptional({
    description:
      'Session ID from a previous chat response. Omit to start a new conversation.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Optional image attachments for multimodal chat',
    type: [ImageAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAttachmentDto)
  attachments?: ImageAttachmentDto[];
}

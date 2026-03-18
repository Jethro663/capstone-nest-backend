import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBase64, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImageAttachmentDto {
  @ApiPropertyOptional({
    description: 'Absolute or server-local file path for an image attachment',
    example: 'C:\\uploads\\question-images\\diagram.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  filePath?: string;

  @ApiPropertyOptional({
    description: 'Base64-encoded image content',
  })
  @IsOptional()
  @IsBase64()
  base64Data?: string;

  @ApiPropertyOptional({
    description: 'Image MIME type',
    example: 'image/png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;
}

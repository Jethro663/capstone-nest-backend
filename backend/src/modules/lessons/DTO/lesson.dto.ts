import { IsString, IsUUID, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

export class CreateContentBlockDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsString()
  type: 'text' | 'image' | 'video' | 'question' | 'file' | 'divider';

  @IsNumber()
  order: number;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateContentBlockDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ReorderBlocksDto {
  @IsObject()
  blocks: Array<{ id: string; order: number }>;
}

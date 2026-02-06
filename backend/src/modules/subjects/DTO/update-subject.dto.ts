import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSubjectDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Subject name must be at least 2 characters' })
  @MaxLength(100, { message: 'Subject name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Subject code must be at least 2 characters' })
  @MaxLength(20, { message: 'Subject code must not exceed 20 characters' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, {
    message: 'Description must not exceed 500 characters',
  })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  gradeLevel?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

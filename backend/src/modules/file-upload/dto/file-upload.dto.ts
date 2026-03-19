import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FileScopeDto {
  Private = 'private',
  General = 'general',
}

export class UploadFileDto {
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  @IsOptional()
  classId?: string;

  @IsUUID('4', { message: 'folderId must be a valid UUID' })
  @IsOptional()
  folderId?: string;

  @IsEnum(FileScopeDto, { message: 'scope must be private or general' })
  @IsOptional()
  scope?: FileScopeDto;
}

export class FileQueryDto {
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  @IsOptional()
  classId?: string;

  @IsUUID('4', { message: 'folderId must be a valid UUID' })
  @IsOptional()
  folderId?: string;

  @IsUUID('4', { message: 'ownerId must be a valid UUID' })
  @IsOptional()
  ownerId?: string;

  @IsEnum(FileScopeDto, { message: 'scope must be private or general' })
  @IsOptional()
  scope?: FileScopeDto;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateLibraryFolderDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  @IsOptional()
  parentId?: string;

  @IsEnum(FileScopeDto, { message: 'scope must be private or general' })
  @IsOptional()
  scope?: FileScopeDto;
}

export class UpdateLibraryFolderDto {
  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  @IsOptional()
  parentId?: string | null;

  @IsEnum(FileScopeDto, { message: 'scope must be private or general' })
  @IsOptional()
  scope?: FileScopeDto;
}

export class UpdateFileMetadataDto {
  @IsString()
  @Length(1, 255)
  @IsOptional()
  originalName?: string;

  @IsUUID('4', { message: 'folderId must be a valid UUID' })
  @IsOptional()
  folderId?: string | null;

  @IsUUID('4', { message: 'classId must be a valid UUID' })
  @IsOptional()
  classId?: string | null;

  @IsEnum(FileScopeDto, { message: 'scope must be private or general' })
  @IsOptional()
  scope?: FileScopeDto;
}

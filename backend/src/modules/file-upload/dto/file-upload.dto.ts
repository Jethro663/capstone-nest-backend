import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum FileScopeDto {
  Private = 'private',
  General = 'general',
}

export enum GradeLevelDto {
  Grade7 = '7',
  Grade8 = '8',
  Grade9 = '9',
  Grade10 = '10',
}

export enum LibrarySubjectKeyDto {
  Math = 'math',
  Science = 'science',
  English = 'english',
  Filipino = 'filipino',
  AralingPanlipunan = 'ap',
  Tle = 'tle',
  Mapeh = 'mapeh',
  Esp = 'esp',
}

export enum LibraryIndexStatusDto {
  NotIndexed = 'not_indexed',
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum LibraryFileKindDto {
  Pdf = 'pdf',
  Txt = 'txt',
  Pptx = 'pptx',
  Document = 'document',
  Image = 'image',
  File = 'file',
}

function toBoolean(value: unknown) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
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

  @IsEnum(LibrarySubjectKeyDto, {
    message:
      'subjectKey must be one of math, science, english, filipino, ap, tle, mapeh, esp',
  })
  @IsOptional()
  subjectKey?: LibrarySubjectKeyDto;

  @IsEnum(GradeLevelDto, {
    message: 'gradeLevel must be one of 7, 8, 9, 10',
  })
  @IsOptional()
  gradeLevel?: GradeLevelDto;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  teacherVisible?: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  aiEnabled?: boolean;
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

  @IsEnum(LibrarySubjectKeyDto, {
    message:
      'subjectKey must be one of math, science, english, filipino, ap, tle, mapeh, esp',
  })
  @IsOptional()
  subjectKey?: LibrarySubjectKeyDto;

  @IsEnum(GradeLevelDto, {
    message: 'gradeLevel must be one of 7, 8, 9, 10',
  })
  @IsOptional()
  gradeLevel?: GradeLevelDto;

  @IsEnum(LibraryIndexStatusDto)
  @IsOptional()
  indexStatus?: LibraryIndexStatusDto;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  teacherVisible?: boolean;

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

  @IsEnum(LibrarySubjectKeyDto, {
    message:
      'subjectKey must be one of math, science, english, filipino, ap, tle, mapeh, esp',
  })
  @IsOptional()
  subjectKey?: LibrarySubjectKeyDto;

  @IsEnum(GradeLevelDto, {
    message: 'gradeLevel must be one of 7, 8, 9, 10',
  })
  @IsOptional()
  gradeLevel?: GradeLevelDto;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  aiEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  teacherVisible?: boolean;
}

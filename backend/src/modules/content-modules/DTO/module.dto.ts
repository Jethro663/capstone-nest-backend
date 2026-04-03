import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ModuleItemType {
  Lesson = 'lesson',
  Assessment = 'assessment',
  File = 'file',
}

export enum ModuleThemeKind {
  Gradient = 'gradient',
  Image = 'image',
}

export class ReorderEntryDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(1)
  order: number;
}

export class CreateModuleDto {
  @IsUUID()
  classId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  teacherNotes?: string;

  @IsOptional()
  @IsEnum(ModuleThemeKind)
  themeKind?: ModuleThemeKind;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  gradientId?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  imagePositionX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  imagePositionY?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(220)
  imageScale?: number;
}

export class ReorderModulesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReorderEntryDto)
  modules: ReorderEntryDto[];
}

export class CreateModuleSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

export class UpdateModuleSectionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ReorderModuleSectionsDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ReorderEntryDto)
  sections: ReorderEntryDto[];
}

export class AttachModuleItemDto {
  @IsEnum(ModuleItemType)
  itemType: ModuleItemType;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  assessmentId?: string;

  @IsOptional()
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isGiven?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  points?: number;
}

export class UpdateModuleItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isGiven?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  points?: number;
}

export class ReorderModuleItemsDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ReorderEntryDto)
  items: ReorderEntryDto[];
}

export class ModuleGradingScaleEntryDto {
  @IsString()
  @IsNotEmpty()
  letter: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsInt()
  @Min(0)
  @Max(100)
  minScore: number;

  @IsInt()
  @Min(0)
  @Max(100)
  maxScore: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

export class ReplaceModuleGradingScaleDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ModuleGradingScaleEntryDto)
  entries: ModuleGradingScaleEntryDto[];
}

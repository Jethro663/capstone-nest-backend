import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const GRADE_LEVELS = ['7', '8', '9', '10'] as const;

export enum ClassTemplateStatus {
  Draft = 'draft',
  Published = 'published',
}

export enum ClassTemplateItemType {
  Assessment = 'assessment',
  Lesson = 'lesson',
  File = 'file',
}

export class CreateClassTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  subjectCode: string;

  @IsString()
  @IsIn([...GRADE_LEVELS])
  subjectGradeLevel: string;
}

export class UpdateClassTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name?: string;
}

export class TemplateQuestionOptionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class TemplateQuestionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  type: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateQuestionOptionDto)
  options?: TemplateQuestionOptionDto[];
}

export class TemplateAssessmentSettingsDto {
  @IsOptional()
  @IsInt()
  dueDateOffsetDays?: number;

  @IsOptional()
  @IsInt()
  maxAttempts?: number;

  @IsOptional()
  @IsInt()
  passingScore?: number;

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  closeWhenDue?: boolean;
}

export class ClassTemplateAssessmentDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateAssessmentSettingsDto)
  settings?: TemplateAssessmentSettingsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateQuestionDto)
  questions?: TemplateQuestionDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  totalPoints?: number;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class ClassTemplateModuleItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(ClassTemplateItemType)
  itemType: ClassTemplateItemType;

  @IsOptional()
  @IsUUID()
  templateAssessmentId?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;
}

export class ClassTemplateModuleSectionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTemplateModuleItemDto)
  items?: ClassTemplateModuleItemDto[];
}

export class ClassTemplateModuleDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsString()
  themeKind?: string;

  @IsOptional()
  @IsString()
  gradientId?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsInt()
  imagePositionX?: number;

  @IsOptional()
  @IsInt()
  imagePositionY?: number;

  @IsOptional()
  @IsInt()
  imageScale?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTemplateModuleSectionDto)
  sections?: ClassTemplateModuleSectionDto[];
}

export class ClassTemplateAnnouncementDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateClassTemplateContentDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTemplateModuleDto)
  modules?: ClassTemplateModuleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTemplateAssessmentDto)
  assessments?: ClassTemplateAssessmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTemplateAnnouncementDto)
  announcements?: ClassTemplateAnnouncementDto[];
}

export class PublishClassTemplateDto {
  @IsOptional()
  @IsEnum(ClassTemplateStatus)
  status?: ClassTemplateStatus;
}

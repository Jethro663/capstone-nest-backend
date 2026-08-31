import { OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsDefined,
  MaxLength,
  MinLength,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CreateQuestionDto,
  OptionDto,
  UpdateAssessmentDto,
} from './assessment.dto';

export class EditorAssessmentSettingsDto extends OmitType(UpdateAssessmentDto, [
  'isPublished',
] as const) {
  @IsOptional() @IsInt() @Min(1) @Max(100) declare passingScore?: number;
  @IsOptional() @IsInt() @Min(0) @Max(8760) declare feedbackDelayHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) declare maxAttempts?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1440) declare timeLimitMinutes?: number;
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(3600)
  declare questionTimeLimitSeconds?: number;
}

export class EditorOptionDto extends OptionDto {
  @IsOptional() @IsUUID() id?: string;
  @IsInt() @Min(0) @Max(100000) declare order: number;
  @IsOptional() @IsIn(['default', 'expanded']) declare imageDisplayMode?:
    | 'default'
    | 'expanded';
}

export class EditorQuestionDto extends OmitType(CreateQuestionDto, [
  'assessmentId',
  'options',
] as const) {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MinLength(1) @MaxLength(100) clientId: string;
  @IsInt() @Min(1) @Max(100000) declare points: number;
  @IsInt() @Min(0) declare order: number;
  @IsOptional() @IsIn(['default', 'expanded']) declare imageDisplayMode?:
    | 'default'
    | 'expanded';
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => EditorOptionDto)
  options?: EditorOptionDto[];
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  deletedOptionIds?: string[];
}

export class SaveAssessmentEditorDto {
  @IsUUID() mutationId: string;
  @IsOptional() @IsUUID() classId?: string;
  @IsOptional() @IsInt() @Min(0) expectedRevision?: number;
  @IsIn(['save', 'publish', 'unpublish']) action:
    | 'save'
    | 'publish'
    | 'unpublish';
  @IsDefined()
  @ValidateNested()
  @Type(() => EditorAssessmentSettingsDto)
  settings: EditorAssessmentSettingsDto;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => EditorQuestionDto)
  questions?: EditorQuestionDto[];
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  deletedQuestionIds?: string[];
}

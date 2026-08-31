import { BadRequestException } from '@nestjs/common';
import { OmitType } from '@nestjs/swagger';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsOptional,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { EditorAssessmentSettingsDto } from '../assessments/DTO/assessment-editor.dto';
import {
  AssessmentType,
  FeedbackLevel,
} from '../assessments/DTO/assessment.dto';

export class AiAssessmentSettingsDto extends OmitType(
  EditorAssessmentSettingsDto,
  [
    'fileUploadInstructions',
    'teacherAttachmentFileId',
    'rubricSourceFileId',
    'rubricCriteria',
    'allowedUploadMimeTypes',
    'allowedUploadExtensions',
    'maxUploadSizeBytes',
  ] as const,
) {
  @IsOptional()
  @IsIn(['quiz', 'exam', 'assignment'])
  declare type?: AssessmentType;
}

export class UpdateAiAssessmentSettingsDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => AiAssessmentSettingsDto)
  assessmentSettings: AiAssessmentSettingsDto;
}

export function normalizeAiAssessmentSettings(
  input: Record<string, unknown>,
): AiAssessmentSettingsDto {
  const nested =
    input.assessmentSettings && typeof input.assessmentSettings === 'object'
      ? (input.assessmentSettings as Record<string, unknown>)
      : {};
  const legacy: Record<string, unknown> = {};
  for (const [source, target] of Object.entries({
    title: 'title',
    assessmentType: 'type',
    passingScore: 'passingScore',
    feedbackLevel: 'feedbackLevel',
    classRecordCategory: 'classRecordCategory',
    quarter: 'quarter',
  })) {
    if (input[source] === undefined || input[source] === null) continue;
    if (
      nested[target] !== undefined &&
      JSON.stringify(input[source]) !== JSON.stringify(nested[target])
    )
      throw new BadRequestException(
        `Conflicting ${target} values in assessmentSettings and legacy fields`,
      );
    legacy[target] = input[source];
  }
  const settings = plainToInstance(AiAssessmentSettingsDto, {
    title: 'AI Draft Assessment',
    description: '',
    type: AssessmentType.QUIZ,
    passingScore: 60,
    feedbackLevel: FeedbackLevel.STANDARD,
    feedbackDelayHours: 24,
    maxAttempts: 1,
    timeLimitMinutes: null,
    closeWhenDue: true,
    randomizeQuestions: false,
    timedQuestionsEnabled: false,
    questionTimeLimitSeconds: null,
    strictMode: false,
    ...legacy,
    ...nested,
  });
  const errors = validateSync(settings, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length)
    throw new BadRequestException({
      message: 'Invalid assessment settings',
      errors: errors.flatMap((error) => Object.values(error.constraints ?? {})),
    });
  return settings;
}

import {
  IsString,
  IsUUID,
  IsOptional,
  Validate,
  IsIn,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  MinLength,
  Matches,
  IsDefined,
  IsInt,
  Min,
  Max,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  type ValidationArguments,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsValidSchoolYearConstraint } from './validators';
import { GRADE_LEVELS } from '../../../common/utils/grade-level.util';
import { ScheduleSlotDto } from './schedule-slot.dto';
import {
  ROOM_LABEL_REGEX,
  SUBJECT_CODE_REGEX,
  SUBJECT_NAME_REGEX,
  trimValue,
  upperTrimmedValue,
} from '../../../common/validation/input-policy';

@ValidatorConstraint({ name: 'gradingProfileSum', async: false })
class GradingProfileSumConstraint implements ValidatorConstraintInterface {
  validate(
    value: unknown,
    _args: ValidationArguments,
  ): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const profile = value as {
      writtenWork?: unknown;
      performanceTask?: unknown;
      quarterlyAssessment?: unknown;
    };
    if (
      typeof profile.writtenWork !== 'number' ||
      typeof profile.performanceTask !== 'number' ||
      typeof profile.quarterlyAssessment !== 'number'
    ) {
      return false;
    }

    return (
      profile.writtenWork +
        profile.performanceTask +
        profile.quarterlyAssessment ===
      100
    );
  }

  defaultMessage(): string {
    return 'gradingProfile must sum to exactly 100';
  }
}

export class ClassGradingProfileDto {
  @IsDefined({ message: 'writtenWork is required' })
  @IsInt({ message: 'writtenWork must be a whole number' })
  @Min(1, { message: 'writtenWork must be greater than 0' })
  @Max(99, { message: 'writtenWork must be 99 or less' })
  @Type(() => Number)
  writtenWork: number;

  @IsDefined({ message: 'performanceTask is required' })
  @IsInt({ message: 'performanceTask must be a whole number' })
  @Min(1, { message: 'performanceTask must be greater than 0' })
  @Max(99, { message: 'performanceTask must be 99 or less' })
  @Type(() => Number)
  performanceTask: number;

  @IsDefined({ message: 'quarterlyAssessment is required' })
  @IsInt({ message: 'quarterlyAssessment must be a whole number' })
  @Min(1, { message: 'quarterlyAssessment must be greater than 0' })
  @Max(99, { message: 'quarterlyAssessment must be 99 or less' })
  @Type(() => Number)
  quarterlyAssessment: number;
}

export class CreateClassDto {
  @IsString({ message: 'subjectName must be a string' })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  @Matches(SUBJECT_NAME_REGEX, {
    message:
      "subjectName may only contain letters, numbers, spaces, hyphens, and apostrophes",
  })
  subjectName: string;

  @IsString({ message: 'subjectCode must be a string' })
  @Transform(({ value }: { value?: string }) => upperTrimmedValue(value))
  @Matches(SUBJECT_CODE_REGEX, {
    message: 'subjectCode may only contain uppercase letters, numbers, and hyphens',
  })
  subjectCode: string;

  @IsOptional()
  @IsIn([...GRADE_LEVELS], {
    message: 'subjectGradeLevel must be 7, 8, 9 or 10',
  })
  subjectGradeLevel?: string;

  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  sectionId: string;

  @IsUUID('4', { message: 'teacherId must be a valid UUID' })
  teacherId: string;

  @IsOptional()
  @IsUUID('4', { message: 'templateId must be a valid UUID' })
  templateId?: string;

  @IsString({ message: 'schoolYear must be a string' })
  @Validate(IsValidSchoolYearConstraint)
  schoolYear: string;

  @IsArray({ message: 'schedules must be an array of schedule slots' })
  @ArrayMinSize(1, { message: 'At least one schedule slot is required' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedules: ScheduleSlotDto[];

  @IsString({ message: 'room must be a string' })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  @MinLength(1, { message: 'room is required' })
  @Matches(ROOM_LABEL_REGEX, {
    message:
      'room may only contain letters, numbers, spaces, number signs, hyphens, and slashes',
  })
  room: string;

  @IsOptional()
  @IsString({ message: 'cardPreset must be a string' })
  cardPreset?: string;

  @IsOptional()
  @IsString({ message: 'cardBannerUrl must be a string' })
  cardBannerUrl?: string;

  @IsOptional()
  @Validate(GradingProfileSumConstraint, {
    message: 'gradingProfile must sum to exactly 100',
  })
  @ValidateNested()
  @Type(() => ClassGradingProfileDto)
  gradingProfile?: ClassGradingProfileDto;
}

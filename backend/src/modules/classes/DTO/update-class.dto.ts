import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  Validate,
  IsIn,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsValidSchoolYearConstraint } from './validators';
import { GRADE_LEVELS } from '../../../common/utils/grade-level.util';
import { ScheduleSlotDto } from './schedule-slot.dto';
import {
  SUBJECT_CODE_REGEX,
  SUBJECT_NAME_REGEX,
  trimValue,
  upperTrimmedValue,
} from '../../../common/validation/input-policy';
import {
  ALLOWED_ROOM_NUMBERS,
  ALLOWED_ROOM_NUMBERS_MESSAGE,
} from '../../../common/constants/room-options';

export class UpdateClassDto {
  @IsOptional()
  @IsString({ message: 'subjectName must be a string' })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  @Matches(SUBJECT_NAME_REGEX, {
    message:
      'subjectName may only contain letters, numbers, spaces, hyphens, and apostrophes',
  })
  subjectName?: string;

  @IsOptional()
  @IsString({ message: 'subjectCode must be a string' })
  @Transform(({ value }: { value?: string }) => upperTrimmedValue(value))
  @Matches(SUBJECT_CODE_REGEX, {
    message:
      'subjectCode may only contain uppercase letters, numbers, and hyphens',
  })
  subjectCode?: string;

  @IsOptional()
  @IsIn([...GRADE_LEVELS], {
    message: 'subjectGradeLevel must be 7, 8, 9 or 10',
  })
  subjectGradeLevel?: string;

  @IsOptional()
  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  sectionId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'teacherId must be a valid UUID' })
  teacherId?: string;

  @IsOptional()
  @IsString({ message: 'schoolYear must be a string' })
  @Validate(IsValidSchoolYearConstraint)
  schoolYear?: string;

  /**
   * Full replacement of schedule slots. Omit to leave existing slots unchanged.
   * Pass an empty array `[]` to clear all slots.
   */
  @IsOptional()
  @IsArray({ message: 'schedules must be an array of schedule slots' })
  @ArrayMinSize(1, { message: 'At least one schedule slot is required' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedules?: ScheduleSlotDto[];

  @IsOptional()
  @IsString({ message: 'room must be a string' })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  @MinLength(1, { message: 'room cannot be empty' })
  @IsIn([...ALLOWED_ROOM_NUMBERS], {
    message: ALLOWED_ROOM_NUMBERS_MESSAGE,
  })
  room?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'cardPreset must be a string' })
  cardPreset?: string;

  @IsOptional()
  @IsString({ message: 'cardBannerUrl must be a string' })
  cardBannerUrl?: string | null;
}

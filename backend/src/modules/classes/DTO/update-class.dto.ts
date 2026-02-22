import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  Validate,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidSchoolYearConstraint } from './validators';
import { GRADE_LEVELS } from '../../../common/utils/grade-level.util';
import { ScheduleSlotDto } from './schedule-slot.dto';

export class UpdateClassDto {
  @IsOptional()
  @IsString({ message: 'subjectName must be a string' })
  subjectName?: string;

  @IsOptional()
  @IsString({ message: 'subjectCode must be a string' })
  subjectCode?: string;

  @IsOptional()
  @IsIn([...GRADE_LEVELS], { message: 'subjectGradeLevel must be 7, 8, 9 or 10' })
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
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedules?: ScheduleSlotDto[];

  @IsOptional()
  @IsString({ message: 'room must be a string' })
  room?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}

import {
  IsString,
  IsUUID,
  IsOptional,
  Validate,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidSchoolYearConstraint } from './validators';
import { GRADE_LEVELS } from '../../../common/utils/grade-level.util';
import { ScheduleSlotDto } from './schedule-slot.dto';

export class CreateClassDto {
  @IsString({ message: 'subjectName must be a string' })
  subjectName: string;

  @IsString({ message: 'subjectCode must be a string' })
  subjectCode: string;

  @IsOptional()
  @IsIn([...GRADE_LEVELS], { message: 'subjectGradeLevel must be 7, 8, 9 or 10' })
  subjectGradeLevel?: string;

  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  sectionId: string;

  @IsUUID('4', { message: 'teacherId must be a valid UUID' })
  teacherId: string;

  @IsString({ message: 'schoolYear must be a string' })
  @Validate(IsValidSchoolYearConstraint)
  schoolYear: string;

  /**
   * Optional array of time-slots.
   * Each slot: { days: ['M','W','F'], startTime: '10:00', endTime: '11:00' }
   * A class can have multiple slots (e.g. lecture + lab).
   */
  @IsOptional()
  @IsArray({ message: 'schedules must be an array of schedule slots' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedules?: ScheduleSlotDto[];

  @IsOptional()
  @IsString({ message: 'room must be a string' })
  room?: string;
}

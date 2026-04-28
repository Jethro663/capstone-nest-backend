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
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsValidSchoolYearConstraint } from './validators';
import { GRADE_LEVELS } from '../../../common/utils/grade-level.util';
import { ScheduleSlotDto } from './schedule-slot.dto';

export class CreateClassDto {
  @IsString({ message: 'subjectName must be a string' })
  subjectName: string;

  @IsString({ message: 'subjectCode must be a string' })
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
  @Transform(({ value }: { value?: string }) => value?.trim())
  @MinLength(1, { message: 'room is required' })
  room: string;

  @IsOptional()
  @IsString({ message: 'cardPreset must be a string' })
  cardPreset?: string;

  @IsOptional()
  @IsString({ message: 'cardBannerUrl must be a string' })
  cardBannerUrl?: string;
}

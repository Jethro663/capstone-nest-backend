import {
  IsString,
  IsUUID,
  IsOptional,
  Validate,
} from 'class-validator';
import {
  IsValidSchoolYearConstraint,
  IsValidScheduleConstraint,
} from './validators';

export class CreateClassDto {
  @IsUUID('4', { message: 'subjectId must be a valid UUID' })
  subjectId: string;

  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  sectionId: string;

  @IsUUID('4', { message: 'teacherId must be a valid UUID' })
  teacherId: string;

  @IsString({ message: 'schoolYear must be a string' })
  @Validate(IsValidSchoolYearConstraint)
  schoolYear: string;

  @IsOptional()
  @IsString({ message: 'schedule must be a string' })
  @Validate(IsValidScheduleConstraint)
  schedule?: string;

  @IsOptional()
  @IsString({ message: 'room must be a string' })
  room?: string;
}

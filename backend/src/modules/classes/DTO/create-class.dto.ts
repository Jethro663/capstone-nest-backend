import {
  IsString,
  IsUUID,
  IsOptional,
  Validate,
  IsIn,
} from 'class-validator';
import {
  IsValidSchoolYearConstraint,
  IsValidScheduleConstraint,
} from './validators';

export class CreateClassDto {
  @IsString({ message: 'subjectName must be a string' })
  subjectName: string;

  @IsString({ message: 'subjectCode must be a string' })
  subjectCode: string;

  @IsOptional()
  @IsIn(['7','8','9','10'], { message: 'subjectGradeLevel must be 7,8,9 or 10' })
  subjectGradeLevel?: string;

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

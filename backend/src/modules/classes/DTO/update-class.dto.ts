import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  Validate,
} from 'class-validator';
import {
  IsValidSchoolYearConstraint,
  IsValidScheduleConstraint,
} from './validators';

export class UpdateClassDto {
  @IsOptional()
  @IsUUID('4', { message: 'subjectId must be a valid UUID' })
  subjectId?: string;

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

  @IsOptional()
  @IsString({ message: 'schedule must be a string' })
  @Validate(IsValidScheduleConstraint)
  schedule?: string;

  @IsOptional()
  @IsString({ message: 'room must be a string' })
  room?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}

import { IsOptional, IsString, IsUUID, Matches, IsIn } from 'class-validator';

const SCHOOL_YEAR_PATTERN = /^\d{4}-\d{4}$/;

export class AccessStudentsOverviewQueryDto {
  @IsOptional()
  @IsString()
  @Matches(SCHOOL_YEAR_PATTERN, {
    message: 'schoolYear must be in YYYY-YYYY format',
  })
  schoolYear?: string;

  @IsOptional()
  @IsString()
  @IsIn(['7', '8', '9', '10'], {
    message: 'gradeLevel must be one of: 7, 8, 9, 10',
  })
  gradeLevel?: string;

  @IsOptional()
  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  sectionId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

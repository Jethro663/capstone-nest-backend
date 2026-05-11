import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const SCHOOL_YEAR_PATTERN = /^\d{4}-\d{4}$/;

export class AccessStudentsTargetSectionsQueryDto {
  @IsUUID('4', { message: 'fromSectionId must be a valid UUID' })
  fromSectionId: string;

  @IsString()
  @IsIn(['promote', 'retain'], {
    message: 'mode must be either promote or retain',
  })
  mode: 'promote' | 'retain';

  @IsOptional()
  @IsString()
  @Matches(SCHOOL_YEAR_PATTERN, {
    message: 'schoolYear must be in YYYY-YYYY format',
  })
  schoolYear?: string;
}

import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsUUID,
  IsIn,
  Validate,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsValidSchoolYearConstraint } from '../../classes/DTO/validators';

const VALID_GRADE_LEVELS = ['7', '8', '9', '10'] as const;

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Section name must be at least 1 character' })
  @MaxLength(100, { message: 'Section name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(VALID_GRADE_LEVELS, {
    message: 'gradeLevel must be one of: 7, 8, 9, 10',
  })
  @Transform(({ value }) => value?.trim())
  gradeLevel?: string;

  @IsString()
  @IsOptional()
  @Validate(IsValidSchoolYearConstraint)
  @Transform(({ value }) => value?.trim())
  schoolYear?: string;

  @IsInt({ message: 'Capacity must be an integer' })
  @IsOptional()
  @Min(1, { message: 'Capacity must be at least 1' })
  capacity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Room number must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  roomNumber?: string;

  /** Pass a valid UUID to assign an adviser, or explicitly pass null to clear the current adviser. */
  @IsOptional()
  @ValidateIf((o) => o.adviserId !== null)
  @IsUUID('4', { message: 'Adviser ID must be a valid UUID' })
  adviserId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

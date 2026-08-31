import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class TransitionAcademicStateDto {
  @IsString()
  @Matches(/^\d{4}-\d{4}$/)
  expectedSchoolYear: string;

  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'])
  expectedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';

  @IsInt()
  @Min(1)
  expectedVersion: number;

  @IsString()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'schoolYear must be in YYYY-YYYY format',
  })
  schoolYear: string;

  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmationText: string;
}

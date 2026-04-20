import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class TransitionAcademicStateDto {
  @IsString()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'schoolYear must be in YYYY-YYYY format',
  })
  schoolYear: string;

  @IsString()
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'], {
    message: 'quarter must be Q1, Q2, Q3, or Q4',
  })
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';

  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmationText: string;
}

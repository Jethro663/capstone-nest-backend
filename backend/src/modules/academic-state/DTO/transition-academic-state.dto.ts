import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class TransitionAcademicStateDto {
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

import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateTeacherProfileDto {
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:\+63|0)9\d{9}$/, {
    message:
      'Contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  contactNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{1,20}$/, {
    message:
      'Employee ID must be 1-20 characters using letters, numbers, or hyphens',
  })
  employeeId?: string;
}

import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsIn,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  @Matches(/[@$!%*?&#]/, {
    message: 'Password must contain at least one special character',
  })
  password?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  middleName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsIn(['student', 'teacher', 'admin'], {
    message: 'Role must be student, teacher, or admin',
  })
  role?: string;

  @IsOptional()
  @IsString({ message: 'LRN must be a string' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @Matches(/^[0-9]{12}$/, {
    message: 'LRN must be exactly 12 digits (e.g., 202401230001)',
  })
  lrn?: string;

  // Profile fields
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dob?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsIn(['Father', 'Mother', 'Guardian', 'Sibling', 'Other'], {
    message:
      'Relationship must be one of: Father, Mother, Guardian, Sibling, Other',
  })
  familyRelationship?: string;

  @IsOptional()
  @IsString()
  familyContact?: string;

  @IsOptional()
  @IsIn(['7','8','9','10'], {
    message: 'Grade level must be one of: 7, 8, 9, 10',
  })
  gradeLevel?: '7' | '8' | '9' | '10';

  @IsOptional()
  @IsString()
  profilePicture?: string;
}

import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsIn,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ADDRESS_REGEX,
  EMPLOYEE_ID_REGEX,
  lowerTrimmedValue,
  PASSWORD_SAFE_REGEX,
  PERSON_NAME_REGEX,
  PH_MOBILE_REGEX,
  trimValue,
  upperTrimmedValue,
} from '../../../common/validation/input-policy';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: string }) => lowerTrimmedValue(value))
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
  @Matches(PASSWORD_SAFE_REGEX, {
    message: 'Password contains unsupported control characters',
  })
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(PERSON_NAME_REGEX, {
    message:
      "First name may only contain letters, spaces, hyphens, and apostrophes",
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(PERSON_NAME_REGEX, {
    message:
      "Middle name may only contain letters, spaces, hyphens, and apostrophes",
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(PERSON_NAME_REGEX, {
    message:
      "Last name may only contain letters, spaces, hyphens, and apostrophes",
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsIn(['student', 'teacher', 'admin'], {
    message: 'Role must be student, teacher, or admin',
  })
  role?: string;

  @IsOptional()
  @IsString({ message: 'Employee ID must be a string' })
  @Transform(({ value }: { value?: string }) => upperTrimmedValue(value))
  @Matches(EMPLOYEE_ID_REGEX, {
    message:
      'Employee ID must be 1-20 characters using letters, numbers, or hyphens',
  })
  employeeId?: string;

  @IsOptional()
  @IsString({ message: 'Contact number must be a string' })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  @Matches(PH_MOBILE_REGEX, {
    message:
      'Contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  contactNumber?: string;

  @IsOptional()
  @IsString({ message: 'LRN must be a string' })
  @Transform(({ value }: { value: string }) => trimValue(value))
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
  @IsIn(['Male', 'Female'], {
    message: 'Gender must be either Male or Female',
  })
  gender?: 'Male' | 'Female';

  @IsOptional()
  @IsString()
  @Matches(PH_MOBILE_REGEX, {
    message:
      'Student contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(ADDRESS_REGEX, {
    message:
      'Address may only contain letters, numbers, spaces, commas, periods, number signs, apostrophes, hyphens, and slashes',
  })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(PERSON_NAME_REGEX, {
    message:
      "Guardian name may only contain letters, spaces, hyphens, and apostrophes",
  })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  familyName?: string;

  @IsOptional()
  @IsIn(['Father', 'Mother', 'Guardian', 'Sibling', 'Other'], {
    message:
      'Relationship must be one of: Father, Mother, Guardian, Sibling, Other',
  })
  familyRelationship?: string;

  @IsOptional()
  @IsString()
  @Matches(PH_MOBILE_REGEX, {
    message:
      'Guardian contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  familyContact?: string;

  @IsOptional()
  @IsIn(['7', '8', '9', '10'], {
    message: 'Grade level must be one of: 7, 8, 9, 10',
  })
  gradeLevel?: '7' | '8' | '9' | '10';

  @IsOptional()
  @IsString()
  profilePicture?: string;
}

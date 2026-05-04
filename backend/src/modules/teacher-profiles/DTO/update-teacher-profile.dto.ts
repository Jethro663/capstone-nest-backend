import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  ADDRESS_REGEX,
  EMPLOYEE_ID_REGEX,
  LABEL_TEXT_REGEX,
  PH_MOBILE_REGEX,
  trimValue,
  upperTrimmedValue,
} from '../../../common/validation/input-policy';

export class UpdateTeacherProfileDto {
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dateOfBirth?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dob?: string;

  @IsOptional()
  @IsIn(['Male', 'Female'], {
    message: 'Gender must be either Male or Female',
  })
  gender?: 'Male' | 'Female';

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
  @Matches(LABEL_TEXT_REGEX, {
    message:
      'Department may only contain letters, numbers, spaces, periods, apostrophes, hyphens, and slashes',
  })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(LABEL_TEXT_REGEX, {
    message:
      'Specialization may only contain letters, numbers, spaces, periods, apostrophes, hyphens, and slashes',
  })
  @Transform(({ value }: { value?: string }) => trimValue(value))
  specialization?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => value?.trim())
  profilePicture?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => trimValue(value))
  @Matches(PH_MOBILE_REGEX, {
    message:
      'Contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  contactNumber?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => trimValue(value))
  @Matches(PH_MOBILE_REGEX, {
    message:
      'Phone number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => upperTrimmedValue(value))
  @Matches(EMPLOYEE_ID_REGEX, {
    message:
      'Employee ID must be 1-20 characters using letters, numbers, or hyphens',
  })
  employeeId?: string;
}

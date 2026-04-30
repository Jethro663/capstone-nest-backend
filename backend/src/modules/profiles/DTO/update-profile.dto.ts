import {
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ADDRESS_REGEX,
  PERSON_NAME_REGEX,
  PH_MOBILE_REGEX,
  trimValue,
} from '../../../common/validation/input-policy';

export class UpdateProfileDto {
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
  @Transform(({ value }: { value: string }) => trimValue(value))
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
  @IsString()
  @Matches(/^[0-9]{12}$/, {
    message: 'LRN must be exactly 12 digits (e.g., 202401230001)',
  })
  lrn?: string;

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

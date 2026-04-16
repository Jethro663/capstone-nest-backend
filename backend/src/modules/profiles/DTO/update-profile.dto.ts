import {
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const PH_MOBILE_REGEX = /^(?:\+63|0)9\d{9}$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }: { value: string }) => value?.trim())
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
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
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
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

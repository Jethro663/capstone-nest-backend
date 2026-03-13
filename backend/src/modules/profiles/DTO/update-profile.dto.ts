import {
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
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
  @IsIn(['7', '8', '9', '10'], {
    message: 'Grade level must be one of: 7, 8, 9, 10',
  })
  gradeLevel?: '7' | '8' | '9' | '10';

  @IsOptional()
  @IsString()
  profilePicture?: string;
}

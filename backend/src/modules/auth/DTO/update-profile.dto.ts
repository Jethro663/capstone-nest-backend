import {
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const PH_MOBILE_REGEX = /^(?:\+63|0)9\d{9}$/;

export class UpdateProfileDto {
  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @ApiProperty({ example: 'Santos', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }: { value: string }) => value?.trim())
  middleName?: string;

  @ApiProperty({ example: 'Dela Cruz', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;

  @ApiProperty({ example: '2005-08-15', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dob?: string;

  @ApiProperty({ example: '2005-08-15', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dateOfBirth?: string;

  @ApiProperty({ example: 'Male', required: false })
  @IsOptional()
  @IsIn(['Male', 'Female'], {
    message: 'Gender must be either Male or Female',
  })
  gender?: 'Male' | 'Female';

  @ApiProperty({ example: '202401230001', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{12}$/, {
    message: 'LRN must be exactly 12 digits (e.g., 202401230001)',
  })
  lrn?: string;

  @ApiProperty({ example: '+639171234567', required: false })
  @IsOptional()
  @IsString()
  @Matches(PH_MOBILE_REGEX, {
    message:
      'Student contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  phone?: string;

  @ApiProperty({ example: '123 Main St, Manila', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  address?: string;

  @ApiProperty({ example: 'Dela Cruz', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  familyName?: string;

  @ApiProperty({
    example: 'Father',
    enum: ['Father', 'Mother', 'Guardian', 'Sibling', 'Other'],
    required: false,
  })
  @IsOptional()
  @IsIn(['Father', 'Mother', 'Guardian', 'Sibling', 'Other'], {
    message:
      'Relationship must be one of: Father, Mother, Guardian, Sibling, Other',
  })
  familyRelationship?: string;

  @ApiProperty({ example: '+639179876543', required: false })
  @IsOptional()
  @IsString()
  @Matches(PH_MOBILE_REGEX, {
    message:
      'Guardian contact number must be a valid PH mobile format (e.g., 09171234567 or +639171234567)',
  })
  familyContact?: string;

  @ApiProperty({
    example: '/api/profiles/images/student-avatar.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  profilePicture?: string;
}

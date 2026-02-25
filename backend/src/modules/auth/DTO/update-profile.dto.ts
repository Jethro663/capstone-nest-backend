import { IsOptional, IsString, IsDateString, IsIn, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @ApiProperty({ example: 'Santos', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  middleName?: string;

  @ApiProperty({ example: 'Dela Cruz', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;

  @ApiProperty({ example: '2005-08-15', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dob?: string;

  @ApiProperty({ example: 'Male', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

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
  phone?: string;

  @ApiProperty({ example: '123 Main St, Manila', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Dela Cruz', required: false })
  @IsOptional()
  @IsString()
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
  familyContact?: string;
}

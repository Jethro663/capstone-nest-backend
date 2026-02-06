import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Section name must be at least 1 character' })
  @MaxLength(100, { message: 'Section name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  gradeLevel?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  schoolYear?: string;

  @IsInt({ message: 'Capacity must be an integer' })
  @IsOptional()
  @Min(1, { message: 'Capacity must be at least 1' })
  capacity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Room number must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  roomNumber?: string;

  @IsUUID('4', { message: 'Adviser ID must be a valid UUID' })
  @IsOptional()
  adviserId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

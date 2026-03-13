import { IsOptional, IsString } from 'class-validator';

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
  contactNumber?: string;
}

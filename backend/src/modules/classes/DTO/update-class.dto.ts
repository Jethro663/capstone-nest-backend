import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

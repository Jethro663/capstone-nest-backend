import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateClassDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  sectionId: string;

  @IsUUID()
  teacherId: string;

  @IsString()
  schoolYear: string;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsString()
  room?: string;
}

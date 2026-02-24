import { IsUUID, IsOptional } from 'class-validator';

export class UploadFileDto {
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  classId: string;
}

export class FileQueryDto {
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  @IsOptional()
  classId?: string;
}

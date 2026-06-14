import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class FinalizeAccessStudentGradesDto {
  @IsUUID('4', { message: 'sectionId must be a valid UUID' })
  sectionId: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({
    message: 'studentIds must contain at least one student when provided',
  })
  @IsUUID('4', { each: true, message: 'Each studentId must be a valid UUID' })
  studentIds?: string[];
}

import { IsUUID } from 'class-validator';

export class EnrollStudentDto {
  @IsUUID('4', { message: 'studentId must be a valid UUID' })
  studentId: string;
}

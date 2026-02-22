import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkStudentsDto {
  @IsArray({ message: 'studentIds must be an array' })
  @ArrayMinSize(1, { message: 'At least one student ID is required' })
  @ArrayMaxSize(50, { message: 'Cannot add more than 50 students at once' })
  @IsUUID('4', { each: true, message: 'Each student ID must be a valid UUID' })
  studentIds: string[];
}

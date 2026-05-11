import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class FailStudentsDto {
  @IsUUID('4', { message: 'fromSectionId must be a valid UUID' })
  fromSectionId: string;

  @IsUUID('4', { message: 'targetSectionId must be a valid UUID' })
  targetSectionId: string;

  @IsArray({ message: 'studentIds must be an array' })
  @ArrayMinSize(1, { message: 'At least one student ID is required' })
  @ArrayMaxSize(200, { message: 'Cannot process more than 200 students at once' })
  @ArrayUnique({ message: 'studentIds must not contain duplicates' })
  @IsUUID('4', { each: true, message: 'Each student ID must be a valid UUID' })
  studentIds: string[];
}

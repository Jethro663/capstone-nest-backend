import { IsUUID, IsIn } from 'class-validator';

export class CreateClassRecordDto {
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  classId: string;

  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'], {
    message: 'gradingPeriod must be Q1, Q2, Q3, or Q4',
  })
  gradingPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

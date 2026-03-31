import { IsIn, IsString } from 'class-validator';

export const STUDENT_PRESENTATION_MODES = [
  'solid',
  'gradient',
  'preset',
] as const;

export type StudentPresentationMode =
  (typeof STUDENT_PRESENTATION_MODES)[number];

export class UpdateStudentClassPresentationDto {
  @IsIn(STUDENT_PRESENTATION_MODES, {
    message: `styleMode must be one of: ${STUDENT_PRESENTATION_MODES.join(', ')}`,
  })
  styleMode!: StudentPresentationMode;

  @IsString({ message: 'styleToken must be a string' })
  styleToken!: string;
}

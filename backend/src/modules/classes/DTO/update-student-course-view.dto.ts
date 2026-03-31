import { IsIn } from 'class-validator';

export const STUDENT_COURSE_VIEW_MODES = ['card', 'wide'] as const;

export type StudentCourseViewMode = (typeof STUDENT_COURSE_VIEW_MODES)[number];

export class UpdateStudentCourseViewDto {
  @IsIn(STUDENT_COURSE_VIEW_MODES, {
    message: `viewMode must be one of: ${STUDENT_COURSE_VIEW_MODES.join(', ')}`,
  })
  viewMode!: StudentCourseViewMode;
}

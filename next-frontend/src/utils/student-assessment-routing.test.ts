import { getStudentAssessmentHref } from './student-assessment-routing';

describe('getStudentAssessmentHref', () => {
  it('routes returned file upload assessments to the latest results page', () => {
    expect(
      getStudentAssessmentHref(
        { id: 'assessment-1', type: 'file_upload' },
        [
          {
            id: 'attempt-old',
            assessmentId: 'assessment-1',
            studentId: 'student-1',
            isSubmitted: true,
            isReturned: true,
            submittedAt: '2026-03-21T10:00:00.000Z',
            createdAt: '2026-03-21T09:00:00.000Z',
          },
          {
            id: 'attempt-new',
            assessmentId: 'assessment-1',
            studentId: 'student-1',
            isSubmitted: true,
            isReturned: true,
            submittedAt: '2026-03-22T10:00:00.000Z',
            createdAt: '2026-03-22T09:00:00.000Z',
          },
        ],
      ),
    ).toBe('/dashboard/student/assessments/assessment-1/results/attempt-new');
  });

  it('keeps unreturned file upload assessments on the assessment detail page', () => {
    expect(
      getStudentAssessmentHref(
        { id: 'assessment-1', type: 'file_upload' },
        [
          {
            id: 'attempt-awaiting-review',
            assessmentId: 'assessment-1',
            studentId: 'student-1',
            isSubmitted: true,
            isReturned: false,
            submittedAt: '2026-03-22T10:00:00.000Z',
            createdAt: '2026-03-22T09:00:00.000Z',
          },
        ],
      ),
    ).toBe('/dashboard/student/assessments/assessment-1');
  });
});

import { AnnualGradesService } from './annual-grades.service';
import { getDefaultAcademicPolicy } from './academic-policy';

describe('AnnualGradesService account state', () => {
  it('marks an archived participant without changing annual evidence', async () => {
    const rosterQuery = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
    };
    const db: any = {
      query: {
        academicPeriodGradeRevisions: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        academicExternalPeriodGrades: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        academicAnnualSourceSelections: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        subjectAnnualGrades: { findMany: jest.fn().mockResolvedValue([]) },
        enrollments: {
          findMany: jest.fn().mockResolvedValue([{ studentId: 'student-1' }]),
        },
        users: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'student-1',
              firstName: 'Ana',
              lastName: 'Cruz',
              status: 'DELETED',
            },
          ]),
        },
        academicRemediationResults: { findMany: jest.fn() },
      },
      select: jest.fn().mockReturnValue(rosterQuery),
    };
    const policy = getDefaultAcademicPolicy('2026-2027');
    const service = new AnnualGradesService(
      { db } as any,
      {
        forClass: jest.fn().mockResolvedValue({
          cls: {
            teacherId: 'teacher-1',
            schoolYear: '2026-2027',
            subjectCode: 'MATH-7',
            subjectGradeLevel: '7',
          },
          policy,
        }),
      } as any,
      {} as any,
    );

    const result = await service.getSummary('class-1', 'teacher-1', [
      'teacher',
    ]);

    expect(result.students[0]).toMatchObject({
      studentId: 'student-1',
      accountState: 'archived',
      components: [],
      current: null,
    });
  });
});

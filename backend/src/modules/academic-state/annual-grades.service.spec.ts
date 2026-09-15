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

describe('AnnualGradesService annual transmutation', () => {
  it('persists the active table snapshot and transmuted official grade', async () => {
    const policy = getDefaultAcademicPolicy('2027-2028');
    const sourceGrades = [98, 96, 85, 70];
    const sources = policy.periods.map((period, index) => ({
      id: `source-${period.key}`,
      studentId: 'student-1',
      period: period.key,
      grade: sourceGrades[index],
      classId: 'class-1',
      trusted: true,
    }));
    let insertedValues: Array<Record<string, unknown>> = [];
    const db: any = {
      query: {
        academicPeriodGradeRevisions: {
          findMany: jest.fn().mockResolvedValue(sources),
        },
        academicExternalPeriodGrades: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        academicAnnualSourceSelections: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        subjectAnnualGrades: { findMany: jest.fn().mockResolvedValue([]) },
      },
      insert: jest.fn().mockReturnValue({
        values: jest.fn((values) => {
          insertedValues = Array.isArray(values) ? values : [values];
          return {
            returning: jest.fn().mockResolvedValue(
              insertedValues.map((value, index) => ({
                id: `annual-${index + 1}`,
                ...value,
              })),
            ),
          };
        }),
      }),
    };
    const databaseService = {
      db,
      academicTransaction: (work: () => Promise<unknown>) => work(),
    };
    const annualPolicy = {
      ...policy,
      annualTransmutation: {
        tableId: 'active-table-1',
        title: 'TRANSMUTATION TABLE NEW',
        updatedAt: '2026-09-14T13:45:07.682Z',
        bands: [
          {
            minInitialGrade: 88,
            maxInitialGrade: 100,
            transmutedGrade: 90,
          },
          {
            minInitialGrade: 0,
            maxInitialGrade: 87.99,
            transmutedGrade: 89,
          },
        ],
      },
    };
    const service = new (AnnualGradesService as any)(
      databaseService,
      {
        forClass: jest.fn().mockResolvedValue({
          cls: {
            schoolYear: '2027-2028',
            subjectCode: 'SCI-10',
            subjectGradeLevel: '10',
          },
          policy,
        }),
      },
      { logBulk: jest.fn().mockResolvedValue([]) },
      { snapshotForPolicy: jest.fn().mockResolvedValue(annualPolicy) },
    );

    await service.refreshForClass('class-1', 'teacher-1');

    expect(insertedValues[0]).toMatchObject({
      officialGrade: 89,
      policy: {
        annualTransmutation: {
          tableId: 'active-table-1',
          title: 'TRANSMUTATION TABLE NEW',
        },
      },
    });
  });
});

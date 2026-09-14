import { ClassRecordRosterService } from './class-record-roster.service';

describe('ClassRecordRosterService account state', () => {
  it('keeps account archive independent from enrollment and eligibility', async () => {
    const scoredQuery = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
    };
    const db: any = {
      query: {
        classRecords: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'record-1',
            classId: 'class-1',
            rosterConfirmedAt: new Date('2026-09-14T00:00:00Z'),
            rosterConfirmedBy: 'teacher-1',
            class: { teacherId: 'teacher-1' },
          }),
        },
        classRecordParticipants: {
          findMany: jest.fn().mockResolvedValue([
            {
              studentId: 'student-1',
              eligibility: 'eligible',
              reason: null,
              source: 'confirmed',
            },
          ]),
        },
        enrollments: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { studentId: 'student-1', status: 'enrolled' },
            ]),
        },
        classRecordFinalGrades: { findMany: jest.fn().mockResolvedValue([]) },
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
      },
      select: jest.fn().mockReturnValue(scoredQuery),
    };
    const service = new ClassRecordRosterService(
      { db } as any,
      {} as any,
      {} as any,
    );

    const result = await service.getRoster('record-1', 'teacher-1', [
      'teacher',
    ]);

    expect(result.participants[0]).toMatchObject({
      studentId: 'student-1',
      eligibility: 'eligible',
      currentlyEnrolled: true,
      accountState: 'archived',
    });
  });
});

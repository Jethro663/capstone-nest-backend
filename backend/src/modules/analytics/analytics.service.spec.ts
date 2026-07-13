import { ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { DatabaseService } from '../../database/database.service';

describe('AnalyticsService', () => {
  it('builds intervention outcomes from one case read and one snapshot read', async () => {
    const db = {
      query: {
        classes: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'class-1',
            teacherId: 'teacher-1',
          }),
        },
        interventionCases: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'case-1',
              studentId: 'student-1',
              status: 'completed',
              triggerScore: '60',
              openedAt: new Date(),
              closedAt: new Date(),
              student: { id: 'student-1' },
              assignments: [
                { id: 'a-1', isCompleted: true },
                { id: 'a-2', isCompleted: false },
              ],
            },
          ]),
        },
        performanceSnapshots: {
          findMany: jest.fn().mockResolvedValue([
            {
              studentId: 'student-1',
              blendedScore: '75',
              isAtRisk: false,
              lastComputedAt: new Date(),
            },
          ]),
        },
      },
    };
    const service = new AnalyticsService({ db } as unknown as DatabaseService);

    const result = await service.getInterventionOutcomes(
      'class-1',
      'teacher-1',
      ['teacher'],
    );

    expect(db.query.interventionCases.findMany).toHaveBeenCalledTimes(1);
    expect(db.query.performanceSnapshots.findMany).toHaveBeenCalledTimes(1);
    expect(result.summary).toMatchObject({
      totalCases: 1,
      improvedCount: 1,
      completionRate: 50,
    });
  });

  it('rejects analytics reads for a non-owner teacher', async () => {
    const db = {
      query: {
        classes: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'class-1',
            teacherId: 'teacher-2',
          }),
        },
      },
    };
    const service = new AnalyticsService({ db } as unknown as DatabaseService);

    await expect(
      service.getClassTrends('class-1', 'teacher-1', ['teacher']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

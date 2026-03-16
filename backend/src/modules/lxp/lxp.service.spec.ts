import { Test, TestingModule } from '@nestjs/testing';
import { LxpService } from './lxp.service';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

describe('LxpService', () => {
  let service: LxpService;

  const mockDb: any = {
    query: {
      classes: { findFirst: jest.fn() },
      interventionCases: { findMany: jest.fn() },
      interventionAssignments: { findMany: jest.fn() },
      lxpProgress: { findMany: jest.fn() },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LxpService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: NotificationsService, useValue: { createBulk: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<LxpService>(LxpService);
  });

  it('batches teacher queue assignments and progress reads', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionCases.findMany.mockResolvedValue([
      {
        id: 'case-1',
        studentId: 'student-1',
        classId: 'class-1',
        openedAt: new Date('2026-01-01'),
        triggerScore: '70',
        thresholdApplied: '74',
        student: {
          id: 'student-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
        },
      },
      {
        id: 'case-2',
        studentId: 'student-2',
        classId: 'class-1',
        openedAt: new Date('2026-01-02'),
        triggerScore: '69',
        thresholdApplied: '74',
        student: {
          id: 'student-2',
          firstName: 'Alan',
          lastName: 'Turing',
          email: 'alan@example.com',
        },
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      { id: 'a1', caseId: 'case-1', isCompleted: true },
      { id: 'a2', caseId: 'case-1', isCompleted: false },
      { id: 'a3', caseId: 'case-2', isCompleted: false },
    ]);
    mockDb.query.lxpProgress.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        xpTotal: 20,
        streakDays: 2,
        checkpointsCompleted: 1,
        lastActivityAt: new Date('2026-01-03'),
      },
      {
        studentId: 'student-2',
        xpTotal: 0,
        streakDays: 0,
        checkpointsCompleted: 0,
        lastActivityAt: null,
      },
    ]);

    const result = await service.getTeacherQueue('class-1', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(mockDb.query.interventionAssignments.findMany).toHaveBeenCalledTimes(
      1,
    );
    expect(mockDb.query.lxpProgress.findMany).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(2);
    expect(result.queue[0]).toMatchObject({
      id: 'case-1',
      totalCheckpoints: 2,
      completedCheckpoints: 1,
    });
  });
});

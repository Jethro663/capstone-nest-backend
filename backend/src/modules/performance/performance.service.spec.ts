import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PerformanceService } from './performance.service';
import { DatabaseService } from '../../database/database.service';
import { PerformanceStatusChangedEvent } from '../../common/events';

function buildMockDb() {
  return {
    query: {
      classes: { findFirst: jest.fn() },
      assessments: { findFirst: jest.fn() },
      assessmentAttempts: { findMany: jest.fn() },
      classRecords: { findMany: jest.fn() },
      performanceSnapshots: { findFirst: jest.fn(), findMany: jest.fn() },
      performanceLogs: { findMany: jest.fn() },
      enrollments: { findMany: jest.fn() },
      users: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
  };
}

function mockInsertReturning(db: any, rows: any[]) {
  const returning = jest.fn().mockResolvedValue(rows);
  const values = jest.fn().mockReturnValue({ returning });
  db.insert.mockReturnValueOnce({ values });
}

function mockInsertNoReturning(db: any) {
  const values = jest.fn().mockResolvedValue(undefined);
  db.insert.mockReturnValueOnce({ values });
}

function mockUpdateReturning(db: any, rows: any[]) {
  const returning = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  db.update.mockReturnValueOnce({ set });
}

describe('PerformanceService', () => {
  let service: PerformanceService;
  let db: any;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    db = buildMockDb();
    eventEmitter = { emit: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        { provide: DatabaseService, useValue: { db } },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
  });

  it('recomputeStudent should aggregate both sources and mark at-risk below 74', async () => {
    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        assessmentId: 'a1',
        score: 70,
        submittedAt: new Date('2026-03-07T09:00:00Z'),
        attemptNumber: 2,
        assessment: { classId: 'class-1' },
      },
      {
        assessmentId: 'a1',
        score: 50,
        submittedAt: new Date('2026-03-06T09:00:00Z'),
        attemptNumber: 1,
        assessment: { classId: 'class-1' },
      },
      {
        assessmentId: 'a2',
        score: 80,
        submittedAt: new Date('2026-03-07T10:00:00Z'),
        attemptNumber: 1,
        assessment: { classId: 'class-1' },
      },
    ]);
    db.query.classRecords.findMany.mockResolvedValue([
      {
        items: [
          {
            maxScore: '20',
            scores: [{ studentId: 'student-1', score: '10' }],
          },
          {
            maxScore: '10',
            scores: [],
          },
        ],
      },
    ]);
    db.query.performanceSnapshots.findFirst.mockResolvedValue(null);
    mockInsertReturning(db, [
      {
        id: 'snap-1',
        assessmentAverage: '75',
        classRecordAverage: '25',
        blendedScore: '50',
        assessmentSampleSize: 2,
        classRecordSampleSize: 2,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: '74',
        lastComputedAt: new Date(),
      },
    ]);
    mockInsertNoReturning(db);

    const result = await service.recomputeStudent('class-1', 'student-1', 'manual_recompute');

    expect(result.assessmentAverage).toBe(75);
    expect(result.classRecordAverage).toBe(25);
    expect(result.blendedScore).toBe(50);
    expect(result.isAtRisk).toBe(true);
    expect(result.thresholdApplied).toBe(74);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('recomputeStudent should emit performance.status.changed when status flips', async () => {
    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        assessmentId: 'a1',
        score: 40,
        submittedAt: new Date('2026-03-07T10:00:00Z'),
        attemptNumber: 1,
        assessment: { classId: 'class-1' },
      },
    ]);
    db.query.classRecords.findMany.mockResolvedValue([]);
    db.query.performanceSnapshots.findFirst.mockResolvedValue({
      id: 'snap-1',
      isAtRisk: false,
    });
    mockUpdateReturning(db, [
      {
        id: 'snap-1',
        assessmentAverage: '40',
        classRecordAverage: null,
        blendedScore: '40',
        assessmentSampleSize: 1,
        classRecordSampleSize: 0,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: '74',
        lastComputedAt: new Date(),
      },
    ]);
    mockInsertNoReturning(db);

    await service.recomputeStudent('class-1', 'student-1', 'assessment_submitted');

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      PerformanceStatusChangedEvent.eventName,
      expect.objectContaining({
        classId: 'class-1',
        studentId: 'student-1',
        previousIsAtRisk: false,
        currentIsAtRisk: true,
      }),
    );
  });

  it('getClassSummary should return aggregated class metrics', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    db.query.enrollments.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        student: { firstName: 'Alice', lastName: 'Lee', email: 'alice@test.com' },
      },
      {
        studentId: 'student-2',
        student: { firstName: 'Bob', lastName: 'Tan', email: 'bob@test.com' },
      },
    ]);
    db.query.performanceSnapshots.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        assessmentAverage: '80',
        classRecordAverage: '78',
        blendedScore: '79',
        assessmentSampleSize: 3,
        classRecordSampleSize: 5,
        hasData: true,
        isAtRisk: false,
        thresholdApplied: '74',
        lastComputedAt: new Date(),
      },
      {
        studentId: 'student-2',
        assessmentAverage: '60',
        classRecordAverage: '64',
        blendedScore: '62',
        assessmentSampleSize: 3,
        classRecordSampleSize: 5,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: '74',
        lastComputedAt: new Date(),
      },
    ]);

    const summary = await service.getClassSummary('class-1', 'teacher-1', ['teacher']);

    expect(summary.totalStudents).toBe(2);
    expect(summary.atRiskCount).toBe(1);
    expect(summary.averages.blended).toBe(70.5);
    expect(summary.students[0].studentId).toBe('student-2');
  });

  it('getClassSummary should enforce teacher ownership', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-99',
    });

    await expect(
      service.getClassSummary('class-1', 'teacher-1', ['teacher']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('getClassLogs should return parsed logs with student metadata', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    db.query.performanceLogs.findMany.mockResolvedValue([
      {
        id: 'log-1',
        studentId: 'student-1',
        previousIsAtRisk: false,
        currentIsAtRisk: true,
        assessmentAverage: '60',
        classRecordAverage: '66',
        blendedScore: '63',
        thresholdApplied: '74',
        triggerSource: 'assessment_submitted',
        createdAt: new Date(),
        student: {
          id: 'student-1',
          firstName: 'Alice',
          lastName: 'Lee',
          email: 'alice@test.com',
        },
      },
    ]);

    const result = await service.getClassLogs(
      'class-1',
      'teacher-1',
      ['teacher'],
      { limit: 20 },
    );

    expect(result.count).toBe(1);
    expect(result.logs[0].blendedScore).toBe(63);
    expect(result.logs[0].student?.firstName).toBe('Alice');
  });

  it('getStudentOwnSummary should compute overall stats from per-class snapshots', async () => {
    db.query.users.findFirst.mockResolvedValue({
      id: 'student-1',
      firstName: 'Alice',
      lastName: 'Lee',
      email: 'alice@test.com',
    });
    db.query.enrollments.findMany.mockResolvedValue([
      {
        classId: 'class-1',
        class: {
          id: 'class-1',
          subjectName: 'Math',
          subjectCode: 'MATH-9',
          section: { id: 'sec-1', name: 'A', gradeLevel: '9' },
        },
      },
      {
        classId: 'class-2',
        class: {
          id: 'class-2',
          subjectName: 'Science',
          subjectCode: 'SCI-9',
          section: { id: 'sec-1', name: 'A', gradeLevel: '9' },
        },
      },
    ]);

    jest
      .spyOn(service, 'recomputeStudent')
      .mockResolvedValueOnce({
        id: 's1',
        studentId: 'student-1',
        classId: 'class-1',
        assessmentAverage: 82,
        classRecordAverage: 78,
        blendedScore: 80,
        assessmentSampleSize: 3,
        classRecordSampleSize: 4,
        hasData: true,
        isAtRisk: false,
        thresholdApplied: 74,
        lastComputedAt: new Date(),
      } as any)
      .mockResolvedValueOnce({
        id: 's2',
        studentId: 'student-1',
        classId: 'class-2',
        assessmentAverage: 60,
        classRecordAverage: 66,
        blendedScore: 63,
        assessmentSampleSize: 3,
        classRecordSampleSize: 4,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: 74,
        lastComputedAt: new Date(),
      } as any);

    const result = await service.getStudentOwnSummary('student-1');

    expect(result.classes).toHaveLength(2);
    expect(result.overall.atRiskClasses).toBe(1);
    expect(result.overall.averageBlendedScore).toBe(71.5);
  });
});

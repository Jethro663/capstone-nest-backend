import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { LxpService } from './lxp.service';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

describe('LxpService', () => {
  let service: LxpService;

  const mockDb: any = {
    query: {
      classes: { findFirst: jest.fn() },
      enrollments: { findFirst: jest.fn(), findMany: jest.fn() },
      performanceSnapshots: { findFirst: jest.fn(), findMany: jest.fn() },
      interventionCases: { findFirst: jest.fn(), findMany: jest.fn() },
      interventionAssignments: { findMany: jest.fn() },
      lxpProgress: { findFirst: jest.fn(), findMany: jest.fn() },
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

  it('builds the student overview with lesson-first recommendation and placeholders', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      triggerScore: '68',
      thresholdApplied: '74',
      openedAt: new Date('2026-02-01T00:00:00.000Z'),
      closedAt: null,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    mockDb.query.performanceSnapshots.findFirst.mockResolvedValue({
      blendedScore: '68',
      thresholdApplied: '74',
      isAtRisk: true,
      lastComputedAt: new Date('2026-02-05T00:00:00.000Z'),
    });
    mockDb.query.lxpProgress.findFirst.mockResolvedValue({
      studentId: 'student-1',
      classId: 'class-1',
      xpTotal: 80,
      streakDays: 3,
      checkpointsCompleted: 1,
      lastActivityAt: new Date('2026-02-06T00:00:00.000Z'),
    });
    mockDb.query.enrollments.findMany.mockResolvedValue([
      {
        classId: 'class-1',
        class: {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          section: { id: 'sec-1', name: 'Rizal', gradeLevel: '7' },
        },
      },
      {
        classId: 'class-2',
        class: {
          id: 'class-2',
          subjectName: 'Science',
          subjectCode: 'SCI-7',
          section: { id: 'sec-1', name: 'Rizal', gradeLevel: '7' },
        },
      },
    ]);
    mockDb.query.performanceSnapshots.findMany.mockResolvedValue([
      {
        classId: 'class-1',
        blendedScore: '68',
        thresholdApplied: '74',
        isAtRisk: true,
        lastComputedAt: new Date('2026-02-05T00:00:00.000Z'),
      },
      {
        classId: 'class-2',
        blendedScore: '82',
        thresholdApplied: '74',
        isAtRisk: false,
        lastComputedAt: new Date('2026-02-05T00:00:00.000Z'),
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-lesson',
        assignmentType: 'lesson_review',
        checkpointLabel: 'Review Fractions',
        orderIndex: 1,
        isCompleted: false,
        completedAt: null,
        xpAwarded: 20,
        lesson: {
          id: 'lesson-1',
          title: 'Fractions Refresher',
          description: 'Revisit basic fraction operations.',
          order: 2,
        },
        assessment: null,
      },
      {
        id: 'assignment-assessment',
        assignmentType: 'assessment_retry',
        checkpointLabel: 'Retry Quiz 1',
        orderIndex: 2,
        isCompleted: false,
        completedAt: null,
        xpAwarded: 30,
        lesson: null,
        assessment: {
          id: 'assessment-1',
          title: 'Fractions Quiz',
          description: 'Retry the fractions quiz.',
          passingScore: 75,
          dueDate: new Date('2026-02-10T00:00:00.000Z'),
          type: 'quiz',
        },
      },
      {
        id: 'assignment-complete',
        assignmentType: 'lesson_review',
        checkpointLabel: 'Completed Drill',
        orderIndex: 3,
        isCompleted: true,
        completedAt: new Date('2026-02-06T00:00:00.000Z'),
        xpAwarded: 20,
        lesson: {
          id: 'lesson-2',
          title: 'Completed Drill',
          description: 'Already completed drill.',
          order: 1,
        },
        assessment: null,
      },
    ]);

    const result = await service.getStudentOverview('student-1', 'class-1');

    expect(result.selectedClass.subjectName).toBe('Mathematics');
    expect(result.recommendedAction).toMatchObject({
      assignmentId: 'assignment-lesson',
      type: 'lesson_review',
      title: 'Fractions Refresher',
    });
    expect(result.upcomingAssessments).toEqual([
      expect.objectContaining({
        assignmentId: 'assignment-assessment',
        assessmentId: 'assessment-1',
        title: 'Fractions Quiz',
      }),
    ]);
    expect(result.subjectMastery[0]).toMatchObject({
      classId: 'class-1',
      isSelected: true,
    });
    expect(result.weakFocusItems.length).toBeGreaterThan(0);
  });

  it('falls back to assessment retry when no incomplete lesson remains', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      triggerScore: '68',
      thresholdApplied: '74',
      openedAt: new Date('2026-02-01T00:00:00.000Z'),
      closedAt: null,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    mockDb.query.performanceSnapshots.findFirst.mockResolvedValue({
      blendedScore: '68',
      thresholdApplied: '74',
      isAtRisk: true,
      lastComputedAt: new Date('2026-02-05T00:00:00.000Z'),
    });
    mockDb.query.lxpProgress.findFirst.mockResolvedValue({
      studentId: 'student-1',
      classId: 'class-1',
      xpTotal: 40,
      streakDays: 1,
      checkpointsCompleted: 0,
      lastActivityAt: null,
    });
    mockDb.query.enrollments.findMany.mockResolvedValue([
      {
        classId: 'class-1',
        class: {
          id: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          section: { id: 'sec-1', name: 'Rizal', gradeLevel: '7' },
        },
      },
    ]);
    mockDb.query.performanceSnapshots.findMany.mockResolvedValue([
      {
        classId: 'class-1',
        blendedScore: '68',
        thresholdApplied: '74',
        isAtRisk: true,
        lastComputedAt: new Date('2026-02-05T00:00:00.000Z'),
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-assessment',
        assignmentType: 'assessment_retry',
        checkpointLabel: 'Retry Quiz 1',
        orderIndex: 1,
        isCompleted: false,
        completedAt: null,
        xpAwarded: 30,
        lesson: null,
        assessment: {
          id: 'assessment-1',
          title: 'Fractions Quiz',
          description: 'Retry the fractions quiz.',
          passingScore: 75,
          dueDate: new Date('2026-02-10T00:00:00.000Z'),
          type: 'quiz',
        },
      },
    ]);

    const result = await service.getStudentOverview('student-1', 'class-1');

    expect(result.recommendedAction).toMatchObject({
      assignmentId: 'assignment-assessment',
      type: 'assessment_retry',
    });
  });

  it('rejects overview access when the student is not intervention-eligible', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    mockDb.query.interventionCases.findFirst.mockResolvedValue(null);
    mockDb.query.performanceSnapshots.findFirst.mockResolvedValue({
      isAtRisk: false,
      blendedScore: '85',
      thresholdApplied: '74',
      lastComputedAt: new Date('2026-02-05T00:00:00.000Z'),
    });

    await expect(
      service.getStudentOverview('student-1', 'class-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

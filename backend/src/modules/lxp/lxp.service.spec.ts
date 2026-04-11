import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LxpService } from './lxp.service';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

describe('LxpService', () => {
  let service: LxpService;
  const mockNotificationsService = { createBulk: jest.fn() };
  const mockAuditService = { log: jest.fn() };

  const mockDb: any = {
    query: {
      classes: { findFirst: jest.fn() },
      enrollments: { findFirst: jest.fn(), findMany: jest.fn() },
      performanceSnapshots: { findFirst: jest.fn(), findMany: jest.fn() },
      interventionCases: { findFirst: jest.fn(), findMany: jest.fn() },
      interventionAssignments: { findFirst: jest.fn(), findMany: jest.fn() },
      lxpProgress: { findFirst: jest.fn(), findMany: jest.fn() },
      systemEvaluations: { findMany: jest.fn() },
      lessons: { findMany: jest.fn() },
      assessments: { findMany: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb.query.performanceSnapshots.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LxpService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditService, useValue: mockAuditService },
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
        status: 'pending',
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
        status: 'active',
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
    mockDb.query.performanceSnapshots.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        isAtRisk: true,
        blendedScore: '68',
        thresholdApplied: '74',
      },
      {
        studentId: 'student-2',
        isAtRisk: false,
        blendedScore: '82',
        thresholdApplied: '74',
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
      isCurrentlyAtRisk: true,
      aiPlanEligible: true,
    });
    expect(result.queue[1]).toMatchObject({
      id: 'case-2',
      isCurrentlyAtRisk: false,
      aiPlanEligible: false,
    });
  });

  it('builds the student overview with lesson-first recommendation and evidence-backed weak focus entries', async () => {
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
    expect(
      result.weakFocusItems.find(
        (entry) => entry.id === 'checkpoint-assignment-lesson',
      )?.subtitle,
    ).toBe('Revisit basic fraction operations.');
    expect(
      result.weakFocusItems.find(
        (entry) => entry.id === 'checkpoint-assignment-assessment',
      )?.subtitle,
    ).toBe('Retry the fractions quiz. Due 2026-02-10.');
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

  it('blocks overview access when intervention is pending approval', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'pending-case-1' });

    await expect(
      service.getStudentOverview('student-1', 'class-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks playlist access when intervention is pending approval', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'pending-case-1' });

    await expect(
      service.getStudentPlaylist('student-1', 'class-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('submits a system evaluation tied to the requesting user', async () => {
    const created = {
      id: 'evaluation-1',
      submittedBy: 'student-1',
      targetModule: 'lxp',
      usabilityScore: 5,
      functionalityScore: 4,
      performanceScore: 4,
      satisfactionScore: 5,
      feedback: 'Helpful checkpoints',
    };
    const returning = jest.fn().mockResolvedValue([created]);
    const values = jest.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });

    const result = await service.submitSystemEvaluation(
      { userId: 'student-1', roles: ['student'] },
      {
        targetModule: 'lxp',
        usabilityScore: 5,
        functionalityScore: 4,
        performanceScore: 4,
        satisfactionScore: 5,
        feedback: 'Helpful checkpoints',
      },
    );

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedBy: 'student-1',
        targetModule: 'lxp',
      }),
    );
    expect(result).toEqual(created);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'student-1',
        action: 'lxp.system_evaluation.submitted',
        targetType: 'system_evaluation',
        targetId: 'evaluation-1',
        metadata: expect.objectContaining({
          targetModule: 'lxp',
          usabilityScore: 5,
          functionalityScore: 4,
          performanceScore: 4,
          satisfactionScore: 5,
          hasFeedback: true,
        }),
      }),
    );
  });

  it('lists system evaluations for teachers and applies module filter', async () => {
    mockDb.query.systemEvaluations.findMany.mockResolvedValue([
      {
        id: 'evaluation-1',
        targetModule: 'lxp',
        submitter: {
          id: 'teacher-1',
          firstName: 'Ada',
          lastName: 'Teacher',
          email: 'ada.teacher@example.com',
        },
      },
    ]);

    const result = await service.listSystemEvaluations(
      { userId: 'teacher-1', roles: ['teacher'] },
      'lxp',
    );

    expect(mockDb.query.systemEvaluations.findMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      count: 1,
      rows: [
        expect.objectContaining({
          id: 'evaluation-1',
          targetModule: 'lxp',
        }),
      ],
      summary: expect.objectContaining({
        averages: expect.objectContaining({
          usabilityScore: expect.any(Number),
          functionalityScore: expect.any(Number),
          performanceScore: expect.any(Number),
          satisfactionScore: expect.any(Number),
        }),
      }),
    });
  });

  it('returns evaluation aggregation summary with module-level breakdown', async () => {
    mockDb.query.systemEvaluations.findMany.mockResolvedValue([
      {
        id: 'evaluation-1',
        targetModule: 'lxp',
        usabilityScore: 5,
        functionalityScore: 4,
        performanceScore: 4,
        satisfactionScore: 5,
        feedback: 'Helpful',
        submitter: {
          id: 'teacher-1',
          firstName: 'Ada',
          lastName: 'Teacher',
          email: 'ada.teacher@example.com',
        },
      },
      {
        id: 'evaluation-2',
        targetModule: 'lxp',
        usabilityScore: '3',
        functionalityScore: '4',
        performanceScore: '3',
        satisfactionScore: '4',
        feedback: null,
        submitter: {
          id: 'teacher-2',
          firstName: 'Alan',
          lastName: 'Teacher',
          email: 'alan.teacher@example.com',
        },
      },
      {
        id: 'evaluation-3',
        targetModule: 'ai_mentor',
        usabilityScore: 4,
        functionalityScore: 5,
        performanceScore: 4,
        satisfactionScore: 4,
        feedback: 'Good',
        submitter: {
          id: 'teacher-3',
          firstName: 'Grace',
          lastName: 'Teacher',
          email: 'grace.teacher@example.com',
        },
      },
    ]);

    const result = await service.listSystemEvaluations(
      { userId: 'admin-1', roles: ['admin'] },
      undefined,
    );

    expect(result.summary).toEqual({
      averages: {
        usabilityScore: 4,
        functionalityScore: 4.33,
        performanceScore: 3.67,
        satisfactionScore: 4.33,
      },
      feedbackCount: 2,
      moduleBreakdown: [
        {
          targetModule: 'lxp',
          count: 2,
          averages: {
            usabilityScore: 4,
            functionalityScore: 4,
            performanceScore: 3.5,
            satisfactionScore: 4.5,
          },
        },
        {
          targetModule: 'ai_mentor',
          count: 1,
          averages: {
            usabilityScore: 4,
            functionalityScore: 5,
            performanceScore: 4,
            satisfactionScore: 4,
          },
        },
      ],
    });
  });

  it('rejects invalid system evaluation target filters', async () => {
    await expect(
      service.listSystemEvaluations(
        { userId: 'teacher-1', roles: ['teacher'] },
        'not-a-real-module',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects system evaluation listing for non-teacher/non-admin users', async () => {
    await expect(
      service.listSystemEvaluations(
        { userId: 'student-1', roles: ['student'] },
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('resolving an intervention writes audit metadata and notifies the student', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      note: 'Initial intervention note',
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });

    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    const queueResponse = {
      classId: 'class-1',
      threshold: 74,
      count: 0,
      queue: [],
    };
    const queueSpy = jest
      .spyOn(service, 'getTeacherQueue')
      .mockResolvedValue(queueResponse);

    const result = await service.resolveIntervention(
      'case-1',
      { note: 'Resolved after remediation' },
      { userId: 'teacher-1', roles: ['teacher'] },
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        note: 'Initial intervention note\nResolved after remediation',
      }),
    );
    expect(mockNotificationsService.createBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'student-1',
        title: 'Intervention case resolved',
      }),
    ]);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'lxp.intervention.resolved',
        targetType: 'intervention_case',
        targetId: 'case-1',
        metadata: expect.objectContaining({
          classId: 'class-1',
          studentId: 'student-1',
          note: 'Initial intervention note\nResolved after remediation',
        }),
      }),
    );
    expect(queueSpy).toHaveBeenCalledWith('class-1', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });
    expect(result).toEqual(queueResponse);
  });

  it('blocks intervention assignment when teacher does not own the class', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-2',
    });

    await expect(
      service.assignIntervention(
        'case-1',
        { lessonIds: ['lesson-1'] },
        { userId: 'teacher-1', roles: ['teacher'] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assigns intervention tasks and writes audit + notification side effects', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      note: 'Teacher opened case with initial guidance',
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.lessons.findMany.mockResolvedValue([{ id: 'lesson-1' }]);
    mockDb.query.assessments.findMany.mockResolvedValue([
      { id: 'assessment-1' },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([]);

    const txUpdateSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    const tx = {
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      }),
      update: jest.fn().mockReturnValue({
        set: txUpdateSet,
      }),
    };
    mockDb.transaction.mockImplementation(async (handler: (tx: any) => any) =>
      handler(tx),
    );

    const queueResponse = {
      classId: 'class-1',
      threshold: 74,
      count: 1,
      queue: [{ id: 'case-1' }],
    };
    const queueSpy = jest
      .spyOn(service, 'getTeacherQueue')
      .mockResolvedValue(queueResponse as any);

    const result = await service.assignIntervention(
      'case-1',
      {
        note: 'Focus weak topics',
        lessonAssignments: [{ lessonId: 'lesson-1', xpAwarded: 25 }],
        assessmentAssignments: [
          { assessmentId: 'assessment-1', xpAwarded: 35 },
        ],
      },
      { userId: 'teacher-1', roles: ['teacher'] },
    );

    expect(txUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        note: 'Teacher opened case with initial guidance\nFocus weak topics',
      }),
    );
    expect(mockNotificationsService.createBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'student-1',
        title: 'New intervention checklist assigned',
      }),
    ]);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'lxp.intervention.approved',
        targetType: 'intervention_case',
        targetId: 'case-1',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'lxp.intervention.assigned',
        targetType: 'intervention_case',
        targetId: 'case-1',
      }),
    );
    expect(queueSpy).toHaveBeenCalledWith('class-1', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });
    expect(result).toEqual(queueResponse);
  });

  it('blocks intervention reassignment once checkpoint progress already exists', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.lessons.findMany.mockResolvedValue([{ id: 'lesson-1' }]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      { id: 'assignment-1', isCompleted: true },
    ]);

    await expect(
      service.assignIntervention(
        'case-1',
        { lessonIds: ['lesson-1'] },
        { userId: 'teacher-1', roles: ['teacher'] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockAuditService.log).not.toHaveBeenCalled();
    expect(mockNotificationsService.createBulk).not.toHaveBeenCalled();
  });

  it('writes audit metadata when performance status auto-opens intervention support', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });

    jest
      .spyOn(service as any, 'getOrCreateCaseForStudent')
      .mockResolvedValue({ id: 'case-auto-opened' });
    jest
      .spyOn(service as any, 'ensureDefaultAssignments')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'getOrCreateProgress')
      .mockResolvedValue({ id: 'progress-1' });
    jest
      .spyOn(service as any, 'notifyInterventionPending')
      .mockResolvedValue(undefined);

    await service.handlePerformanceStatusChanged({
      classId: 'class-1',
      studentId: 'student-1',
      previousIsAtRisk: false,
      currentIsAtRisk: true,
      blendedScore: 58,
      thresholdApplied: 74,
    });

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'lxp.intervention.pending_created',
        targetType: 'intervention_case',
        targetId: 'case-auto-opened',
        metadata: expect.objectContaining({
          classId: 'class-1',
          studentId: 'student-1',
          previousIsAtRisk: false,
          currentIsAtRisk: true,
          blendedScore: 58,
          thresholdApplied: 74,
        }),
      }),
    );
  });

  it('writes audit metadata when performance status auto-resolves active intervention cases', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionCases.findMany.mockResolvedValue([
      { id: 'case-active-1', note: 'Student has late work backlog' },
    ]);

    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    await service.handlePerformanceStatusChanged({
      classId: 'class-1',
      studentId: 'student-1',
      previousIsAtRisk: true,
      currentIsAtRisk: false,
      blendedScore: 81,
      thresholdApplied: 74,
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        note:
          'Student has late work backlog\nAuto-resolved because student is no longer at-risk.',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'lxp.intervention.auto_resolved',
        targetType: 'intervention_case',
        targetId: 'case-active-1',
        metadata: expect.objectContaining({
          classId: 'class-1',
          studentId: 'student-1',
          previousIsAtRisk: true,
          currentIsAtRisk: false,
          blendedScore: 81,
          thresholdApplied: 74,
        }),
      }),
    );
  });

  it('writes intervention completion audit metadata when the final checkpoint is completed', async () => {
    jest
      .spyOn(service as any, 'assertStudentEnrollment')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getOrCreateProgress').mockResolvedValue({
      studentId: 'student-1',
      classId: 'class-1',
      xpTotal: 30,
      streakDays: 2,
      checkpointsCompleted: 1,
      lastActivityAt: new Date('2026-02-10T00:00:00.000Z'),
    });
    const playlistResponse = { classId: 'class-1', checkpoints: [] };
    const playlistSpy = jest
      .spyOn(service, 'getStudentPlaylist')
      .mockResolvedValue(playlistResponse as any);

    mockDb.query.interventionAssignments.findFirst.mockResolvedValue({
      id: 'assignment-1',
      isCompleted: false,
      xpAwarded: 20,
      interventionCase: {
        id: 'case-1',
        studentId: 'student-1',
        classId: 'class-1',
        status: 'active',
        note: 'Teacher assigned checkpoint sequence',
      },
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
      subjectCode: 'MATH-7',
    });

    const txUpdateSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    const tx = {
      update: jest.fn().mockReturnValue({
        set: txUpdateSet,
      }),
      query: {
        interventionAssignments: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'assignment-1', isCompleted: true },
            { id: 'assignment-2', isCompleted: true },
          ]),
        },
      },
    };

    mockDb.transaction.mockImplementation(async (handler: (trx: any) => any) =>
      handler(tx),
    );

    const result = await service.completeCheckpoint(
      'student-1',
      'class-1',
      'assignment-1',
    );

    expect(txUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        note:
          'Teacher assigned checkpoint sequence\nAuto-completed after finishing all LXP checkpoints.',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'student-1',
        action: 'lxp.checkpoint.completed',
        targetType: 'intervention_assignment',
        targetId: 'assignment-1',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'student-1',
        action: 'lxp.intervention.completed_by_student',
        targetType: 'intervention_case',
        targetId: 'case-1',
        metadata: expect.objectContaining({
          classId: 'class-1',
          studentId: 'student-1',
        }),
      }),
    );
    expect(mockNotificationsService.createBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'teacher-1',
        title: 'Intervention cycle completed',
      }),
    ]);
    expect(playlistSpy).toHaveBeenCalledWith('student-1', 'class-1');
    expect(result).toEqual(playlistResponse);
  });

  it('blocks manual completion for assessment retry checkpoints', async () => {
    jest
      .spyOn(service as any, 'assertStudentEnrollment')
      .mockResolvedValue(undefined);
    mockDb.query.interventionAssignments.findFirst.mockResolvedValue({
      id: 'assignment-retry',
      assignmentType: 'assessment_retry',
      isCompleted: false,
      xpAwarded: 30,
      interventionCase: {
        id: 'case-1',
        studentId: 'student-1',
        classId: 'class-1',
        status: 'active',
        note: null,
      },
    });

    await expect(
      service.completeCheckpoint('student-1', 'class-1', 'assignment-retry'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes assessment retry checkpoint via JA review session evidence', async () => {
    jest
      .spyOn(service as any, 'assertStudentEnrollment')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getOrCreateProgress').mockResolvedValue({
      studentId: 'student-1',
      classId: 'class-1',
      xpTotal: 10,
      streakDays: 1,
      checkpointsCompleted: 0,
      lastActivityAt: null,
    });
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-retry',
        assignmentType: 'assessment_retry',
        assessmentId: 'assessment-1',
        orderIndex: 1,
        isCompleted: false,
        xpAwarded: 30,
        interventionCase: {
          id: 'case-1',
          studentId: 'student-1',
          classId: 'class-1',
          status: 'active',
          note: null,
        },
      },
    ]);
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
      subjectCode: 'MATH-7',
    });

    const txUpdateSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    const tx = {
      update: jest.fn().mockReturnValue({
        set: txUpdateSet,
      }),
      query: {
        interventionAssignments: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'assignment-retry', isCompleted: true },
          ]),
        },
      },
    };
    mockDb.transaction.mockImplementation(async (handler: (trx: any) => any) =>
      handler(tx),
    );

    const result = await service.completeAssessmentRetryFromJaReview(
      'student-1',
      'class-1',
      'assessment-1',
      'ja-session-1',
    );

    expect(result).toMatchObject({
      completed: true,
      assignmentId: 'assignment-retry',
    });
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'student-1',
        action: 'lxp.checkpoint.completed',
        targetId: 'assignment-retry',
        metadata: expect.objectContaining({
          source: 'ja_review',
          jaSessionId: 'ja-session-1',
        }),
      }),
    );
  });
});

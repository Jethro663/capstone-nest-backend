import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LxpService } from './lxp.service';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditService } from '../audit/audit.service';

describe('LxpService', () => {
  let service: LxpService;
  const mockNotificationsService = {
    createBulk: jest.fn(),
    createBulkDeduped: jest.fn(),
  };
  const mockNotificationsGateway = { emitToUser: jest.fn() };
  const mockAuditService = { log: jest.fn() };

  const mockDb: any = {
    query: {
      classes: { findFirst: jest.fn(), findMany: jest.fn() },
      enrollments: { findFirst: jest.fn(), findMany: jest.fn() },
      performanceSnapshots: { findFirst: jest.fn(), findMany: jest.fn() },
      performanceLogs: { findMany: jest.fn() },
      interventionCases: { findFirst: jest.fn(), findMany: jest.fn() },
      interventionAssignments: { findFirst: jest.fn(), findMany: jest.fn() },
      generatedGuidedAssessmentAttempts: { findMany: jest.fn() },
      generatedRemedialLessons: { findFirst: jest.fn(), findMany: jest.fn() },
      generatedGuidedAssessments: { findFirst: jest.fn(), findMany: jest.fn() },
      assessmentAttempts: { findMany: jest.fn() },
      studentConceptMastery: { findMany: jest.fn() },
      lxpProgress: { findFirst: jest.fn(), findMany: jest.fn() },
      systemEvaluations: { findMany: jest.fn() },
      systemEvaluationCampaigns: { findFirst: jest.fn(), findMany: jest.fn() },
      systemEvaluationAssignments: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      lessons: { findMany: jest.fn() },
      assessments: { findFirst: jest.fn(), findMany: jest.fn() },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockNotificationsService.createBulk.mockResolvedValue(undefined);
    mockNotificationsService.createBulkDeduped.mockImplementation(
      async (inputs) => inputs,
    );
    mockDb.query.performanceSnapshots.findMany.mockResolvedValue([]);
    mockDb.query.generatedGuidedAssessmentAttempts.findMany.mockResolvedValue(
      [],
    );
    mockDb.query.generatedRemedialLessons.findFirst.mockResolvedValue(null);
    mockDb.query.generatedRemedialLessons.findMany.mockResolvedValue([]);
    mockDb.query.generatedGuidedAssessments.findFirst.mockResolvedValue(null);
    mockDb.query.generatedGuidedAssessments.findMany.mockResolvedValue([]);
    mockDb.query.assessmentAttempts.findMany.mockResolvedValue([]);
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          groupBy: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LxpService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<LxpService>(LxpService);
  });

  it('returns active and completed student paths while keeping eligibleClasses active-only', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValueOnce([
      {
        classId: 'class-active',
        class: {
          id: 'class-active',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
          section: { id: 'sec-1', name: 'Section A', gradeLevel: '7' },
        },
      },
      {
        classId: 'class-completed',
        class: {
          id: 'class-completed',
          subjectName: 'Science 7',
          subjectCode: 'SCI-7',
          section: { id: 'sec-1', name: 'Section A', gradeLevel: '7' },
        },
      },
      {
        classId: 'class-pending',
        class: {
          id: 'class-pending',
          subjectName: 'English 7',
          subjectCode: 'ENG-7',
          section: { id: 'sec-1', name: 'Section A', gradeLevel: '7' },
        },
      },
    ]);
    mockDb.query.performanceSnapshots.findMany.mockResolvedValueOnce([
      {
        classId: 'class-active',
        isAtRisk: true,
        blendedScore: '62',
        thresholdApplied: '74',
      },
      {
        classId: 'class-completed',
        isAtRisk: false,
        blendedScore: '82',
        thresholdApplied: '74',
      },
    ]);
    mockDb.query.interventionCases.findMany.mockResolvedValueOnce([
      {
        id: 'case-active',
        classId: 'class-active',
        status: 'active',
        openedAt: new Date('2026-02-01T00:00:00.000Z'),
        closedAt: null,
      },
      {
        id: 'case-completed',
        classId: 'class-completed',
        status: 'completed',
        openedAt: new Date('2026-01-01T00:00:00.000Z'),
        closedAt: new Date('2026-01-10T00:00:00.000Z'),
      },
      {
        id: 'case-pending',
        classId: 'class-pending',
        status: 'pending',
        openedAt: new Date('2026-03-01T00:00:00.000Z'),
        closedAt: null,
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValueOnce([
      {
        caseId: 'case-active',
        assignmentType: 'lesson_review',
        isCompleted: true,
      },
      {
        caseId: 'case-active',
        assignmentType: 'assessment_retry',
        isCompleted: false,
      },
      {
        caseId: 'case-completed',
        assignmentType: 'lesson_review',
        isCompleted: true,
      },
      {
        caseId: 'case-completed',
        assignmentType: 'assessment_retry',
        isCompleted: true,
      },
      {
        caseId: 'case-pending',
        assignmentType: 'lesson_review',
        isCompleted: false,
      },
    ]);

    const result = await service.getStudentEligibility('student-1');

    expect(result.eligibleClasses).toHaveLength(1);
    expect(result.eligibleClasses[0]).toMatchObject({
      classId: 'class-active',
      interventionCaseId: 'case-active',
    });
    expect(result.paths).toEqual([
      expect.objectContaining({
        classId: 'class-active',
        interventionCaseId: 'case-active',
        status: 'active',
        counts: {
          steps: 1,
          replays: 1,
          pending: 1,
          total: 2,
          completed: 1,
        },
        progress: expect.objectContaining({
          totalCheckpoints: 2,
          completedCheckpoints: 1,
          completionPercent: 50,
        }),
      }),
      expect.objectContaining({
        classId: 'class-completed',
        interventionCaseId: 'case-completed',
        status: 'completed',
        counts: {
          steps: 1,
          replays: 1,
          pending: 0,
          total: 2,
          completed: 2,
        },
        progress: expect.objectContaining({
          totalCheckpoints: 2,
          completedCheckpoints: 2,
          completionPercent: 100,
        }),
      }),
    ]);
    expect(result.paths.some((path) => path.classId === 'class-pending')).toBe(
      false,
    );
  });

  it('returns open student intervention alerts for enrolled classes', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValueOnce([
      {
        classId: 'class-pending',
        class: {
          id: 'class-pending',
          subjectName: 'English 7',
          subjectCode: 'ENG-7',
          section: { id: 'sec-1', name: 'Section A', gradeLevel: '7' },
        },
      },
      {
        classId: 'class-active',
        class: {
          id: 'class-active',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
          section: { id: 'sec-1', name: 'Section A', gradeLevel: '7' },
        },
      },
    ]);
    mockDb.query.interventionCases.findMany.mockResolvedValueOnce([
      {
        id: 'case-pending',
        classId: 'class-pending',
        status: 'pending',
        triggerScore: '71.25',
        thresholdApplied: '74',
        openedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
      {
        id: 'case-active',
        classId: 'class-active',
        status: 'active',
        triggerScore: '68.5',
        thresholdApplied: '74',
        openedAt: new Date('2026-05-02T00:00:00.000Z'),
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValueOnce([
      { caseId: 'case-active' },
    ]);

    const result = await service.getStudentInterventionAlerts('student-1');

    expect(result.count).toBe(2);
    expect(result.alerts).toEqual([
      expect.objectContaining({
        caseId: 'case-pending',
        classId: 'class-pending',
        status: 'pending',
        subjectCode: 'ENG-7',
        triggerScore: 71.25,
        thresholdApplied: 74,
        hasAssignedPath: false,
      }),
      expect.objectContaining({
        caseId: 'case-active',
        classId: 'class-active',
        status: 'active',
        subjectCode: 'MATH-7',
        triggerScore: 68.5,
        thresholdApplied: 74,
        hasAssignedPath: true,
      }),
    ]);
  });

  it('hides active intervention cases from student eligibility until assignments exist', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValueOnce([
      {
        classId: 'class-active',
        class: {
          id: 'class-active',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
          section: { id: 'sec-1', name: 'Section A', gradeLevel: '7' },
        },
      },
    ]);
    mockDb.query.performanceSnapshots.findMany.mockResolvedValueOnce([
      {
        classId: 'class-active',
        isAtRisk: true,
        blendedScore: '62',
        thresholdApplied: '74',
      },
    ]);
    mockDb.query.interventionCases.findMany.mockResolvedValueOnce([
      {
        id: 'case-active',
        classId: 'class-active',
        status: 'active',
        openedAt: new Date('2026-02-01T00:00:00.000Z'),
        closedAt: null,
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValueOnce([]);

    const result = await service.getStudentEligibility('student-1');

    expect(result.eligibleClasses).toEqual([]);
    expect(result.paths).toEqual([]);
  });

  it('loads a completed student playlist without creating default assignments', async () => {
    const ensureDefaultAssignmentsSpy = jest.spyOn(
      service as any,
      'ensureDefaultAssignments',
    );
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'case-completed',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'completed',
        triggerScore: '70',
        thresholdApplied: '74',
        openedAt: new Date('2026-02-01T00:00:00.000Z'),
        closedAt: new Date('2026-02-10T00:00:00.000Z'),
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      });
    mockDb.query.interventionAssignments.findFirst.mockResolvedValue({
      id: 'assignment-1',
    });
    mockDb.query.lxpProgress.findFirst.mockResolvedValue({
      studentId: 'student-1',
      classId: 'class-1',
      xpTotal: 50,
      streakDays: 2,
      checkpointsCompleted: 2,
      lastActivityAt: new Date('2026-02-10T00:00:00.000Z'),
    });
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-1',
        assignmentType: 'lesson_review',
        checkpointLabel: 'Review Fractions',
        orderIndex: 1,
        isCompleted: true,
        completedAt: new Date('2026-02-09T00:00:00.000Z'),
        xpAwarded: 20,
        lesson: {
          id: 'lesson-1',
          title: 'Fractions',
          description: null,
          order: 1,
        },
        assessment: null,
      },
      {
        id: 'assignment-2',
        assignmentType: 'assessment_retry',
        checkpointLabel: 'Replay Quiz',
        orderIndex: 2,
        isCompleted: true,
        completedAt: new Date('2026-02-10T00:00:00.000Z'),
        xpAwarded: 30,
        lesson: null,
        assessment: {
          id: 'assessment-1',
          title: 'Quiz',
          description: null,
          passingScore: 75,
          dueDate: null,
          type: 'quiz',
        },
      },
    ]);

    const result = await service.getStudentPlaylist('student-1', 'class-1');

    expect(result.interventionCase.status).toBe('completed');
    expect(result.progress.completionPercent).toBe(100);
    expect(result.checkpoints).toHaveLength(2);
    expect(ensureDefaultAssignmentsSpy).not.toHaveBeenCalled();
  });

  it('includes guided assessment attempt summaries in the student playlist', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
      class: { id: 'class-1', isActive: true, section: { isActive: true } },
    });
    mockDb.query.interventionCases.findFirst.mockResolvedValueOnce({
      id: 'case-active',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      triggerScore: '64',
      thresholdApplied: '74',
      openedAt: new Date('2026-02-01T00:00:00.000Z'),
      closedAt: null,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    mockDb.query.interventionAssignments.findFirst.mockResolvedValue({
      id: 'assignment-guided',
    });
    mockDb.query.lxpProgress.findFirst.mockResolvedValue({
      studentId: 'student-1',
      classId: 'class-1',
      xpTotal: 30,
      streakDays: 1,
      checkpointsCompleted: 0,
      lastActivityAt: null,
    });
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-guided',
        assignmentType: 'guided_assessment',
        checkpointLabel: 'AI guided assessment: Fractions recovery',
        orderIndex: 1,
        isCompleted: false,
        completedAt: null,
        xpAwarded: 30,
        lesson: null,
        assessment: null,
        generatedRemedialLesson: null,
        generatedGuidedAssessment: {
          id: 'guided-1',
          title: 'Fractions recovery',
          description: 'Guided practice',
          weakConcepts: ['Fractions'],
          sourceAssessmentId: 'assessment-1',
          sourceReferences: [],
          formativeSummary: 'Keep practicing',
          questions: [],
          approvalStatus: 'approved',
          approvedAt: new Date('2026-02-02T00:00:00.000Z'),
          rejectedAt: null,
        },
      },
    ]);
    mockDb.query.generatedGuidedAssessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'attempt-1',
        assignmentId: 'assignment-guided',
        studentId: 'student-1',
        attemptNumber: 1,
        status: 'submitted',
        score: 58,
        correctCount: 3,
        totalQuestions: 5,
        submittedAt: new Date('2026-02-03T00:00:00.000Z'),
        startedAt: new Date('2026-02-03T00:00:00.000Z'),
      },
      {
        id: 'attempt-2',
        assignmentId: 'assignment-guided',
        studentId: 'student-1',
        attemptNumber: 2,
        status: 'submitted',
        score: 82,
        correctCount: 4,
        totalQuestions: 5,
        submittedAt: new Date('2026-02-04T00:00:00.000Z'),
        startedAt: new Date('2026-02-04T00:00:00.000Z'),
      },
    ]);
    mockDb.query.assessments.findFirst.mockResolvedValue({
      passingScore: '75',
    });

    const result = await service.getStudentPlaylist('student-1', 'class-1');
    const guidedCheckpoint = result.checkpoints[0];

    expect(guidedCheckpoint.guidedAttemptSummary).toMatchObject({
      maxAttempts: 3,
      attemptsUsed: 2,
      remainingAttempts: 1,
      canRetry: true,
      isLocked: false,
      passingScore: 75,
      passed: true,
      bestAttemptId: 'attempt-2',
      bestScorePercent: 82,
      latestScorePercent: 82,
    });
    expect(guidedCheckpoint.guidedAttemptSummary?.attempts).toEqual([
      expect.objectContaining({ attemptNumber: 1, scorePercent: 58 }),
      expect.objectContaining({ attemptNumber: 2, scorePercent: 82 }),
    ]);
  });

  it('loads a completed student overview without creating default assignments', async () => {
    const ensureDefaultAssignmentsSpy = jest.spyOn(
      service as any,
      'ensureDefaultAssignments',
    );
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'case-completed',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'completed',
        triggerScore: '70',
        thresholdApplied: '74',
        openedAt: new Date('2026-02-01T00:00:00.000Z'),
        closedAt: new Date('2026-02-10T00:00:00.000Z'),
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      });
    mockDb.query.interventionAssignments.findFirst.mockResolvedValue({
      id: 'assignment-1',
    });
    mockDb.query.performanceSnapshots.findFirst.mockResolvedValue({
      blendedScore: '82',
      thresholdApplied: '74',
      isAtRisk: false,
      lastComputedAt: new Date('2026-02-10T00:00:00.000Z'),
    });
    mockDb.query.lxpProgress.findFirst.mockResolvedValue({
      studentId: 'student-1',
      classId: 'class-1',
      xpTotal: 50,
      streakDays: 2,
      checkpointsCompleted: 2,
      lastActivityAt: new Date('2026-02-10T00:00:00.000Z'),
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
        blendedScore: '82',
        thresholdApplied: '74',
        isAtRisk: false,
        lastComputedAt: new Date('2026-02-10T00:00:00.000Z'),
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-1',
        assignmentType: 'lesson_review',
        checkpointLabel: 'Review Fractions',
        orderIndex: 1,
        isCompleted: true,
        completedAt: new Date('2026-02-09T00:00:00.000Z'),
        xpAwarded: 20,
        lesson: {
          id: 'lesson-1',
          title: 'Fractions Refresher',
          description: 'Completed drill.',
          order: 1,
        },
        assessment: null,
      },
    ]);

    const result = await service.getStudentOverview('student-1', 'class-1');

    expect(result.interventionStatus.status).toBe('completed');
    expect(result.progress.completionPercent).toBe(100);
    expect(result.recommendedAction).toBeNull();
    expect(ensureDefaultAssignmentsSpy).not.toHaveBeenCalled();
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

  it('marks path-score regeneration cases as AI-plan eligible in the teacher queue', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionCases.findMany.mockResolvedValue([
      {
        id: 'case-regenerated',
        studentId: 'student-1',
        classId: 'class-1',
        status: 'active',
        openedAt: new Date('2026-01-09'),
        triggerSource: 'path_score_below_threshold',
        triggerScore: '58',
        thresholdApplied: '60',
        student: {
          id: 'student-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
        },
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([]);
    mockDb.query.lxpProgress.findMany.mockResolvedValue([]);
    mockDb.query.performanceSnapshots.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        isAtRisk: false,
        blendedScore: '82',
        thresholdApplied: '74',
      },
    ]);

    const result = await service.getTeacherQueue('class-1', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(result.queue[0]).toMatchObject({
      id: 'case-regenerated',
      isCurrentlyAtRisk: false,
      latestBlendedScore: 82,
      aiPlanEligible: true,
      aiPlanEligibilityReason: 'path_score_below_threshold',
    });
  });

  it('aggregates pending intervention counts across teacher classes', async () => {
    mockDb.query.classes.findMany.mockResolvedValue([
      {
        id: 'class-1',
        subjectName: 'Mathematics',
        subjectCode: 'MATH-7',
      },
      {
        id: 'class-2',
        subjectName: 'Science',
        subjectCode: 'SCI-7',
      },
    ]);
    mockDb.query.interventionCases.findMany.mockResolvedValue([
      { id: 'case-1', classId: 'class-1' },
      { id: 'case-2', classId: 'class-1' },
    ]);

    const result = await service.getTeacherPendingInterventionCount({
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(result).toEqual({
      pendingCount: 2,
      classBreakdown: [
        {
          classId: 'class-1',
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          pendingCount: 2,
        },
      ],
    });
  });

  it('returns rich intervention case detail with weak concepts and transitions', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      openedAt: new Date('2026-03-01T00:00:00.000Z'),
      closedAt: null,
      triggerScore: '62',
      thresholdApplied: '74',
      note: 'Needs sustained support',
      student: {
        id: 'student-1',
        firstName: 'Liam',
        lastName: 'Navarro',
        email: 'liam@example.com',
      },
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-1',
        assignmentType: 'lesson_review',
        checkpointLabel: 'Review quadratic forms',
        orderIndex: 1,
        isCompleted: false,
        completedAt: null,
        xpAwarded: 20,
        lesson: {
          id: 'lesson-1',
          title: 'Quadratic Expressions Refresher',
          description: 'Review fundamentals.',
        },
        assessment: null,
      },
    ]);
    mockDb.query.lxpProgress.findFirst.mockResolvedValue({
      xpTotal: 20,
      streakDays: 1,
      checkpointsCompleted: 0,
      lastActivityAt: null,
    });
    mockDb.query.performanceSnapshots.findFirst.mockResolvedValue({
      assessmentAverage: '58',
      classRecordAverage: '66',
      blendedScore: '62',
      isAtRisk: true,
      thresholdApplied: '74',
      lastComputedAt: new Date('2026-03-02T00:00:00.000Z'),
    });
    mockDb.query.studentConceptMastery.findMany.mockResolvedValue([
      {
        conceptKey: 'quadratic formulas',
        evidenceCount: 3,
        errorCount: 3,
        masteryScore: 40,
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      },
    ]);
    mockDb.query.performanceLogs.findMany.mockResolvedValue([
      {
        id: 'log-1',
        previousIsAtRisk: false,
        currentIsAtRisk: true,
        blendedScore: '62',
        thresholdApplied: '74',
        triggerSource: 'assessment_posted',
        createdAt: new Date('2026-03-02T01:00:00.000Z'),
      },
    ]);

    const result = await service.getTeacherInterventionCaseDetail('case-1', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(result).toMatchObject({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      completion: {
        totalCheckpoints: 1,
        completedCheckpoints: 0,
        completionPercent: 0,
      },
      weakConcepts: [
        expect.objectContaining({
          concept: 'quadratic formulas',
          masteryScore: 40,
        }),
      ],
      recentRiskTransitions: [
        expect.objectContaining({
          id: 'log-1',
          currentIsAtRisk: true,
        }),
      ],
      links: {
        performancePage:
          '/dashboard/teacher/performance?classId=class-1&studentId=student-1',
      },
    });
  });

  it('builds the student overview with lesson-first recommendation and evidence-backed weak focus entries', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
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
    mockDb.query.interventionAssignments.findFirst.mockResolvedValue({
      id: 'assignment-lesson',
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
          description:
            '<p>Revisit <strong>basic fraction</strong> operations.</p>',
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
          description: '<p>Retry the <strong>fractions</strong> quiz.</p>',
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

  it('returns teacher intervention history with guided scores and regeneration eligibility', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionCases.findMany.mockResolvedValue([
      {
        id: 'case-low',
        studentId: 'student-1',
        classId: 'class-1',
        status: 'completed',
        openedAt: new Date('2026-01-01T00:00:00.000Z'),
        closedAt: new Date('2026-01-05T00:00:00.000Z'),
        triggerScore: '55',
        thresholdApplied: '74',
        note: 'Finished first remedial path',
        student: {
          id: 'student-1',
          firstName: 'Liam',
          lastName: 'Navarro',
          email: 'liam@example.com',
        },
      },
      {
        id: 'case-pass',
        studentId: 'student-2',
        classId: 'class-1',
        status: 'completed',
        openedAt: new Date('2026-01-06T00:00:00.000Z'),
        closedAt: new Date('2026-01-08T00:00:00.000Z'),
        triggerScore: '57',
        thresholdApplied: '74',
        note: null,
        student: {
          id: 'student-2',
          firstName: 'Mina',
          lastName: 'Santos',
          email: 'mina@example.com',
        },
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-guided-low',
        caseId: 'case-low',
        assignmentType: 'guided_assessment',
        checkpointLabel: 'AI guided assessment: Fractions recovery',
        orderIndex: 1,
        isCompleted: true,
        completedAt: new Date('2026-01-05T00:00:00.000Z'),
        xpAwarded: 30,
        lesson: null,
        assessment: null,
        generatedRemedialLesson: null,
        generatedGuidedAssessment: {
          id: 'guided-low',
          title: 'Fractions recovery',
          description: 'Guided practice',
          weakConcepts: ['Fractions'],
          sourceAssessmentId: 'assessment-1',
          sourceReferences: [],
          formativeSummary: 'Needs more work',
          questions: [],
          approvalStatus: 'approved',
          approvedAt: new Date('2026-01-04T00:00:00.000Z'),
          rejectedAt: null,
        },
      },
      {
        id: 'assignment-guided-pass',
        caseId: 'case-pass',
        assignmentType: 'guided_assessment',
        checkpointLabel: 'AI guided assessment: Decimals recovery',
        orderIndex: 1,
        isCompleted: true,
        completedAt: new Date('2026-01-08T00:00:00.000Z'),
        xpAwarded: 30,
        lesson: null,
        assessment: null,
        generatedRemedialLesson: null,
        generatedGuidedAssessment: {
          id: 'guided-pass',
          title: 'Decimals recovery',
          description: 'Guided practice',
          weakConcepts: ['Decimals'],
          sourceAssessmentId: 'assessment-2',
          sourceReferences: [],
          formativeSummary: 'Recovered',
          questions: [],
          approvalStatus: 'approved',
          approvedAt: new Date('2026-01-07T00:00:00.000Z'),
          rejectedAt: null,
        },
      },
    ]);
    mockDb.query.generatedGuidedAssessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'attempt-low',
        caseId: 'case-low',
        assignmentId: 'assignment-guided-low',
        score: 58,
        correctCount: 3,
        totalQuestions: 5,
        submittedAt: new Date('2026-01-05T01:00:00.000Z'),
      },
      {
        id: 'attempt-pass',
        caseId: 'case-pass',
        assignmentId: 'assignment-guided-pass',
        score: 60,
        correctCount: 3,
        totalQuestions: 5,
        submittedAt: new Date('2026-01-08T01:00:00.000Z'),
      },
    ]);

    const result = await service.getTeacherInterventionHistory('class-1', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(result.scoreThreshold).toBe(60);
    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toMatchObject({
      id: 'case-low',
      pathScore: {
        scorePercent: 58,
        source: 'guided_assessment',
        assignmentId: 'assignment-guided-low',
      },
      canRegenerate: true,
    });
    expect(result.history[0].assignments[0]).toMatchObject({
      id: 'assignment-guided-low',
      score: {
        scorePercent: 58,
        source: 'guided_assessment',
      },
      guidedAssessment: {
        title: 'Fractions recovery',
      },
    });
    expect(result.history[1]).toMatchObject({
      id: 'case-pass',
      pathScore: {
        scorePercent: 60,
        source: 'guided_assessment',
      },
      canRegenerate: false,
    });
  });

  it('falls back to the latest submitted assessment retry score for history path score', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionCases.findMany.mockResolvedValue([
      {
        id: 'case-retry',
        studentId: 'student-1',
        classId: 'class-1',
        status: 'completed',
        openedAt: new Date('2026-01-01T00:00:00.000Z'),
        closedAt: new Date('2026-01-04T00:00:00.000Z'),
        triggerScore: '53',
        thresholdApplied: '74',
        note: null,
        student: {
          id: 'student-1',
          firstName: 'Liam',
          lastName: 'Navarro',
          email: 'liam@example.com',
        },
      },
    ]);
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-retry',
        caseId: 'case-retry',
        assignmentType: 'assessment_retry',
        assessmentId: 'assessment-1',
        checkpointLabel: 'Retry: Fractions quiz',
        orderIndex: 1,
        isCompleted: true,
        completedAt: new Date('2026-01-04T00:00:00.000Z'),
        xpAwarded: 30,
        lesson: null,
        assessment: {
          id: 'assessment-1',
          title: 'Fractions quiz',
          type: 'quiz',
          passingScore: 60,
          dueDate: null,
        },
        generatedRemedialLesson: null,
        generatedGuidedAssessment: null,
      },
    ]);
    mockDb.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'retry-old',
        studentId: 'student-1',
        assessmentId: 'assessment-1',
        score: 45,
        passed: false,
        submittedAt: new Date('2026-01-03T00:00:00.000Z'),
      },
      {
        id: 'retry-latest',
        studentId: 'student-1',
        assessmentId: 'assessment-1',
        score: 59,
        passed: false,
        submittedAt: new Date('2026-01-04T00:00:00.000Z'),
      },
    ]);

    const result = await service.getTeacherInterventionHistory('class-1', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(result.history[0]).toMatchObject({
      id: 'case-retry',
      pathScore: {
        scorePercent: 59,
        source: 'assessment_retry',
        attemptId: 'retry-latest',
      },
      canRegenerate: true,
    });
    expect(result.history[0].assignments[0].score).toMatchObject({
      scorePercent: 59,
      source: 'assessment_retry',
      passed: false,
    });
  });

  it('falls back to assessment retry when no incomplete lesson remains', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
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
    mockDb.query.interventionAssignments.findFirst.mockResolvedValue({
      id: 'assignment-assessment',
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
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
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
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'pending-case-1' });

    await expect(
      service.getStudentOverview('student-1', 'class-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks playlist access when intervention is pending approval', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'pending-case-1' });

    await expect(
      service.getStudentPlaylist('student-1', 'class-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks playlist access when intervention is active but has no teacher-assigned path yet', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce({
        id: 'active-case-1',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'active',
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'active-case-1',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'active',
      });
    mockDb.query.interventionAssignments.findFirst.mockResolvedValue(null);

    await expect(
      service.getStudentPlaylist('student-1', 'class-1'),
    ).rejects.toThrow(
      'Learners Path is only available after your teacher assigns checkpoints.',
    );
  });

  it('blocks overview access when intervention is active but has no teacher-assigned path yet', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce({
        id: 'active-case-1',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'active',
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'active-case-1',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'active',
      });
    mockDb.query.interventionAssignments.findFirst.mockResolvedValue(null);
    mockDb.query.performanceSnapshots.findFirst.mockResolvedValue({
      isAtRisk: true,
      blendedScore: '62',
      thresholdApplied: '74',
      lastComputedAt: new Date('2026-02-05T00:00:00.000Z'),
    });

    await expect(
      service.getStudentOverview('student-1', 'class-1'),
    ).rejects.toThrow(
      'Learners Path is only available after your teacher assigns checkpoints.',
    );
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

  it('lists system evaluations for admins and applies module filter', async () => {
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
      { userId: 'admin-1', roles: ['admin'] },
      { targetModule: 'lxp' },
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
      {},
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
        { userId: 'admin-1', roles: ['admin'] },
        { targetModule: 'not-a-real-module' as never },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects system evaluation listing for non-admin users', async () => {
    await expect(
      service.listSystemEvaluations(
        { userId: 'student-1', roles: ['student'] },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.listSystemEvaluations(
        { userId: 'teacher-1', roles: ['teacher'] },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns only assigned system evaluation forms for the current student respondent', async () => {
    mockDb.query.systemEvaluationAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-system',
        status: 'pending',
        submittedAt: null,
        campaign: {
          id: 'campaign-system',
          formType: 'system',
          targetModule: 'overall',
          title: 'System Pulse',
          audienceRole: 'student',
          classId: null,
          startsAt: new Date('2026-05-01T00:00:00.000Z'),
          endsAt: new Date('2026-05-20T00:00:00.000Z'),
          status: 'active',
          class: null,
        },
      },
      {
        id: 'assignment-ja',
        status: 'pending',
        submittedAt: null,
        campaign: {
          id: 'campaign-ja',
          formType: 'ja_hub',
          targetModule: 'ai_mentor',
          title: 'JA Hub Pulse',
          audienceRole: 'student',
          classId: null,
          startsAt: new Date('2026-05-01T00:00:00.000Z'),
          endsAt: new Date('2026-05-20T00:00:00.000Z'),
          status: 'active',
          class: null,
        },
      },
    ]);

    const result = await service.getMySystemEvaluationDashboard({
      userId: 'student-1',
      roles: ['student'],
    });

    expect(result.pending).toHaveLength(2);
    expect(result.pending.map((item) => item.formType)).toEqual([
      'system',
      'ja_hub',
    ]);
    expect(result.pending[0].questions).toHaveLength(5);
  });

  it('submits an assigned system evaluation and accepts explicit zero-star ratings', async () => {
    mockDb.query.systemEvaluationAssignments.findFirst.mockResolvedValue({
      id: 'assignment-1',
      respondentId: 'student-1',
      respondentRole: 'student',
      status: 'pending',
      campaign: {
        id: 'campaign-1',
        formType: 'system',
        targetModule: 'overall',
        status: 'active',
        startsAt: new Date('2026-05-01T00:00:00.000Z'),
        endsAt: new Date('2026-05-20T00:00:00.000Z'),
        title: 'System Pulse',
      },
    });
    const created = {
      id: 'evaluation-1',
      targetModule: 'overall',
      campaignId: 'campaign-1',
      submittedBy: 'student-1',
    };
    const returning = jest.fn().mockResolvedValue([created]);
    const values = jest.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });
    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    const result = await service.submitAssignedSystemEvaluation(
      'assignment-1',
      { userId: 'student-1', roles: ['student'] },
      {
        questionRatings: {
          system_navigation: 0,
          system_features: 5,
          system_speed: 4,
          system_efficiency: 5,
          system_satisfaction: 4,
        },
        feedback: 'Zero should be valid when intentional.',
      },
    );

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'campaign-1',
        targetModule: 'overall',
        usabilityScore: 0,
        functionalityScore: 5,
        performanceScore: 4,
        satisfactionScore: 4,
        overallScore: 4,
      }),
    );
    expect(result).toEqual(created);
  });

  it('rejects duplicate assigned system evaluation submissions', async () => {
    mockDb.query.systemEvaluationAssignments.findFirst.mockResolvedValue({
      id: 'assignment-1',
      respondentId: 'student-1',
      respondentRole: 'student',
      status: 'submitted',
      campaign: {
        id: 'campaign-1',
        formType: 'system',
        targetModule: 'overall',
        status: 'active',
        startsAt: new Date('2026-05-01T00:00:00.000Z'),
        endsAt: new Date('2026-05-20T00:00:00.000Z'),
      },
    });

    await expect(
      service.submitAssignedSystemEvaluation(
        'assignment-1',
        { userId: 'student-1', roles: ['student'] },
        {
          questionRatings: {
            system_navigation: 5,
            system_features: 5,
            system_speed: 5,
            system_efficiency: 5,
            system_satisfaction: 5,
          },
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates class-scoped active student campaigns for a teacher-owned class', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
      subjectCode: 'MATH-7',
      subjectName: 'Mathematics 7',
    });
    mockDb.query.enrollments.findMany.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ]);
    const campaign = {
      id: 'campaign-1',
      formType: 'system',
      targetModule: 'overall',
      audienceRole: 'student',
      classId: 'class-1',
      status: 'active',
    };
    mockDb.insert
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([campaign]),
        }),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
        }),
      });

    const result = await service.createSystemEvaluationCampaign(
      { userId: 'teacher-1', roles: ['teacher'] },
      {
        formType: 'system',
        audienceRole: 'student',
        classId: 'class-1',
        title: 'System Pulse',
        startsAt: '2026-05-01T00:00:00.000Z',
        endsAt: '2026-05-20T00:00:00.000Z',
        status: 'active',
      },
    );

    expect(result.assignmentCount).toBe(2);
  });

  it('rejects teacher-created campaigns outside the teacher owned classes', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'other-teacher',
    });

    await expect(
      service.createSystemEvaluationCampaign(
        { userId: 'teacher-1', roles: ['teacher'] },
        {
          formType: 'system',
          audienceRole: 'student',
          classId: 'class-1',
          title: 'System Pulse',
          startsAt: '2026-05-01T00:00:00.000Z',
          endsAt: '2026-05-20T00:00:00.000Z',
          status: 'active',
        },
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
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          groupBy: jest
            .fn()
            .mockResolvedValue([{ assessmentId: 'assessment-1' }]),
        }),
      }),
    });
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

  it('blocks intervention assignment for assessment retries without a failed submitted attempt', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      note: null,
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.assessments.findMany.mockResolvedValue([
      { id: 'assessment-1' },
    ]);
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          groupBy: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(
      service.assignIntervention(
        'case-1',
        { assessmentIds: ['assessment-1'] },
        { userId: 'teacher-1', roles: ['teacher'] },
      ),
    ).rejects.toThrow(
      'Assessment retry checkpoints require at least one failed submitted attempt from the student before they can be assigned.',
    );

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('blocks intervention assignment when case is pending approval', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'pending',
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });

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
    expect((service as any).ensureDefaultAssignments).not.toHaveBeenCalled();
    expect((service as any).getOrCreateProgress).not.toHaveBeenCalled();
  });

  it('creates a new active intervention cycle when a completed path score is below threshold', async () => {
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce({
        id: 'case-completed',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'completed',
        note: 'Completed with low score',
      })
      .mockResolvedValueOnce(null);
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-guided-low',
        caseId: 'case-completed',
        assignmentType: 'guided_assessment',
        checkpointLabel: 'AI guided assessment: Fractions recovery',
        orderIndex: 1,
        isCompleted: true,
        completedAt: new Date('2026-01-05T00:00:00.000Z'),
        xpAwarded: 30,
        lesson: null,
        assessment: null,
        generatedRemedialLesson: null,
        generatedGuidedAssessment: {
          id: 'guided-low',
          title: 'Fractions recovery',
          description: 'Guided practice',
          weakConcepts: ['Fractions'],
          sourceAssessmentId: 'assessment-1',
          sourceReferences: [],
          formativeSummary: 'Needs more work',
          questions: [],
          approvalStatus: 'approved',
          approvedAt: new Date('2026-01-04T00:00:00.000Z'),
          rejectedAt: null,
        },
      },
    ]);
    mockDb.query.generatedGuidedAssessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'attempt-low',
        caseId: 'case-completed',
        assignmentId: 'assignment-guided-low',
        score: 58,
        correctCount: 3,
        totalQuestions: 5,
        submittedAt: new Date('2026-01-05T01:00:00.000Z'),
      },
    ]);

    const created = {
      id: 'case-new',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      openedAt: new Date('2026-01-06T00:00:00.000Z'),
      triggerScore: '58',
      thresholdApplied: '60',
      student: null,
    };
    const returning = jest.fn().mockResolvedValue([created]);
    const values = jest.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });
    jest.spyOn(service, 'getTeacherInterventionCase').mockResolvedValue({
      id: 'case-new',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
    } as any);

    const result = await service.regenerateInterventionPath('case-completed', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'student-1',
        classId: 'class-1',
        status: 'active',
        triggerSource: 'path_score_below_threshold',
        triggerScore: '58',
        thresholdApplied: '60',
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'teacher-1',
        action: 'lxp.intervention.regenerated',
        targetType: 'intervention_case',
        targetId: 'case-new',
        metadata: expect.objectContaining({
          sourceCaseId: 'case-completed',
          pathScore: 58,
          scoreThreshold: 60,
        }),
      }),
    );
    expect(result).toMatchObject({
      sourceCaseId: 'case-completed',
      reusedExisting: false,
      scoreThreshold: 60,
      pathScore: { scorePercent: 58 },
      case: { id: 'case-new' },
    });
  });

  it('reuses an existing open case instead of duplicating regeneration cycles', async () => {
    mockDb.query.interventionCases.findFirst
      .mockResolvedValueOnce({
        id: 'case-completed',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'completed',
        note: null,
      })
      .mockResolvedValueOnce({
        id: 'case-open',
        classId: 'class-1',
        studentId: 'student-1',
        status: 'pending',
      });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-guided-low',
        caseId: 'case-completed',
        assignmentType: 'guided_assessment',
        checkpointLabel: 'AI guided assessment: Fractions recovery',
        orderIndex: 1,
        isCompleted: true,
        completedAt: new Date('2026-01-05T00:00:00.000Z'),
        xpAwarded: 30,
        lesson: null,
        assessment: null,
        generatedRemedialLesson: null,
        generatedGuidedAssessment: null,
      },
    ]);
    mockDb.query.generatedGuidedAssessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'attempt-low',
        caseId: 'case-completed',
        assignmentId: 'assignment-guided-low',
        score: 58,
        correctCount: 3,
        totalQuestions: 5,
        submittedAt: new Date('2026-01-05T01:00:00.000Z'),
      },
    ]);
    jest.spyOn(service, 'getTeacherInterventionCase').mockResolvedValue({
      id: 'case-open',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'pending',
    } as any);

    const result = await service.regenerateInterventionPath('case-completed', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      reusedExisting: true,
      case: { id: 'case-open' },
    });
  });

  it('blocks path regeneration when completed score is missing or not below threshold', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-completed',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'completed',
      note: null,
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([
      {
        id: 'assignment-guided-pass',
        caseId: 'case-completed',
        assignmentType: 'guided_assessment',
        checkpointLabel: 'AI guided assessment: Fractions recovery',
        orderIndex: 1,
        isCompleted: true,
        completedAt: new Date('2026-01-05T00:00:00.000Z'),
        xpAwarded: 30,
        lesson: null,
        assessment: null,
        generatedRemedialLesson: null,
        generatedGuidedAssessment: null,
      },
    ]);
    mockDb.query.generatedGuidedAssessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'attempt-pass',
        caseId: 'case-completed',
        assignmentId: 'assignment-guided-pass',
        score: 60,
        correctCount: 3,
        totalQuestions: 5,
        submittedAt: new Date('2026-01-05T01:00:00.000Z'),
      },
    ]);

    await expect(
      service.regenerateInterventionPath('case-completed', {
        userId: 'teacher-1',
        roles: ['teacher'],
      }),
    ).rejects.toThrow('Only paths scored below 60% can be regenerated.');

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('blocks path regeneration when the completed source has no submitted score', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-completed',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'completed',
      note: null,
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.interventionAssignments.findMany.mockResolvedValue([]);

    await expect(
      service.regenerateInterventionPath('case-completed', {
        userId: 'teacher-1',
        roles: ['teacher'],
      }),
    ).rejects.toThrow(
      'A submitted path assessment score is required before regenerating this path.',
    );

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('blocks path regeneration for non-completed source cases', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-active',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'active',
      note: null,
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });

    await expect(
      service.regenerateInterventionPath('case-active', {
        userId: 'teacher-1',
        roles: ['teacher'],
      }),
    ).rejects.toThrow('Only completed intervention paths can be regenerated.');

    expect(
      mockDb.query.interventionAssignments.findMany,
    ).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('blocks path regeneration when the teacher does not own the class', async () => {
    mockDb.query.interventionCases.findFirst.mockResolvedValue({
      id: 'case-completed',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'completed',
      note: null,
    });
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-owner',
    });

    await expect(
      service.regenerateInterventionPath('case-completed', {
        userId: 'teacher-other',
        roles: ['teacher'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      mockDb.query.interventionAssignments.findMany,
    ).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
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
        note: 'Student has late work backlog\nAuto-resolved because student is no longer at-risk.',
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
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'assignment-1', isCompleted: false }),
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
        note: 'Teacher assigned checkpoint sequence\nAuto-completed after finishing all Learners Path checkpoints.',
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
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'assignment-retry', isCompleted: false }),
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'assignment-retry', isCompleted: true }]),
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

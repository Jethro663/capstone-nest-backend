import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { sql } from 'drizzle-orm';
import { PerformanceService } from './performance.service';
import { DatabaseService } from '../../database/database.service';
import { PerformanceStatusChangedEvent } from '../../common/events';
import { AuditService } from '../audit/audit.service';
import { PerformanceSnapshotReadService } from './performance-snapshot-read.service';
import { ClassRecordService } from '../class-record/class-record.service';

function buildMockDb() {
  const subqueryWhere = jest.fn((condition: any) => {
    const query = sql`select 1`;
    (query as any).__condition = condition;
    return query;
  });
  const innerJoin = jest.fn().mockReturnValue({ where: subqueryWhere });
  const from = jest.fn().mockReturnValue({ innerJoin });
  const select = jest.fn().mockReturnValue({ from });

  return {
    query: {
      classes: { findFirst: jest.fn() },
      assessments: { findFirst: jest.fn(), findMany: jest.fn() },
      assessmentResponses: { findMany: jest.fn() },
      assessmentAttempts: { findMany: jest.fn() },
      classRecords: { findMany: jest.fn() },
      studentConceptMastery: { findMany: jest.fn() },
      aiGenerationOutputs: { findMany: jest.fn() },
      interventionCases: { findFirst: jest.fn(), findMany: jest.fn() },
      interventionAssignments: { findMany: jest.fn() },
      generatedGuidedAssessmentAttempts: { findMany: jest.fn() },
      performanceSnapshots: { findFirst: jest.fn(), findMany: jest.fn() },
      performanceLogs: { findMany: jest.fn() },
      enrollments: { findMany: jest.fn() },
      users: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    execute: jest.fn(),
    select,
    __subqueryWhere: subqueryWhere,
  };
}

function collectSqlParams(node: any): any[] {
  const params: any[] = [];
  const stack = [node];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }

    if ('queryChunks' in current && Array.isArray(current.queryChunks)) {
      stack.push(...current.queryChunks);
      continue;
    }

    if ('value' in current && !Array.isArray(current.value)) {
      params.push(current.value);
    }
  }

  return params;
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
  let auditService: { log: jest.Mock };
  let snapshotReadService: { findForStudentClasses: jest.Mock };
  let classRecordService: { getCanonicalStudentStanding: jest.Mock };

  beforeEach(async () => {
    db = buildMockDb();
    eventEmitter = { emit: jest.fn() } as any;
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    snapshotReadService = {
      findForStudentClasses: jest.fn().mockResolvedValue(new Map()),
    };
    classRecordService = {
      getCanonicalStudentStanding: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        { provide: DatabaseService, useValue: { db } },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AuditService, useValue: auditService },
        {
          provide: PerformanceSnapshotReadService,
          useValue: snapshotReadService,
        },
        { provide: ClassRecordService, useValue: classRecordService },
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
        id: 'record-1',
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
    classRecordService.getCanonicalStudentStanding.mockResolvedValue({
      overallGradePercent: 25,
    });
    db.query.performanceSnapshots.findFirst.mockResolvedValue(null);
    mockInsertReturning(db, [
      {
        id: 'snap-1',
        assessmentAverage: '75',
        classRecordAverage: '25',
        blendedScore: '25',
        assessmentSampleSize: 2,
        classRecordSampleSize: 2,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: '74',
        lastComputedAt: new Date(),
      },
    ]);
    mockInsertNoReturning(db);

    const result = await service.recomputeStudent(
      'class-1',
      'student-1',
      'manual_recompute',
    );

    expect(result.assessmentAverage).toBe(75);
    expect(result.classRecordAverage).toBe(25);
    expect(result.blendedScore).toBe(25);
    expect(result.isAtRisk).toBe(true);
    expect(result.thresholdApplied).toBe(74);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('recomputeStudent starts independent component reads in parallel', async () => {
    let resolveAssessment!: (value: {
      average: number;
      sampleSize: number;
    }) => void;
    let resolveClassRecord!: (value: {
      average: number;
      sampleSize: number;
    }) => void;
    const assessmentPromise = new Promise<{
      average: number;
      sampleSize: number;
    }>((resolve) => {
      resolveAssessment = resolve;
    });
    const classRecordPromise = new Promise<{
      average: number;
      sampleSize: number;
    }>((resolve) => {
      resolveClassRecord = resolve;
    });
    const assessmentRead = jest
      .spyOn(service as any, 'getAssessmentComponent')
      .mockReturnValue(assessmentPromise);
    const classRecordRead = jest
      .spyOn(service as any, 'getClassRecordComponent')
      .mockReturnValue(classRecordPromise);
    jest.spyOn(service as any, 'upsertSnapshot').mockResolvedValue({
      studentId: 'student-1',
      classId: 'class-1',
    });

    const recompute = service.recomputeStudent('class-1', 'student-1');
    await Promise.resolve();
    const bothReadsStarted =
      assessmentRead.mock.calls.length === 1 &&
      classRecordRead.mock.calls.length === 1;

    resolveAssessment({ average: 80, sampleSize: 2 });
    resolveClassRecord({ average: 70, sampleSize: 3 });
    await recompute;

    expect(bothReadsStarted).toBe(true);
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

    await service.recomputeStudent(
      'class-1',
      'student-1',
      'assessment_submitted',
    );

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

  it('recomputeStudent should emit performance.status.changed for a first at-risk snapshot', async () => {
    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        assessmentId: 'a1',
        score: 73,
        submittedAt: new Date('2026-03-07T10:00:00Z'),
        attemptNumber: 1,
        assessment: { classId: 'class-1' },
      },
    ]);
    db.query.classRecords.findMany.mockResolvedValue([]);
    db.query.performanceSnapshots.findFirst.mockResolvedValue(null);
    mockInsertReturning(db, [
      {
        id: 'snap-1',
        assessmentAverage: '73',
        classRecordAverage: null,
        blendedScore: '73',
        assessmentSampleSize: 1,
        classRecordSampleSize: 0,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: '74',
        lastComputedAt: new Date(),
      },
    ]);
    mockInsertNoReturning(db);

    await service.recomputeStudent(
      'class-1',
      'student-1',
      'assessment_submitted',
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      PerformanceStatusChangedEvent.eventName,
      expect.objectContaining({
        classId: 'class-1',
        studentId: 'student-1',
        previousIsAtRisk: null,
        currentIsAtRisk: true,
      }),
    );
  });

  it('recomputeStudent should emit performance.status.changed when an at-risk snapshot has no open intervention case', async () => {
    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        assessmentId: 'a1',
        score: 73,
        submittedAt: new Date('2026-03-07T10:00:00Z'),
        attemptNumber: 1,
        assessment: { classId: 'class-1' },
      },
    ]);
    db.query.classRecords.findMany.mockResolvedValue([]);
    db.query.performanceSnapshots.findFirst.mockResolvedValue({
      id: 'snap-1',
      isAtRisk: true,
    });
    db.query.interventionCases.findFirst.mockResolvedValue(null);
    mockUpdateReturning(db, [
      {
        id: 'snap-1',
        assessmentAverage: '73',
        classRecordAverage: null,
        blendedScore: '73',
        assessmentSampleSize: 1,
        classRecordSampleSize: 0,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: '74',
        lastComputedAt: new Date(),
      },
    ]);

    await service.recomputeStudent('class-1', 'student-1', 'manual_recompute');

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      PerformanceStatusChangedEvent.eventName,
      expect.objectContaining({
        classId: 'class-1',
        studentId: 'student-1',
        previousIsAtRisk: true,
        currentIsAtRisk: true,
      }),
    );
  });

  it('getClassSummary should return aggregated class metrics', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
      isActive: true,
      section: { id: 'section-1', isActive: true },
    });
    db.query.enrollments.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        student: {
          firstName: 'Alice',
          lastName: 'Lee',
          email: 'alice@test.com',
        },
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

    const summary = await service.getClassSummary('class-1', 'teacher-1', [
      'teacher',
    ]);

    expect(summary.totalStudents).toBe(2);
    expect(summary.atRiskCount).toBe(1);
    expect(summary.averages.blended).toBe(70.5);
    expect(summary.students[0].studentId).toBe('student-2');
  });

  it('getClassSummary should bulk recompute missing snapshots before building rows', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
      isActive: true,
      section: { id: 'section-1', isActive: true },
    });
    db.query.enrollments.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        student: {
          firstName: 'Alice',
          lastName: 'Lee',
          email: 'alice@test.com',
        },
      },
      {
        studentId: 'student-2',
        student: { firstName: 'Bob', lastName: 'Tan', email: 'bob@test.com' },
      },
    ]);
    db.query.performanceSnapshots.findMany
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([
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

    const bulkSpy = jest
      .spyOn(service as any, 'recomputeStudentsForClass')
      .mockResolvedValue({ recomputed: 1 });
    const singleSpy = jest
      .spyOn(service, 'recomputeStudent')
      .mockResolvedValue({
        id: 'snap-2',
        studentId: 'student-2',
        classId: 'class-1',
        assessmentAverage: 60,
        classRecordAverage: 64,
        blendedScore: 62,
        assessmentSampleSize: 3,
        classRecordSampleSize: 5,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: 74,
        lastComputedAt: new Date(),
      } as any);

    const summary = await service.getClassSummary('class-1', 'teacher-1', [
      'teacher',
    ]);

    expect(bulkSpy).toHaveBeenCalledWith(
      'class-1',
      ['student-2'],
      'view_refresh',
    );
    expect(singleSpy).not.toHaveBeenCalled();
    expect(summary.totalStudents).toBe(2);
    expect(summary.atRiskCount).toBe(1);
  });

  it('getClassSummary should enforce teacher ownership', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-99',
      isActive: true,
      section: { id: 'section-1', isActive: true },
    });

    await expect(
      service.getClassSummary('class-1', 'teacher-1', ['teacher']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('getInterventionQuizComparison should compare pre-intervention assessment averages with AI quiz averages', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
      isActive: true,
      section: { id: 'section-1', isActive: true },
    });
    db.query.assessments.findMany.mockResolvedValue([
      {
        id: 'assessment-1',
        title: 'Fractions Quiz',
        type: 'quiz',
        classRecordCategory: 'written_work',
        createdAt: new Date('2026-04-01T08:00:00Z'),
      },
      {
        id: 'assessment-2',
        title: 'Performance Task 1',
        type: 'assignment',
        classRecordCategory: 'performance_task',
        createdAt: new Date('2026-04-05T08:00:00Z'),
      },
    ]);
    db.query.interventionCases.findMany.mockResolvedValue([
      {
        id: 'case-1',
        studentId: 'student-1',
        status: 'active',
        openedAt: new Date('2026-05-01T08:00:00Z'),
        student: {
          id: 'student-1',
          firstName: 'Ana',
          lastName: 'Reyes',
          email: 'ana@test.com',
        },
      },
    ]);
    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'attempt-before-2',
        studentId: 'student-1',
        assessmentId: 'assessment-2',
        score: 64,
        submittedAt: new Date('2026-04-29T09:00:00Z'),
        attemptNumber: 1,
      },
      {
        id: 'attempt-before-1',
        studentId: 'student-1',
        assessmentId: 'assessment-1',
        score: 54,
        submittedAt: new Date('2026-04-28T09:00:00Z'),
        attemptNumber: 1,
      },
    ]);
    db.query.generatedGuidedAssessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'guided-attempt-1',
        caseId: 'case-1',
        studentId: 'student-1',
        assignmentId: 'assignment-guided-1',
        guidedAssessmentId: 'guided-1',
        score: 78,
        submittedAt: new Date('2026-05-03T09:00:00Z'),
        totalQuestions: 5,
        correctCount: 4,
        guidedAssessment: {
          id: 'guided-1',
          title: 'Fractions Recovery Quiz',
          sourceAssessmentId: 'assessment-1',
        },
      },
      {
        id: 'guided-attempt-2',
        caseId: 'case-1',
        studentId: 'student-1',
        assignmentId: 'assignment-guided-2',
        guidedAssessmentId: 'guided-2',
        score: 82,
        submittedAt: new Date('2026-05-04T09:00:00Z'),
        totalQuestions: 5,
        correctCount: 4,
        guidedAssessment: {
          id: 'guided-2',
          title: 'Mixed Recovery Quiz',
          sourceAssessmentId: null,
        },
      },
    ]);

    const result = await service.getInterventionQuizComparison(
      'class-1',
      'teacher-1',
      ['teacher'],
    );

    expect(result.classId).toBe('class-1');
    expect(result.count).toBe(1);
    expect(result.improvedCount).toBe(1);
    expect(result.awaitingRetryCount).toBe(0);
    expect(result.filterOptions).toEqual([
      expect.objectContaining({ id: 'all', label: 'All assessments' }),
      expect.objectContaining({
        id: 'assessment-1',
        label: 'Fractions Quiz',
        classRecordCategory: 'written_work',
      }),
      expect.objectContaining({
        id: 'assessment-2',
        label: 'Performance Task 1',
        classRecordCategory: 'performance_task',
      }),
    ]);
    expect(result.comparisons[0]).toMatchObject({
      caseId: 'case-1',
      studentId: 'student-1',
      assessmentId: 'all',
      assessmentTitle: 'All assessments',
      comparisonScope: 'class_average',
      beforeAttemptId: null,
      beforeScorePercent: 59,
      beforeSampleSize: 2,
      afterAttemptId: null,
      afterScorePercent: 80,
      afterSampleSize: 2,
      deltaScorePercent: 21,
      trend: 'improved',
    });
    expect(
      result.comparisons.find((entry) => entry.filterId === 'assessment-1'),
    ).toMatchObject({
      assessmentId: 'assessment-1',
      assessmentTitle: 'Fractions Quiz',
      comparisonScope: 'assessment',
      beforeAttemptId: 'attempt-before-1',
      beforeScorePercent: 54,
      beforeSampleSize: 1,
      afterAttemptId: 'guided-attempt-1',
      afterScorePercent: 78,
      afterSampleSize: 1,
      deltaScorePercent: 24,
      trend: 'improved',
    });
  });

  it('recomputeClass should write manual recompute audit metadata', async () => {
    jest
      .spyOn(service as any, 'assertClassAccess')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'loadEnrolledStudents')
      .mockResolvedValue([
        { studentId: 'student-1' },
        { studentId: 'student-2' },
      ]);
    jest
      .spyOn(service as any, 'recomputeStudentsForClass')
      .mockResolvedValue(undefined);
    jest.spyOn(service, 'getClassSummary').mockResolvedValue({
      classId: 'class-1',
      threshold: 74,
      totalStudents: 2,
      studentsWithData: 2,
      atRiskCount: 1,
      atRiskRate: 50,
      averages: {
        blended: 70,
        assessment: 72,
        classRecord: 68,
      },
      students: [],
    });

    const result = await service.recomputeClass('class-1', 'teacher-1', [
      'teacher',
    ]);

    expect(result).toEqual({
      classId: 'class-1',
      recomputed: 2,
      atRiskCount: 1,
      totalStudents: 2,
    });
    expect(auditService.log).toHaveBeenCalledWith({
      actorId: 'teacher-1',
      action: 'performance.class.recomputed',
      targetType: 'class',
      targetId: 'class-1',
      metadata: {
        actorRole: 'teacher',
        recomputedStudentCount: 2,
        atRiskCount: 1,
        totalStudents: 2,
      },
    });
  });

  it('getClassLogs should return parsed logs with student metadata', async () => {
    db.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
      isActive: true,
      section: { id: 'section-1', isActive: true },
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

    snapshotReadService.findForStudentClasses.mockResolvedValue(
      new Map([
        [
          'class-1',
          {
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
          },
        ],
        [
          'class-2',
          {
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
          },
        ],
      ]),
    );
    const recomputeStudent = jest.spyOn(service, 'recomputeStudent');

    const result = await service.getStudentOwnSummary('student-1');

    expect(snapshotReadService.findForStudentClasses).toHaveBeenCalledWith(
      'student-1',
      ['class-1', 'class-2'],
    );
    expect(recomputeStudent).not.toHaveBeenCalled();
    expect(result.classes).toHaveLength(2);
    expect(result.overall.atRiskClasses).toBe(1);
    expect(result.overall.averageBlendedScore).toBe(71.5);
  });

  it('getStudentOwnSummary recomputes only missing snapshots', async () => {
    db.query.users.findFirst.mockResolvedValue({
      id: 'student-1',
      firstName: 'Alice',
      lastName: 'Lee',
      email: 'alice@test.com',
    });
    db.query.enrollments.findMany.mockResolvedValue([
      { classId: 'class-1', class: null },
      { classId: 'class-2', class: null },
    ]);
    snapshotReadService.findForStudentClasses.mockResolvedValue(
      new Map([
        [
          'class-1',
          {
            id: 's1',
            studentId: 'student-1',
            classId: 'class-1',
            assessmentAverage: 80,
            classRecordAverage: 80,
            blendedScore: 80,
            assessmentSampleSize: 1,
            classRecordSampleSize: 1,
            hasData: true,
            isAtRisk: false,
            thresholdApplied: 74,
            lastComputedAt: new Date(),
          },
        ],
      ]),
    );
    const recomputeStudent = jest
      .spyOn(service, 'recomputeStudent')
      .mockResolvedValue({
        id: 's2',
        studentId: 'student-1',
        classId: 'class-2',
        assessmentAverage: 60,
        classRecordAverage: 60,
        blendedScore: 60,
        assessmentSampleSize: 1,
        classRecordSampleSize: 1,
        hasData: true,
        isAtRisk: true,
        thresholdApplied: 74,
        lastComputedAt: new Date(),
      });

    const result = await service.getStudentOwnSummary('student-1');

    expect(recomputeStudent).toHaveBeenCalledTimes(1);
    expect(recomputeStudent).toHaveBeenCalledWith(
      'class-2',
      'student-1',
      'view_refresh',
    );
    expect(result.classes.map((entry) => entry.classId)).toEqual([
      'class-1',
      'class-2',
    ]);
  });

  it('getAdminAnalytics should return analytics datasets and log audit with uuid target', async () => {
    db.query.studentConceptMastery.findMany.mockResolvedValue([
      {
        id: 'mastery-1',
        classId: 'class-1',
        studentId: 'student-1',
        conceptKey: 'linear-equation',
        errorCount: 3,
        masteryScore: 64,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    db.query.aiGenerationOutputs.findMany.mockResolvedValue([
      {
        id: 'output-1',
        outputType: 'performance_diagnostic',
        targetClassId: 'class-1',
        targetTeacherId: 'teacher-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    db.query.performanceLogs.findMany.mockResolvedValue([
      {
        id: 'log-1',
        classId: 'class-1',
        studentId: 'student-1',
        previousIsAtRisk: false,
        currentIsAtRisk: true,
        triggerSource: 'manual_recompute',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const result = await service.getAdminAnalytics('admin-1', ['admin']);

    expect(result.conceptMasterySnapshots).toHaveLength(1);
    expect(result.recommendationHistory).toHaveLength(1);
    expect(result.performanceLogTransitions.total).toBe(1);
    expect(result.performanceLogTransitions.summary.riskIncrements).toBe(1);
    expect(auditService.log).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'performance.admin.analytics_viewed',
      targetType: 'system',
      targetId: 'admin-1',
      metadata: {
        conceptRows: 1,
        recommendationRows: 1,
        performanceLogRows: 1,
      },
    });
  });

  it('getAdminAnalytics should reject non-admin roles', async () => {
    await expect(
      service.getAdminAnalytics('teacher-1', ['teacher']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('buildPerformanceDiagnostics should scope the initial query to class and student filters', async () => {
    db.query.assessmentResponses.findMany.mockResolvedValue([]);

    await (service as any).buildPerformanceDiagnostics(
      'class-1',
      'student-1',
      'Focus on algebra mistakes',
    );

    const queryArg = db.query.assessmentResponses.findMany.mock.calls[0][0];
    const collectedParams = [
      ...collectSqlParams(queryArg.where),
      ...collectSqlParams(db.__subqueryWhere.mock.calls[0][0]),
    ];

    expect(collectedParams).toEqual(
      expect.arrayContaining([false, true, 'class-1', 'student-1']),
    );
  });
});

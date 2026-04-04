import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentsService } from './assessments.service';
import { DatabaseService } from '../../database/database.service';
import { FeedbackService } from './feedback.service';
import { AuditService } from '../audit/audit.service';
import { RagIndexingService } from '../rag/rag-indexing.service';

// ─── Fixture IDs ─────────────────────────────────────────────────────────────

const CLASS_ID = '00000000-0000-0000-0000-000000000001';
const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000010';
const QUESTION_ID = '00000000-0000-0000-0000-000000000020';
const OPTION_ID_A = '00000000-0000-0000-0000-000000000030';
const OPTION_ID_B = '00000000-0000-0000-0000-000000000031';
const STUDENT_ID = '00000000-0000-0000-0000-000000000040';
const ATTEMPT_ID = '00000000-0000-0000-0000-000000000050';

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_ASSESSMENT = {
  id: ASSESSMENT_ID,
  title: 'Test Quiz',
  description: 'A test quiz',
  classId: CLASS_ID,
  type: 'quiz',
  totalPoints: 10,
  passingScore: 60,
  maxAttempts: 2,
  timeLimitMinutes: null,
  dueDate: null,
  isPublished: false,
  feedbackLevel: 'immediate',
  feedbackDelayHours: 0,
  classRecordCategory: null,
  quarter: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  questions: [],
};

const MOCK_QUESTION = {
  id: QUESTION_ID,
  assessmentId: ASSESSMENT_ID,
  type: 'multiple_choice',
  content: 'What is 1+1?',
  points: 5,
  order: 1,
  isRequired: true,
  explanation: 'Basic math',
  options: [
    { id: OPTION_ID_A, text: '2', isCorrect: true, order: 1 },
    { id: OPTION_ID_B, text: '3', isCorrect: false, order: 2 },
  ],
};

const MOCK_PUBLISHED_ASSESSMENT = {
  ...MOCK_ASSESSMENT,
  isPublished: true,
  totalPoints: 5,
  strictMode: false,
  timedQuestionsEnabled: false,
  questionTimeLimitSeconds: null,
  questions: [MOCK_QUESTION],
};

const MOCK_FILE_UPLOAD_ASSESSMENT = {
  ...MOCK_PUBLISHED_ASSESSMENT,
  type: 'file_upload',
  questions: [],
  fileUploadInstructions: 'Upload your output file',
  allowedUploadMimeTypes: ['application/pdf'],
  allowedUploadExtensions: ['pdf'],
  maxUploadSizeBytes: 104857600,
};

const MOCK_ATTEMPT = {
  id: ATTEMPT_ID,
  studentId: STUDENT_ID,
  assessmentId: ASSESSMENT_ID,
  attemptNumber: 1,
  isSubmitted: false,
  score: null,
  passed: null,
  timeSpentSeconds: null,
  startedAt: new Date(),
  expiresAt: null,
  lastQuestionIndex: 0,
  currentQuestionStartedAt: null,
  currentQuestionDeadlineAt: null,
  violationCount: 0,
  questionOrder: null,
  draftResponses: [],
  submittedAt: null,
  isReturned: false,
  returnedAt: null,
  teacherFeedback: null,
};

// ─── DB mock builder (follows lessons.service.spec pattern) ──────────────────

function buildMockDb() {
  const db: any = {
    query: {
      assessments: { findFirst: jest.fn(), findMany: jest.fn() },
      assessmentQuestions: { findFirst: jest.fn(), findMany: jest.fn() },
      assessmentQuestionOptions: { findFirst: jest.fn(), findMany: jest.fn() },
      assessmentAttempts: { findFirst: jest.fn(), findMany: jest.fn() },
      assessmentResponses: { findFirst: jest.fn(), findMany: jest.fn() },
      classRecords: { findFirst: jest.fn() },
      classRecordCategories: { findFirst: jest.fn() },
      classRecordItems: { findFirst: jest.fn(), findMany: jest.fn() },
      classes: { findFirst: jest.fn() },
      uploadedFiles: { findFirst: jest.fn(), findMany: jest.fn() },
      users: { findFirst: jest.fn() },
      enrollments: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    select: jest.fn(),
    transaction: jest.fn(),
  };
  db.transaction.mockImplementation((cb: (tx: any) => Promise<any>) => cb(db));
  return db;
}

function mockInsert(db: any, rows: any[]) {
  const returning = jest.fn().mockResolvedValue(rows);
  const values = jest.fn().mockReturnValue({ returning });
  db.insert.mockReturnValueOnce({ values });
}

function mockUpdateReturning(db: any, rows: any[]) {
  const returning = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  db.update.mockReturnValueOnce({ set });
}

function mockUpdate(db: any) {
  const where = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn().mockReturnValue({ where });
  db.update.mockReturnValueOnce({ set });
}

function mockDelete(db: any) {
  const where = jest.fn().mockResolvedValue([]);
  db.delete.mockReturnValueOnce({ where });
}

function mockSelect(db: any, rows: any[]) {
  const result = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue(result);
  const from = jest.fn().mockReturnValue({ where });
  db.select.mockReturnValueOnce({ from });
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let db: any;
  let eventEmitter: EventEmitter2;
  let feedbackService: { applyFeedbackFiltering: jest.Mock };
  const mockAuditService = {
    log: jest.fn(),
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    db = buildMockDb();
    db.query.classRecordItems.findFirst.mockResolvedValue(null);
    db.query.classRecordItems.findMany.mockResolvedValue([]);
    db.query.classRecords.findFirst.mockResolvedValue(null);
    db.query.classRecordCategories.findFirst.mockResolvedValue(null);
    eventEmitter = { emit: jest.fn() } as any;
    jest.clearAllMocks();
    feedbackService = {
      applyFeedbackFiltering: jest.fn((attempt: any) => attempt),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: DatabaseService, useValue: { db } },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: FeedbackService,
          useValue: feedbackService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: RagIndexingService,
          useValue: {
            queueClassReindex: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createAssessment
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createAssessment', () => {
    it('should create an assessment with default totalPoints 0', async () => {
      const created = { ...MOCK_ASSESSMENT, totalPoints: 0 };
      db.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'teacher-1',
      });
      mockInsert(db, [created]);
      db.query.assessments.findFirst.mockResolvedValue(created);

      const result = await service.createAssessment(
        {
          title: 'Test Quiz',
          classId: CLASS_ID,
        } as any,
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result).toEqual({
        ...created,
        teacherAttachmentFile: null,
        rubricSourceFile: null,
        rubricCriteria: [],
        classRecordPlacement: null,
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it('should pass maxAttempts and timeLimitMinutes through', async () => {
      const created = {
        ...MOCK_ASSESSMENT,
        totalPoints: 0,
        maxAttempts: 3,
        timeLimitMinutes: 30,
      };
      db.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'teacher-1',
      });
      mockInsert(db, [created]);
      db.query.assessments.findFirst.mockResolvedValue(created);

      const result = await service.createAssessment(
        {
          title: 'Timed Quiz',
          classId: CLASS_ID,
          maxAttempts: 3,
          timeLimitMinutes: 30,
        } as any,
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result.maxAttempts).toBe(3);
      expect(result.timeLimitMinutes).toBe(30);
    });

    it('should reject createAssessment for non-owner teacher class', async () => {
      db.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'teacher-2',
      });

      await expect(
        service.createAssessment(
          {
            title: 'Foreign Class Quiz',
            classId: CLASS_ID,
          } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAssessmentById
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAssessmentById', () => {
    it('should throw NotFoundException if assessment not found', async () => {
      db.query.assessments.findFirst.mockResolvedValue(null);
      await expect(service.getAssessmentById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return assessment with nested questions', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      const result = await service.getAssessmentById(ASSESSMENT_ID);
      expect(result.id).toBe(ASSESSMENT_ID);
      expect(result.questions).toHaveLength(1);
    });

    it('should reject getAssessmentById for non-owner teachers', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-2' },
      });

      await expect(
        service.getAssessmentById(ASSESSMENT_ID, undefined, {
          userId: 'teacher-1',
          roles: ['teacher'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject unpublished assessment reads for students even if enrolled', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_ASSESSMENT,
        isPublished: false,
        class: { teacherId: 'teacher-1' },
      });
      db.query.enrollments.findFirst.mockResolvedValue({
        classId: CLASS_ID,
        studentId: STUDENT_ID,
      });

      await expect(
        service.getAssessmentById(ASSESSMENT_ID, 'student', {
          userId: STUDENT_ID,
          roles: ['student'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAssessmentsByClass access control', () => {
    it('should reject class assessment listing for non-owner teachers', async () => {
      db.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'teacher-2',
      });

      await expect(
        service.getAssessmentsByClass(
          CLASS_ID,
          { page: 1, limit: 20 },
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return only published assessments for student class listing', async () => {
      db.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: 'teacher-1',
      });
      db.query.enrollments.findFirst.mockResolvedValue({
        classId: CLASS_ID,
        studentId: STUDENT_ID,
      });
      db.query.assessments.findMany.mockResolvedValue([
        {
          ...MOCK_PUBLISHED_ASSESSMENT,
          id: ASSESSMENT_ID,
          isPublished: true,
        },
        {
          ...MOCK_PUBLISHED_ASSESSMENT,
          id: '00000000-0000-0000-0000-000000000099',
          isPublished: false,
        },
      ]);
      db.query.assessmentAttempts.findMany.mockResolvedValue([]);

      const result = await service.getAssessmentsByClass(
        CLASS_ID,
        { studentId: STUDENT_ID, status: 'all' },
        { userId: STUDENT_ID, roles: ['student'] },
      );

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(ASSESSMENT_ID);
    });

    it('should reject teacher class listing when class ownership metadata is missing', async () => {
      db.query.classes.findFirst.mockResolvedValue({
        id: CLASS_ID,
        teacherId: null,
      });

      await expect(
        service.getAssessmentsByClass(
          CLASS_ID,
          { page: 1, limit: 20 },
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // updateAssessment — publish validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateAssessment', () => {
    it('should update title without validation when not publishing', async () => {
      const updated = { ...MOCK_ASSESSMENT, title: 'Updated' };
      db.query.assessments.findFirst
        .mockResolvedValueOnce(MOCK_ASSESSMENT)
        .mockResolvedValueOnce(updated);
      mockUpdateReturning(db, [updated]);

      const result = await service.updateAssessment(
        ASSESSMENT_ID,
        {
          title: 'Updated',
        } as any,
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result.title).toBe('Updated');
    });

    it('should reject publish when there are no questions', async () => {
      const noQuestionsAssessment = { ...MOCK_ASSESSMENT, questions: [] };
      db.query.assessments.findFirst.mockResolvedValue(noQuestionsAssessment);

      await expect(
        service.updateAssessment(
          ASSESSMENT_ID,
          { isPublished: true } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject publish when passingScore is not set', async () => {
      const noPassing = {
        ...MOCK_ASSESSMENT,
        passingScore: null,
        questions: [MOCK_QUESTION],
      };
      db.query.assessments.findFirst.mockResolvedValue(noPassing);

      await expect(
        service.updateAssessment(
          ASSESSMENT_ID,
          { isPublished: true } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow publish when assessment has valid questions', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      mockUpdateReturning(db, [{ ...MOCK_PUBLISHED_ASSESSMENT }]);

      const result = await service.updateAssessment(
        ASSESSMENT_ID,
        {
          isPublished: true,
        } as any,
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result.isPublished).toBe(true);
    });

    it('should reject publish for file upload assessment without instructions', async () => {
      const invalidFileUpload = {
        ...MOCK_FILE_UPLOAD_ASSESSMENT,
        fileUploadInstructions: null,
      };
      db.query.assessments.findFirst.mockResolvedValue(invalidFileUpload);

      await expect(
        service.updateAssessment(
          ASSESSMENT_ID,
          { isPublished: true } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject updateAssessment for non-owner teacher class', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-2' },
      });

      await expect(
        service.updateAssessment(
          ASSESSMENT_ID,
          { title: 'Forbidden Update' } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // startAttempt — multi-attempt logic
  // ═══════════════════════════════════════════════════════════════════════════

  describe('class record placement', () => {
    it('links a manually selected class record slot to the assessment', async () => {
      const updatedAssessment = {
        ...MOCK_ASSESSMENT,
        title: 'Mapped Quiz',
        classRecordCategory: 'written_work',
        quarter: 'Q1',
      };

      db.query.assessments.findFirst
        .mockResolvedValueOnce(MOCK_ASSESSMENT)
        .mockResolvedValueOnce(updatedAssessment);
      db.query.classRecords.findFirst.mockResolvedValue({
        id: 'record-1',
        classId: CLASS_ID,
        gradingPeriod: 'Q1',
        status: 'draft',
      });
      db.query.classRecordCategories.findFirst.mockResolvedValue({
        id: 'category-1',
        classRecordId: 'record-1',
        name: 'Written Works',
      });
      db.query.classRecordItems.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'slot-1',
            itemOrder: 1,
            maxScore: '0',
            assessmentId: null,
            scores: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'slot-1',
            itemOrder: 1,
            maxScore: '10',
            assessmentId: ASSESSMENT_ID,
            scores: [],
          },
        ]);
      db.query.classRecordItems.findFirst.mockResolvedValue({
        id: 'slot-1',
        itemOrder: 1,
        title: 'Mapped Quiz',
        maxScore: '10',
        category: {
          id: 'category-1',
          name: 'Written Works',
        },
        classRecord: {
          id: 'record-1',
          classId: CLASS_ID,
          gradingPeriod: 'Q1',
        },
        scores: [],
      });
      mockUpdateReturning(db, [updatedAssessment]);
      mockUpdateReturning(db, [{ id: 'slot-1' }]);

      const result = await service.updateAssessment(
        ASSESSMENT_ID,
        {
          title: 'Mapped Quiz',
          classRecordCategory: 'written_work',
          quarter: 'Q1',
          classRecordItemId: 'slot-1',
        } as any,
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result.classRecordPlacement?.itemId).toBe('slot-1');
    });

    it('rejects automatic placement when the selected category is full', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_ASSESSMENT);
      db.query.classRecords.findFirst.mockResolvedValue({
        id: 'record-1',
        classId: CLASS_ID,
        gradingPeriod: 'Q1',
        status: 'draft',
      });
      db.query.classRecordCategories.findFirst.mockResolvedValue({
        id: 'category-1',
        classRecordId: 'record-1',
        name: 'Written Works',
      });
      db.query.classRecordItems.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'slot-1',
            itemOrder: 1,
            maxScore: '20',
            assessmentId: null,
            scores: [{ id: 'score-1' }],
          },
        ]);
      mockUpdateReturning(db, [
        {
          ...MOCK_ASSESSMENT,
          classRecordCategory: 'written_work',
          quarter: 'Q1',
        },
      ]);

      await expect(
        service.updateAssessment(
          ASSESSMENT_ID,
          {
            classRecordCategory: 'written_work',
            quarter: 'Q1',
            classRecordItemId: null,
          } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startAttempt', () => {
    it('should reject if assessment is not published', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_ASSESSMENT); // isPublished: false

      await expect(
        service.startAttempt(STUDENT_ID, ASSESSMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if due date has passed', async () => {
      const expired = {
        ...MOCK_PUBLISHED_ASSESSMENT,
        dueDate: new Date('2020-01-01'),
      };
      db.query.assessments.findFirst.mockResolvedValue(expired);

      await expect(
        service.startAttempt(STUDENT_ID, ASSESSMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should resume existing unsubmitted attempt', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      // findFirst for unsubmitted attempt
      db.query.assessmentAttempts.findFirst.mockResolvedValue(MOCK_ATTEMPT);

      const result = await service.startAttempt(STUDENT_ID, ASSESSMENT_ID);
      expect(result.attempt.id).toBe(ATTEMPT_ID);
    });

    it('should reject when maxAttempts reached', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      // No unsubmitted attempt
      db.query.assessmentAttempts.findFirst.mockResolvedValue(null);
      // 2 submitted attempts (maxAttempts is 2)
      db.query.assessmentAttempts.findMany.mockResolvedValue([
        { ...MOCK_ATTEMPT, isSubmitted: true, attemptNumber: 1 },
        { ...MOCK_ATTEMPT, isSubmitted: true, attemptNumber: 2 },
      ]);

      await expect(
        service.startAttempt(STUDENT_ID, ASSESSMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create new attempt when attempts remain', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      db.query.assessmentAttempts.findFirst.mockResolvedValue(null);
      db.query.assessmentAttempts.findMany.mockResolvedValue([
        { ...MOCK_ATTEMPT, isSubmitted: true, attemptNumber: 1 },
      ]);

      const newAttempt = { ...MOCK_ATTEMPT, attemptNumber: 2 };
      mockInsert(db, [newAttempt]);

      const result = await service.startAttempt(STUDENT_ID, ASSESSMENT_ID);
      expect(result.attempt.attemptNumber).toBe(2);
      expect(result.timeLimitMinutes).toBeNull();
    });

    it('should return timeLimitMinutes when assessment has time limit', async () => {
      const timedAssessment = {
        ...MOCK_PUBLISHED_ASSESSMENT,
        timeLimitMinutes: 30,
      };
      db.query.assessments.findFirst.mockResolvedValue(timedAssessment);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(null);
      db.query.assessmentAttempts.findMany.mockResolvedValue([]);
      mockInsert(db, [{ ...MOCK_ATTEMPT, attemptNumber: 1 }]);

      const result = await service.startAttempt(STUDENT_ID, ASSESSMENT_ID);
      expect(result.timeLimitMinutes).toBe(30);
    });

    it('should initialize question timer state for timed-question assessments', async () => {
      const timedQuestionAssessment = {
        ...MOCK_PUBLISHED_ASSESSMENT,
        timedQuestionsEnabled: true,
        questionTimeLimitSeconds: 30,
      };
      db.query.assessments.findFirst.mockResolvedValue(timedQuestionAssessment);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(null);
      db.query.assessmentAttempts.findMany.mockResolvedValue([]);
      mockInsert(db, [
        {
          ...MOCK_ATTEMPT,
          currentQuestionStartedAt: new Date('2026-03-16T00:00:00.000Z'),
          currentQuestionDeadlineAt: new Date('2026-03-16T00:00:30.000Z'),
          violationCount: 0,
        },
      ]);

      const result = await service.startAttempt(STUDENT_ID, ASSESSMENT_ID);
      const insertedValues = db.insert.mock.results[0].value.values.mock.calls[0][0];

      expect(insertedValues.currentQuestionStartedAt).toBeInstanceOf(Date);
      expect(insertedValues.currentQuestionDeadlineAt).toBeInstanceOf(Date);
      expect(insertedValues.violationCount).toBe(0);
      expect(result.attempt.currentQuestionDeadlineAt).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getOngoingAttempt / updateAttemptProgress — timed state + anti-cheat
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getOngoingAttempt', () => {
    it('should advance to the next question when the current question timer has expired', async () => {
      const timedQuestionAssessment = {
        ...MOCK_PUBLISHED_ASSESSMENT,
        timedQuestionsEnabled: true,
        questionTimeLimitSeconds: 30,
        questions: [
          MOCK_QUESTION,
          { ...MOCK_QUESTION, id: '00000000-0000-0000-0000-000000000021', order: 2 },
        ],
      };
      const expiredAttempt = {
        ...MOCK_ATTEMPT,
        lastQuestionIndex: 0,
        currentQuestionStartedAt: new Date(Date.now() - 31_000),
        currentQuestionDeadlineAt: new Date(Date.now() - 1_000),
      };
      const advancedAttempt = {
        ...expiredAttempt,
        lastQuestionIndex: 1,
        currentQuestionStartedAt: new Date(),
        currentQuestionDeadlineAt: new Date(Date.now() + 30_000),
      };

      db.query.assessments.findFirst.mockResolvedValue(timedQuestionAssessment);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(expiredAttempt);
      mockUpdateReturning(db, [advancedAttempt]);

      const result = await service.getOngoingAttempt(STUDENT_ID, ASSESSMENT_ID);

      expect(result?.attempt.lastQuestionIndex).toBe(1);
      expect(result?.attempt.currentQuestionDeadlineAt).toBeTruthy();
    });

    it('should auto-submit expired ongoing attempts with audit logging', async () => {
      const expiredAttempt = {
        ...MOCK_ATTEMPT,
        expiresAt: new Date(Date.now() - 1_000),
      };
      const submittedAttempt = {
        ...expiredAttempt,
        isSubmitted: true,
        submittedAt: new Date(),
      };
      const finalAttempt = {
        ...submittedAttempt,
        score: 0,
        passed: false,
      };

      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(expiredAttempt);
      mockUpdateReturning(db, [submittedAttempt]);
      mockUpdateReturning(db, [finalAttempt]);

      const result = await service.getOngoingAttempt(STUDENT_ID, ASSESSMENT_ID);

      expect(result).toBeNull();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: STUDENT_ID,
          action: 'assessment.submission.auto_submitted',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            studentId: STUDENT_ID,
            isFileUpload: false,
            score: 0,
            passed: false,
          }),
        }),
      );
    });
  });

  describe('updateAttemptProgress', () => {
    it('should reset the server deadline when a student moves to the next question', async () => {
      const timedQuestionAssessment = {
        ...MOCK_PUBLISHED_ASSESSMENT,
        timedQuestionsEnabled: true,
        questionTimeLimitSeconds: 30,
        questions: [
          MOCK_QUESTION,
          { ...MOCK_QUESTION, id: '00000000-0000-0000-0000-000000000021', order: 2 },
        ],
      };
      const activeAttempt = {
        ...MOCK_ATTEMPT,
        lastQuestionIndex: 0,
        currentQuestionStartedAt: new Date(),
        currentQuestionDeadlineAt: new Date(Date.now() + 30_000),
      };
      const updatedAttempt = {
        ...activeAttempt,
        lastQuestionIndex: 1,
        currentQuestionStartedAt: new Date(Date.now() + 500),
        currentQuestionDeadlineAt: new Date(Date.now() + 30_500),
      };

      db.query.assessments.findFirst.mockResolvedValue(timedQuestionAssessment);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(activeAttempt);
      mockUpdateReturning(db, [updatedAttempt]);

      const result = await service.updateAttemptProgress(STUDENT_ID, ATTEMPT_ID, {
        currentQuestionIndex: 1,
      });

      const setArgs = db.update.mock.results[0].value.set.mock.calls[0][0];
      expect(setArgs.currentQuestionStartedAt).toBeInstanceOf(Date);
      expect(setArgs.currentQuestionDeadlineAt).toBeInstanceOf(Date);
      expect(result.lastQuestionIndex).toBe(1);
    });

    it('should auto-submit on the third anti-cheat violation', async () => {
      const fileUploadAssessment = {
        ...MOCK_FILE_UPLOAD_ASSESSMENT,
        id: ASSESSMENT_ID,
      };
      const violatingAttempt = {
        ...MOCK_ATTEMPT,
        violationCount: 2,
      };
      const updatedForViolation = {
        ...violatingAttempt,
        violationCount: 3,
      };
      const submittedAttempt = {
        ...updatedForViolation,
        isSubmitted: true,
        submittedAt: new Date(),
      };

      db.query.assessments.findFirst.mockResolvedValue(fileUploadAssessment);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(violatingAttempt);
      mockUpdateReturning(db, [updatedForViolation]);
      mockUpdateReturning(db, [submittedAttempt]);

      await expect(
        service.updateAttemptProgress(STUDENT_ID, ATTEMPT_ID, {
          registerViolation: true,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(db.update).toHaveBeenCalledTimes(2);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: STUDENT_ID,
          action: 'assessment.submission.auto_submitted',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            studentId: STUDENT_ID,
            isFileUpload: true,
            score: null,
            passed: null,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // submitAssessment — scoring
  // ═══════════════════════════════════════════════════════════════════════════

  describe('submitAssessment', () => {
    it('should throw if no active attempt found', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      db.query.assessmentAttempts.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAssessment(STUDENT_ID, {
          assessmentId: ASSESSMENT_ID,
          responses: [],
          timeSpentSeconds: 60,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-grade multiple_choice correctly', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      db.query.assessmentAttempts.findFirst.mockResolvedValue(MOCK_ATTEMPT);

      // update attempt as submitted
      mockUpdateReturning(db, [{ ...MOCK_ATTEMPT, isSubmitted: true }]);
      // insert response
      mockInsert(db, [
        {
          id: 'resp-1',
          attemptId: ATTEMPT_ID,
          questionId: QUESTION_ID,
          selectedOptionId: OPTION_ID_A,
          isCorrect: true,
          pointsEarned: 5,
        },
      ]);
      // update attempt with score
      mockUpdateReturning(db, [
        {
          ...MOCK_ATTEMPT,
          isSubmitted: true,
          score: 100,
          passed: true,
        },
      ]);

      const result = await service.submitAssessment(STUDENT_ID, {
        assessmentId: ASSESSMENT_ID,
        responses: [{ questionId: QUESTION_ID, selectedOptionId: OPTION_ID_A }],
        timeSpentSeconds: 120,
      });

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'assessment.submitted',
        expect.objectContaining({ studentId: STUDENT_ID }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: STUDENT_ID,
          action: 'assessment.submission.submitted',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            studentId: STUDENT_ID,
            isFileUpload: false,
            score: 100,
            passed: true,
          }),
        }),
      );
    });

    it('should give 0 points for wrong answer', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      db.query.assessmentAttempts.findFirst.mockResolvedValue(MOCK_ATTEMPT);

      mockUpdateReturning(db, [{ ...MOCK_ATTEMPT, isSubmitted: true }]);
      mockInsert(db, [
        {
          id: 'resp-1',
          attemptId: ATTEMPT_ID,
          questionId: QUESTION_ID,
          selectedOptionId: OPTION_ID_B,
          isCorrect: false,
          pointsEarned: 0,
        },
      ]);
      mockUpdateReturning(db, [
        {
          ...MOCK_ATTEMPT,
          isSubmitted: true,
          score: 0,
          passed: false,
        },
      ]);

      const result = await service.submitAssessment(STUDENT_ID, {
        assessmentId: ASSESSMENT_ID,
        responses: [{ questionId: QUESTION_ID, selectedOptionId: OPTION_ID_B }],
        timeSpentSeconds: 30,
      });

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('should throw for unknown questionId', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_PUBLISHED_ASSESSMENT,
      );
      db.query.assessmentAttempts.findFirst.mockResolvedValue(MOCK_ATTEMPT);
      mockUpdateReturning(db, [{ ...MOCK_ATTEMPT, isSubmitted: true }]);

      await expect(
        service.submitAssessment(STUDENT_ID, {
          assessmentId: ASSESSMENT_ID,
          responses: [
            { questionId: 'unknown-id', selectedOptionId: OPTION_ID_A },
          ],
          timeSpentSeconds: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block file-upload submission when no file is uploaded', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_FILE_UPLOAD_ASSESSMENT,
      );
      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        submittedFileId: null,
      });

      await expect(
        service.submitAssessment(STUDENT_ID, {
          assessmentId: ASSESSMENT_ID,
          responses: [],
          timeSpentSeconds: 30,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit file-upload assessment when a file is already attached to attempt', async () => {
      db.query.assessments.findFirst.mockResolvedValue(
        MOCK_FILE_UPLOAD_ASSESSMENT,
      );
      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        submittedFileId: '00000000-0000-0000-0000-000000000099',
      });
      mockUpdateReturning(db, [
        {
          ...MOCK_ATTEMPT,
          isSubmitted: true,
          submittedFileId: '00000000-0000-0000-0000-000000000099',
        },
      ]);

      const result = await service.submitAssessment(STUDENT_ID, {
        assessmentId: ASSESSMENT_ID,
        responses: [],
        timeSpentSeconds: 45,
      });

      expect(result.score).toBeNull();
      expect(result.passed).toBeNull();
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'assessment.submitted',
        expect.anything(),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: STUDENT_ID,
          action: 'assessment.submission.submitted',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            studentId: STUDENT_ID,
            isFileUpload: true,
            score: null,
            passed: null,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // deleteAssessment
  // ═══════════════════════════════════════════════════════════════════════════

  describe('unsubmitFileUploadAssessment', () => {
    it('should restore the latest submitted file upload attempt to draft state', async () => {
      const submittedAttempt = {
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        submittedAt: new Date(),
        submittedFileId: '00000000-0000-0000-0000-000000000099',
      };
      const restoredAttempt = {
        ...submittedAttempt,
        isSubmitted: false,
        submittedAt: null,
        score: null,
        passed: null,
        isReturned: false,
      };

      db.query.assessments.findFirst.mockResolvedValue(MOCK_FILE_UPLOAD_ASSESSMENT);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(submittedAttempt);
      mockUpdateReturning(db, [restoredAttempt]);

      const result = await service.unsubmitFileUploadAssessment(
        STUDENT_ID,
        ASSESSMENT_ID,
      );

      expect(result.isSubmitted).toBe(false);
      expect(result.submittedFileId).toBe(submittedAttempt.submittedFileId);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: STUDENT_ID,
          action: 'assessment.submission.unsubmitted',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            studentId: STUDENT_ID,
            submittedFileId: submittedAttempt.submittedFileId,
          }),
        }),
      );
    });

    it('should reject unsubmit for returned file upload attempts', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_FILE_UPLOAD_ASSESSMENT);
      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        isReturned: true,
        submittedAt: new Date(),
        submittedFileId: '00000000-0000-0000-0000-000000000099',
      });

      await expect(
        service.unsubmitFileUploadAssessment(STUDENT_ID, ASSESSMENT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadStudentSubmissionFile', () => {
    it('should write audit metadata when a student uploads a submission file', async () => {
      jest.spyOn(service, 'getAssessmentById').mockResolvedValue({
        ...MOCK_FILE_UPLOAD_ASSESSMENT,
        class: { teacherId: 'teacher-1' },
      } as any);
      jest
        .spyOn(service as any, 'ensureStudentEnrolled')
        .mockResolvedValue(undefined);
      jest.spyOn(service, 'startAttempt').mockResolvedValue({
        attempt: {
          ...MOCK_ATTEMPT,
          id: ATTEMPT_ID,
        },
      } as any);

      mockInsert(db, [
        {
          id: 'file-3',
          originalName: 'answer.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          filePath: 'uploads/assessment-files/answer.pdf',
        },
      ]);
      mockUpdate(db);

      const result = await service.uploadStudentSubmissionFile(
        ASSESSMENT_ID,
        { userId: STUDENT_ID, roles: ['student'] },
        {
          originalname: 'answer.pdf',
          filename: 'answer-stored.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          path: 'uploads\\assessment-files\\answer-stored.pdf',
        } as any,
      );

      expect(result.file.id).toBe('file-3');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: STUDENT_ID,
          action: 'assessment.submission.file_uploaded',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            studentId: STUDENT_ID,
            fileId: 'file-3',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
          }),
        }),
      );
    });
  });

  describe('assessment file download ownership', () => {
    it('should reject teacher attachment download when class ownership context is missing', async () => {
      jest.spyOn(service, 'getAssessmentById').mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        teacherAttachmentFileId: 'file-attachment-1',
        class: { teacherId: null },
      } as any);

      await expect(
        service.getTeacherAttachmentDownload(ASSESSMENT_ID, {
          userId: 'teacher-1',
          roles: ['teacher'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject attempt submission download when teacher ownership context is missing', async () => {
      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        submittedFileId: 'submitted-file-1',
        assessment: {
          ...MOCK_PUBLISHED_ASSESSMENT,
          class: { teacherId: null },
        },
      });

      await expect(
        service.getAttemptSubmissionDownload(ATTEMPT_ID, {
          userId: 'teacher-1',
          roles: ['teacher'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should write audit metadata for teacher attachment downloads', async () => {
      jest.spyOn(service, 'getAssessmentById').mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        teacherAttachmentFileId: 'file-attachment-1',
        class: { teacherId: 'teacher-1' },
      } as any);
      db.query.uploadedFiles.findFirst.mockResolvedValue({
        id: 'file-attachment-1',
        originalName: 'guide.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        filePath: 'uploads/assessment-files/guide.pdf',
      });

      const result = await service.getTeacherAttachmentDownload(ASSESSMENT_ID, {
        userId: 'teacher-1',
        roles: ['teacher'],
      });

      expect(result.id).toBe('file-attachment-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.attachment.downloaded',
          targetType: 'assessment',
          targetId: ASSESSMENT_ID,
          metadata: expect.objectContaining({
            classId: CLASS_ID,
            fileId: 'file-attachment-1',
            requestedByRole: 'teacher',
          }),
        }),
      );
    });

    it('should write audit metadata for student submission downloads', async () => {
      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        submittedFileId: 'submitted-file-1',
        assessment: {
          ...MOCK_PUBLISHED_ASSESSMENT,
          class: { teacherId: 'teacher-1' },
        },
      });
      db.query.uploadedFiles.findFirst.mockResolvedValue({
        id: 'submitted-file-1',
        originalName: 'student-work.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        filePath: 'uploads/assessment-files/student-work.pdf',
      });

      const result = await service.getAttemptSubmissionDownload(ATTEMPT_ID, {
        userId: STUDENT_ID,
        roles: ['student'],
      });

      expect(result.id).toBe('submitted-file-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: STUDENT_ID,
          action: 'assessment.submission.file_downloaded',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            studentId: STUDENT_ID,
            fileId: 'submitted-file-1',
            requestedByRole: 'student',
          }),
        }),
      );
    });
  });

  describe('getAttemptResults', () => {
    it('should return unfiltered responses for teachers', async () => {
      const attempt = {
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        submittedAt: new Date('2026-03-19T00:10:00.000Z'),
        teacherFeedback: 'Solid work',
        assessment: {
          ...MOCK_PUBLISHED_ASSESSMENT,
          feedbackLevel: 'standard',
          feedbackDelayHours: 24,
          class: { teacherId: 'teacher-1' },
        },
        responses: [
          {
            id: 'response-1',
            questionId: QUESTION_ID,
            studentAnswer: '2',
            selectedOptionId: OPTION_ID_A,
            isCorrect: true,
            pointsEarned: 5,
            question: MOCK_QUESTION,
          },
        ],
        student: {
          id: STUDENT_ID,
          firstName: 'Jane',
          lastName: 'Doe',
        },
      };

      db.query.assessmentAttempts.findFirst.mockResolvedValue(attempt);

      const result = await service.getAttemptResults(ATTEMPT_ID, {
        userId: 'teacher-1',
        roles: ['teacher'],
      });

      expect(result.responses[0].studentAnswer).toBe('2');
      expect(result.responses[0].selectedOptionId).toBe(OPTION_ID_A);
      expect(feedbackService.applyFeedbackFiltering).not.toHaveBeenCalled();
    });

    it('should keep student masking rules for student viewers', async () => {
      const filteredAttempt = {
        responses: [
          {
            id: 'response-1',
            questionId: QUESTION_ID,
            studentAnswer: null,
            selectedOptionId: null,
          },
        ],
        assessment: {
          id: ASSESSMENT_ID,
          title: 'Test Quiz',
          type: 'quiz',
          totalPoints: 5,
        },
      };

      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        isReturned: true,
        submittedAt: new Date('2026-03-19T00:10:00.000Z'),
        assessment: {
          ...MOCK_PUBLISHED_ASSESSMENT,
          feedbackLevel: 'standard',
          feedbackDelayHours: 24,
        },
        responses: [
          {
            id: 'response-1',
            questionId: QUESTION_ID,
            studentAnswer: '2',
            selectedOptionId: OPTION_ID_A,
            isCorrect: true,
            pointsEarned: 5,
            question: MOCK_QUESTION,
          },
        ],
        student: {
          id: STUDENT_ID,
          firstName: 'Jane',
          lastName: 'Doe',
        },
      });
      feedbackService.applyFeedbackFiltering.mockReturnValue(filteredAttempt);

      const result = await service.getAttemptResults(
        ATTEMPT_ID,
        { userId: STUDENT_ID, roles: ['student'] },
        'student',
      );

      expect(feedbackService.applyFeedbackFiltering).toHaveBeenCalled();
      expect(result.responses[0].studentAnswer).toBeNull();
    });

    it('should reject student viewers requesting another student attempt', async () => {
      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        studentId: 'another-student',
        isSubmitted: true,
        isReturned: true,
        assessment: {
          ...MOCK_PUBLISHED_ASSESSMENT,
          class: { teacherId: 'teacher-1' },
        },
        responses: [],
      });

      await expect(
        service.getAttemptResults(
          ATTEMPT_ID,
          { userId: STUDENT_ID, roles: ['student'] },
          'student',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('attachment and rubric audit logging', () => {
    it('should write audit metadata when uploading teacher attachment', async () => {
      jest.spyOn(service, 'getAssessmentById').mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-1' },
      } as any);

      mockInsert(db, [
        {
          id: 'file-1',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
        },
      ]);
      mockUpdate(db);

      const result = await service.uploadTeacherAttachment(
        ASSESSMENT_ID,
        { userId: 'teacher-1', roles: ['teacher'] },
        {
          originalname: 'guide.pdf',
          filename: 'guide-stored.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          path: 'uploads\\assessment-files\\guide-stored.pdf',
        } as any,
      );

      expect(result.id).toBe('file-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.attachment.uploaded',
          targetType: 'assessment',
          targetId: ASSESSMENT_ID,
          metadata: expect.objectContaining({
            classId: CLASS_ID,
            fileId: 'file-1',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
          }),
        }),
      );
    });

    it('should write audit metadata when uploading rubric source', async () => {
      jest
        .spyOn(service, 'getAssessmentById')
        .mockResolvedValueOnce({
          ...MOCK_FILE_UPLOAD_ASSESSMENT,
          class: { teacherId: 'teacher-1' },
        } as any)
        .mockResolvedValueOnce({
          ...MOCK_FILE_UPLOAD_ASSESSMENT,
          class: { teacherId: 'teacher-1' },
          rubricCriteria: [
            {
              id: 'criterion-1',
              title: 'Content',
              points: 60,
            },
          ],
        } as any);
      jest
        .spyOn(service as any, 'extractRubricTextFromFile')
        .mockResolvedValue('Content - 60 points');
      jest
        .spyOn(service as any, 'draftRubricCriteriaFromText')
        .mockReturnValue([
          {
            id: 'criterion-1',
            title: 'Content',
            points: 60,
          },
        ]);

      mockInsert(db, [
        {
          id: 'file-2',
          originalName: 'rubric.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          filePath: 'uploads/assessment-files/rubric.pdf',
        },
      ]);
      mockUpdate(db);

      const result = await service.uploadRubricSource(
        ASSESSMENT_ID,
        { userId: 'teacher-1', roles: ['teacher'] },
        {
          originalname: 'rubric.pdf',
          filename: 'rubric-stored.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          path: 'uploads\\assessment-files\\rubric-stored.pdf',
        } as any,
      );

      expect(result.rubricParseStatus).toBe('parsed');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.rubric.uploaded',
          targetType: 'assessment',
          targetId: ASSESSMENT_ID,
          metadata: expect.objectContaining({
            classId: CLASS_ID,
            fileId: 'file-2',
            rubricParseStatus: 'parsed',
            criteriaCount: 1,
          }),
        }),
      );
    });

    it('should write audit metadata when reviewing rubric', async () => {
      jest
        .spyOn(service, 'getAssessmentById')
        .mockResolvedValueOnce({
          ...MOCK_FILE_UPLOAD_ASSESSMENT,
          class: { teacherId: 'teacher-1' },
        } as any)
        .mockResolvedValueOnce({
          ...MOCK_FILE_UPLOAD_ASSESSMENT,
          class: { teacherId: 'teacher-1' },
          totalPoints: 60,
          rubricCriteria: [
            {
              id: 'criterion-1',
              title: 'Content',
              points: 60,
            },
          ],
        } as any);
      mockUpdate(db);

      const result = await service.reviewRubric(
        ASSESSMENT_ID,
        { userId: 'teacher-1', roles: ['teacher'] },
        [
          {
            id: 'criterion-1',
            title: 'Content',
            points: 60,
          },
        ],
      );

      expect(result.totalPoints).toBe(60);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.rubric.reviewed',
          targetType: 'assessment',
          targetId: ASSESSMENT_ID,
          metadata: expect.objectContaining({
            classId: CLASS_ID,
            criteriaCount: 1,
            totalPoints: 60,
          }),
        }),
      );
    });
  });

  describe('grade return ownership and audit', () => {
    it('should reject returnGrade for non-owner teachers', async () => {
      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        isReturned: false,
        assessment: {
          ...MOCK_PUBLISHED_ASSESSMENT,
          class: { teacherId: 'teacher-2' },
        },
      });

      await expect(
        service.returnGrade(
          ATTEMPT_ID,
          { teacherFeedback: 'Reviewed' },
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should write audit metadata when returnGrade succeeds for owner teacher', async () => {
      db.query.assessmentAttempts.findFirst.mockResolvedValue({
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        isReturned: false,
        score: 80,
        passed: true,
        assessment: {
          ...MOCK_PUBLISHED_ASSESSMENT,
          class: { teacherId: 'teacher-1' },
        },
      });
      mockUpdateReturning(db, [
        {
          ...MOCK_ATTEMPT,
          id: ATTEMPT_ID,
          score: 80,
          passed: true,
          isReturned: true,
        },
      ]);

      const result = await service.returnGrade(
        ATTEMPT_ID,
        { teacherFeedback: 'Reviewed' },
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result.isReturned).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.grade.returned',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            studentId: STUDENT_ID,
            score: 80,
            passed: true,
          }),
        }),
      );
    });

    it('should reject returnAllGrades for non-owner teachers', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-2' },
      });

      await expect(
        service.returnAllGrades(ASSESSMENT_ID, 'Batch feedback', {
          userId: 'teacher-1',
          roles: ['teacher'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should write audit metadata when returnAllGrades succeeds', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-1' },
      });
      mockUpdateReturning(db, [
        { id: ATTEMPT_ID },
        { id: '00000000-0000-0000-0000-000000000051' },
      ]);

      const result = await service.returnAllGrades(
        ASSESSMENT_ID,
        'Batch feedback',
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result).toEqual({
        returned: 2,
        attemptIds: [ATTEMPT_ID, '00000000-0000-0000-0000-000000000051'],
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.grades.returned_all',
          targetType: 'assessment',
          targetId: ASSESSMENT_ID,
          metadata: expect.objectContaining({
            classId: CLASS_ID,
            returned: 2,
          }),
        }),
      );
    });

    it('should reject bulkReturnGrades for non-owner teachers', async () => {
      db.query.assessmentAttempts.findMany.mockResolvedValue([
        {
          id: ATTEMPT_ID,
          assessmentId: ASSESSMENT_ID,
          assessment: {
            class: { teacherId: 'teacher-2' },
          },
        },
      ]);

      await expect(
        service.bulkReturnGrades(
          {
            attemptIds: [ATTEMPT_ID],
            teacherFeedback: 'Batch feedback',
          },
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should write audit metadata when bulkReturnGrades succeeds', async () => {
      db.query.assessmentAttempts.findMany.mockResolvedValue([
        {
          id: ATTEMPT_ID,
          assessmentId: ASSESSMENT_ID,
          assessment: {
            class: { teacherId: 'teacher-1' },
          },
        },
        {
          id: '00000000-0000-0000-0000-000000000051',
          assessmentId: ASSESSMENT_ID,
          assessment: {
            class: { teacherId: 'teacher-1' },
          },
        },
      ]);
      mockUpdateReturning(db, [
        { id: ATTEMPT_ID },
        { id: '00000000-0000-0000-0000-000000000051' },
      ]);

      const result = await service.bulkReturnGrades(
        {
          attemptIds: [ATTEMPT_ID, '00000000-0000-0000-0000-000000000051'],
          teacherFeedback: 'Batch feedback',
        },
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result).toEqual({
        returned: 2,
        attemptIds: [ATTEMPT_ID, '00000000-0000-0000-0000-000000000051'],
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.grades.bulk_returned',
          targetType: 'assessment_attempt',
          targetId: ATTEMPT_ID,
          metadata: expect.objectContaining({
            returned: 2,
            attemptIds: [ATTEMPT_ID, '00000000-0000-0000-0000-000000000051'],
            assessmentIds: [ASSESSMENT_ID],
          }),
        }),
      );
    });
  });

  describe('assessment read ownership', () => {
    it('should reject getAssessmentAttempts for non-owner teachers', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-2' },
      });

      await expect(
        service.getAssessmentAttempts(ASSESSMENT_ID, {
          userId: 'teacher-1',
          roles: ['teacher'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteAssessment', () => {
    it('should throw NotFoundException if assessment does not exist', async () => {
      db.query.assessments.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteAssessment('nonexistent', {
          userId: 'teacher-1',
          roles: ['teacher'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject deleteAssessment for non-owner teacher class', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-2' },
      });

      await expect(
        service.deleteAssessment(ASSESSMENT_ID, {
          userId: 'teacher-1',
          roles: ['teacher'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createQuestion / deleteQuestion (recalculateTotalPoints)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createQuestion', () => {
    it('should create a question and recalculate total points', async () => {
      // Verify assessment exists
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_ASSESSMENT,
        class: { teacherId: 'teacher-1' },
      });
      // Insert question
      mockInsert(db, [{ ...MOCK_QUESTION }]);
      // Insert options (batch)
      mockInsert(db, []);
      // Recalculate total points: select sum
      mockSelect(db, [{ total: 5 }]);
      // Update assessment totalPoints
      mockUpdateReturning(db, [{ ...MOCK_ASSESSMENT, totalPoints: 5 }]);
      // getQuestionById at the end
      db.query.assessmentQuestions.findFirst.mockResolvedValue(MOCK_QUESTION);

      const result = await service.createQuestion({
        assessmentId: ASSESSMENT_ID,
        type: 'multiple_choice',
        content: 'What is 1+1?',
        points: 5,
        order: 1,
        options: [
          { text: '2', isCorrect: true, order: 1 },
          { text: '3', isCorrect: false, order: 2 },
        ],
      } as any, {
        userId: 'teacher-1',
        roles: ['teacher'],
      });

      expect(result.id).toBe(QUESTION_ID);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.question.created',
          targetType: 'assessment_question',
          targetId: QUESTION_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            type: 'multiple_choice',
            points: 5,
          }),
        }),
      );
    });

    it('should reject createQuestion for non-owner teacher', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_ASSESSMENT,
        class: { teacherId: 'teacher-2' },
      });

      await expect(
        service.createQuestion(
          {
            assessmentId: ASSESSMENT_ID,
            type: 'multiple_choice',
            content: 'Question',
            points: 5,
            order: 1,
            options: [],
          } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject createQuestion when class ownership metadata is missing for teacher', async () => {
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_ASSESSMENT,
        class: { teacherId: null },
      });

      await expect(
        service.createQuestion(
          {
            assessmentId: ASSESSMENT_ID,
            type: 'multiple_choice',
            content: 'Question',
            points: 5,
            order: 1,
            options: [],
          } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('question mutation ownership and audit', () => {
    it('should reject updateQuestion for non-owner teacher', async () => {
      db.query.assessmentQuestions.findFirst
        .mockResolvedValueOnce({
          ...MOCK_QUESTION,
          options: [],
        })
        .mockResolvedValueOnce({
          assessmentId: ASSESSMENT_ID,
        });
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-2' },
      });

      await expect(
        service.updateQuestion(
          QUESTION_ID,
          { content: 'Updated question' } as any,
          { userId: 'teacher-1', roles: ['teacher'] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should write audit metadata when updateQuestion succeeds', async () => {
      db.query.assessmentQuestions.findFirst
        .mockResolvedValueOnce({
          ...MOCK_QUESTION,
          options: [],
        })
        .mockResolvedValueOnce({
          ...MOCK_QUESTION,
          points: 6,
          options: [],
        })
        .mockResolvedValueOnce({
          assessmentId: ASSESSMENT_ID,
        });
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-1' },
      });
      mockUpdate(db);
      mockSelect(db, [{ total: 6 }]);
      mockUpdateReturning(db, [{ ...MOCK_PUBLISHED_ASSESSMENT, totalPoints: 6 }]);

      const result = await service.updateQuestion(
        QUESTION_ID,
        { content: 'Updated', points: 6 } as any,
        { userId: 'teacher-1', roles: ['teacher'] },
      );

      expect(result.points).toBe(6);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.question.updated',
          targetType: 'assessment_question',
          targetId: QUESTION_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            points: 6,
            optionsReplaced: false,
          }),
        }),
      );
    });

    it('should write audit metadata when deleteQuestion succeeds', async () => {
      db.query.assessmentQuestions.findFirst
        .mockResolvedValueOnce({
          ...MOCK_QUESTION,
          options: [],
        })
        .mockResolvedValueOnce({
          assessmentId: ASSESSMENT_ID,
        });
      db.query.assessments.findFirst.mockResolvedValue({
        ...MOCK_PUBLISHED_ASSESSMENT,
        class: { teacherId: 'teacher-1' },
      });
      mockDelete(db);
      mockSelect(db, [{ total: 0 }]);
      mockUpdateReturning(db, [{ ...MOCK_PUBLISHED_ASSESSMENT, totalPoints: 0 }]);

      const result = await service.deleteQuestion(QUESTION_ID, {
        userId: 'teacher-1',
        roles: ['teacher'],
      });

      expect(result.success).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher-1',
          action: 'assessment.question.deleted',
          targetType: 'assessment_question',
          targetId: QUESTION_ID,
          metadata: expect.objectContaining({
            assessmentId: ASSESSMENT_ID,
            classId: CLASS_ID,
            type: 'multiple_choice',
            order: 1,
          }),
        }),
      );
    });
  });
});

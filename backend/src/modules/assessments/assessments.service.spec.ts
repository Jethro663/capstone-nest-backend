import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentsService } from './assessments.service';
import { DatabaseService } from '../../database/database.service';

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
  questions: [MOCK_QUESTION],
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
  submittedAt: null,
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
      classes: { findFirst: jest.fn() },
      users: { findFirst: jest.fn() },
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

  beforeEach(async () => {
    db = buildMockDb();
    eventEmitter = { emit: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: DatabaseService, useValue: db },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
    // Override the db getter (service expects this.db which is injected via DatabaseService)
    (service as any).db = db;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createAssessment
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createAssessment', () => {
    it('should create an assessment with default totalPoints 0', async () => {
      const created = { ...MOCK_ASSESSMENT, totalPoints: 0 };
      mockInsert(db, [created]);

      const result = await service.createAssessment({
        title: 'Test Quiz',
        classId: CLASS_ID,
      } as any);

      expect(result).toEqual(created);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should pass maxAttempts and timeLimitMinutes through', async () => {
      const created = { ...MOCK_ASSESSMENT, totalPoints: 0, maxAttempts: 3, timeLimitMinutes: 30 };
      mockInsert(db, [created]);

      const result = await service.createAssessment({
        title: 'Timed Quiz',
        classId: CLASS_ID,
        maxAttempts: 3,
        timeLimitMinutes: 30,
      } as any);

      expect(result.maxAttempts).toBe(3);
      expect(result.timeLimitMinutes).toBe(30);
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
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
      const result = await service.getAssessmentById(ASSESSMENT_ID);
      expect(result.id).toBe(ASSESSMENT_ID);
      expect(result.questions).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // updateAssessment — publish validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateAssessment', () => {
    it('should update title without validation when not publishing', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_ASSESSMENT);
      mockUpdateReturning(db, [{ ...MOCK_ASSESSMENT, title: 'Updated' }]);

      const result = await service.updateAssessment(ASSESSMENT_ID, {
        title: 'Updated',
      } as any);

      expect(result.title).toBe('Updated');
    });

    it('should reject publish when there are no questions', async () => {
      const noQuestionsAssessment = { ...MOCK_ASSESSMENT, questions: [] };
      db.query.assessments.findFirst.mockResolvedValue(noQuestionsAssessment);

      await expect(
        service.updateAssessment(ASSESSMENT_ID, { isPublished: true } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject publish when passingScore is not set', async () => {
      const noPassing = { ...MOCK_ASSESSMENT, passingScore: null, questions: [MOCK_QUESTION] };
      db.query.assessments.findFirst.mockResolvedValue(noPassing);

      await expect(
        service.updateAssessment(ASSESSMENT_ID, { isPublished: true } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow publish when assessment has valid questions', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
      mockUpdateReturning(db, [{ ...MOCK_PUBLISHED_ASSESSMENT }]);

      const result = await service.updateAssessment(ASSESSMENT_ID, {
        isPublished: true,
      } as any);

      expect(result.isPublished).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // startAttempt — multi-attempt logic
  // ═══════════════════════════════════════════════════════════════════════════

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
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
      // findFirst for unsubmitted attempt
      db.query.assessmentAttempts.findFirst.mockResolvedValue(MOCK_ATTEMPT);

      const result = await service.startAttempt(STUDENT_ID, ASSESSMENT_ID);
      expect(result.attempt.id).toBe(ATTEMPT_ID);
    });

    it('should reject when maxAttempts reached', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
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
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
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
      const timedAssessment = { ...MOCK_PUBLISHED_ASSESSMENT, timeLimitMinutes: 30 };
      db.query.assessments.findFirst.mockResolvedValue(timedAssessment);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(null);
      db.query.assessmentAttempts.findMany.mockResolvedValue([]);
      mockInsert(db, [{ ...MOCK_ATTEMPT, attemptNumber: 1 }]);

      const result = await service.startAttempt(STUDENT_ID, ASSESSMENT_ID);
      expect(result.timeLimitMinutes).toBe(30);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // submitAssessment — scoring
  // ═══════════════════════════════════════════════════════════════════════════

  describe('submitAssessment', () => {
    it('should throw if no active attempt found', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
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
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(MOCK_ATTEMPT);

      // update attempt as submitted
      mockUpdateReturning(db, [{ ...MOCK_ATTEMPT, isSubmitted: true }]);
      // insert response
      mockInsert(db, [{
        id: 'resp-1',
        attemptId: ATTEMPT_ID,
        questionId: QUESTION_ID,
        selectedOptionId: OPTION_ID_A,
        isCorrect: true,
        pointsEarned: 5,
      }]);
      // update attempt with score
      mockUpdateReturning(db, [{
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        score: 100,
        passed: true,
      }]);

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
    });

    it('should give 0 points for wrong answer', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(MOCK_ATTEMPT);

      mockUpdateReturning(db, [{ ...MOCK_ATTEMPT, isSubmitted: true }]);
      mockInsert(db, [{
        id: 'resp-1',
        attemptId: ATTEMPT_ID,
        questionId: QUESTION_ID,
        selectedOptionId: OPTION_ID_B,
        isCorrect: false,
        pointsEarned: 0,
      }]);
      mockUpdateReturning(db, [{
        ...MOCK_ATTEMPT,
        isSubmitted: true,
        score: 0,
        passed: false,
      }]);

      const result = await service.submitAssessment(STUDENT_ID, {
        assessmentId: ASSESSMENT_ID,
        responses: [{ questionId: QUESTION_ID, selectedOptionId: OPTION_ID_B }],
        timeSpentSeconds: 30,
      });

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('should throw for unknown questionId', async () => {
      db.query.assessments.findFirst.mockResolvedValue(MOCK_PUBLISHED_ASSESSMENT);
      db.query.assessmentAttempts.findFirst.mockResolvedValue(MOCK_ATTEMPT);
      mockUpdateReturning(db, [{ ...MOCK_ATTEMPT, isSubmitted: true }]);

      await expect(
        service.submitAssessment(STUDENT_ID, {
          assessmentId: ASSESSMENT_ID,
          responses: [{ questionId: 'unknown-id', selectedOptionId: OPTION_ID_A }],
          timeSpentSeconds: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // deleteAssessment
  // ═══════════════════════════════════════════════════════════════════════════

  describe('deleteAssessment', () => {
    it('should throw NotFoundException if assessment does not exist', async () => {
      db.query.assessments.findFirst.mockResolvedValue(null);
      await expect(service.deleteAssessment('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createQuestion / deleteQuestion (recalculateTotalPoints)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createQuestion', () => {
    it('should create a question and recalculate total points', async () => {
      // Insert question
      mockInsert(db, [{ ...MOCK_QUESTION }]);
      // Insert options (2 calls)
      mockInsert(db, [MOCK_QUESTION.options[0]]);
      mockInsert(db, [MOCK_QUESTION.options[1]]);
      // Recalculate total points: select sum
      mockSelect(db, [{ total: 5 }]);
      // Update assessment totalPoints
      mockUpdateReturning(db, [{ ...MOCK_ASSESSMENT, totalPoints: 5 }]);

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
      } as any);

      expect(result.id).toBe(QUESTION_ID);
    });
  });
});

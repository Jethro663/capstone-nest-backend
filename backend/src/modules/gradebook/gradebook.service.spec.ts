import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GradebookService } from './gradebook.service';
import { GradebookComputationService } from './gradebook-computation.service';
import { GradebookSyncService } from './gradebook-sync.service';
import { DatabaseService } from '../../database/database.service';
import { StudentGradeResult } from './gradebook-computation.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GB_ID   = 'gb-uuid-1';
const CLS_ID  = 'class-uuid-1';
const SEC_ID  = 'section-uuid-1';
const TCH_ID  = 'teacher-uuid-1';
const TCH2_ID = 'teacher-uuid-2';
const STU_A   = 'student-a-uuid';
const STU_B   = 'student-b-uuid';
const CAT_ID  = 'cat-uuid-1';
const ITEM_ID = 'item-uuid-1';
const SCORE_ID = 'score-uuid-1';
const FG_ID   = 'fg-uuid-1';
const ADM_ID  = 'admin-uuid-1';

const ADMIN_ROLES   = ['admin'];
const TEACHER_ROLES = ['teacher'];
const STUDENT_ROLES = ['student'];

const makeGradebook = (overrides: Partial<any> = {}) => ({
  id: GB_ID,
  classId: CLS_ID,
  teacherId: TCH_ID,
  gradingPeriod: 'Q1',
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeClass = (overrides: Partial<any> = {}) => ({
  id: CLS_ID,
  teacherId: TCH_ID,
  sectionId: SEC_ID,
  subjectName: 'Mathematics',
  subjectCode: 'MATH-7',
  ...overrides,
});

const makeCategory = (overrides: Partial<any> = {}) => ({
  id: CAT_ID,
  gradebookId: GB_ID,
  name: 'Written Works',
  weightPercentage: '30.00',
  gradebook: makeGradebook(),
  ...overrides,
});

const makeItem = (overrides: Partial<any> = {}) => ({
  id: ITEM_ID,
  gradebookId: GB_ID,
  categoryId: CAT_ID,
  assessmentId: null,
  title: 'Quiz 1',
  maxScore: '50.00',
  gradebook: makeGradebook(),
  ...overrides,
});

const makeScore = (overrides: Partial<any> = {}) => ({
  id: SCORE_ID,
  gradebookItemId: ITEM_ID,
  studentId: STU_A,
  score: '40.00',
  ...overrides,
});

const makeFinalGrade = (overrides: Partial<any> = {}) => ({
  id: FG_ID,
  gradebookId: GB_ID,
  studentId: STU_A,
  finalPercentage: '85.000',
  remarks: 'Passed',
  computedAt: new Date(),
  student: { id: STU_A, firstName: 'Ana', lastName: 'Santos', email: 'ana@school.edu' },
  ...overrides,
});

const makeGradeResult = (studentId: string, pct: number): StudentGradeResult => ({
  studentId,
  finalPercentage: pct,
  remarks: pct < 74 ? 'For Intervention' : 'Passed',
  categoryBreakdown: [],
});

const makeSection = (overrides: Partial<any> = {}) => ({
  id: SEC_ID,
  name: 'Sampaguita',
  adviserId: TCH_ID,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

const makeInsertChain = (rows: any[] = []) => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(rows),
  onConflictDoUpdate: jest.fn().mockReturnThis(),
});

const makeUpdateChain = (rows: any[] = []) => {
  const chain: any = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(rows),
  };
  // make where() also resolve (for callers that don't call .returning())
  chain.where.mockImplementation(() => chain);
  return chain;
};

const makeDeleteChain = () => ({
  where: jest.fn().mockResolvedValue(undefined),
});

const buildMockDb = () => ({
  query: {
    gradebooks: {
      findFirst: jest.fn().mockResolvedValue(makeGradebook()),
      findMany: jest.fn().mockResolvedValue([makeGradebook()]),
    },
    classes: {
      findFirst: jest.fn().mockResolvedValue(makeClass()),
      findMany: jest.fn().mockResolvedValue([makeClass()]),
    },
    sections: {
      findFirst: jest.fn().mockResolvedValue(makeSection()),
    },
    gradebookCategories: {
      findFirst: jest.fn().mockResolvedValue(makeCategory()),
      findMany: jest.fn().mockResolvedValue([makeCategory()]),
    },
    gradebookItems: {
      findFirst: jest.fn().mockResolvedValue(makeItem()),
      findMany: jest.fn().mockResolvedValue([makeItem()]),
    },
    gradebookFinalGrades: {
      findFirst: jest.fn().mockResolvedValue(makeFinalGrade()),
      findMany: jest.fn().mockResolvedValue([makeFinalGrade()]),
    },
  },
  insert: jest.fn().mockReturnValue(makeInsertChain()),
  update: jest.fn().mockReturnValue(makeUpdateChain()),
  delete: jest.fn().mockReturnValue(makeDeleteChain()),
  transaction: jest.fn().mockImplementation(async (fn: any) => fn({
    insert: jest.fn().mockReturnValue(makeInsertChain()),
    update: jest.fn().mockReturnValue(makeUpdateChain()),
    delete: jest.fn().mockReturnValue(makeDeleteChain()),
  })),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GradebookService', () => {
  let service: GradebookService;
  let mockDb: any;
  let mockComputationService: jest.Mocked<GradebookComputationService>;
  let mockSyncService: jest.Mocked<GradebookSyncService>;

  beforeEach(async () => {
    mockDb = buildMockDb();

    mockComputationService = {
      validateCategoryWeights: jest.fn().mockResolvedValue(undefined),
      computeGrades: jest.fn().mockResolvedValue(
        new Map([
          [STU_A, makeGradeResult(STU_A, 85)],
          [STU_B, makeGradeResult(STU_B, 55)],
        ]),
      ),
    } as any;

    mockSyncService = {
      syncFromAssessment: jest.fn().mockResolvedValue({ synced: 3 }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradebookService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: GradebookComputationService, useValue: mockComputationService },
        { provide: GradebookSyncService, useValue: mockSyncService },
      ],
    }).compile();

    service = module.get<GradebookService>(GradebookService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // createGradebook
  // =========================================================================

  describe('createGradebook', () => {
    const dto = { classId: CLS_ID, gradingPeriod: 'Q1' as const };

    it('creates and returns a new gradebook', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(null); // no existing
      mockDb.insert.mockReturnValue(makeInsertChain([makeGradebook()]));

      const result = await service.createGradebook(dto, TCH_ID, TEACHER_ROLES);

      expect(result).toMatchObject({ classId: CLS_ID, gradingPeriod: 'Q1' });
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when class does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(null);
      await expect(
        service.createGradebook(dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when teacher does not own the class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass({ teacherId: TCH2_ID }));
      await expect(
        service.createGradebook(dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to create gradebook for any class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass({ teacherId: TCH2_ID }));
      mockDb.query.gradebooks.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue(makeInsertChain([makeGradebook()]));

      await expect(
        service.createGradebook(dto, ADM_ID, ADMIN_ROLES),
      ).resolves.toBeDefined();
    });

    it('throws ConflictException when a gradebook already exists for that period', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(makeGradebook());
      await expect(
        service.createGradebook(dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // getGradebook
  // =========================================================================

  describe('getGradebook', () => {
    it('returns the gradebook for the owning teacher', async () => {
      const result = await service.getGradebook(GB_ID, TCH_ID, TEACHER_ROLES);
      expect(result).toMatchObject({ id: GB_ID });
    });

    it('throws NotFoundException when not found', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(null);
      await expect(
        service.getGradebook('bad-id', TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when accessed by a different teacher', async () => {
      await expect(
        service.getGradebook(GB_ID, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to access any gradebook', async () => {
      await expect(
        service.getGradebook(GB_ID, ADM_ID, ADMIN_ROLES),
      ).resolves.toBeDefined();
    });
  });

  // =========================================================================
  // listGradebooksForClass
  // =========================================================================

  describe('listGradebooksForClass', () => {
    it('returns all gradebooks for the class', async () => {
      const result = await service.listGradebooksForClass(CLS_ID, TCH_ID, TEACHER_ROLES);
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws NotFoundException when class does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(null);
      await expect(
        service.listGradebooksForClass(CLS_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when teacher does not own the class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass({ teacherId: TCH2_ID }));
      await expect(
        service.listGradebooksForClass(CLS_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // addCategory
  // =========================================================================

  describe('addCategory', () => {
    const dto = { name: 'Written Works', weightPercentage: 30 };

    it('inserts and returns the new category', async () => {
      mockDb.insert.mockReturnValue(makeInsertChain([makeCategory()]));
      const result = await service.addCategory(GB_ID, dto, TCH_ID, TEACHER_ROLES);
      expect(result).toMatchObject({ name: 'Written Works' });
    });

    it('throws ConflictException when gradebook is locked', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(
        makeGradebook({ status: 'locked' }),
      );
      await expect(
        service.addCategory(GB_ID, dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when gradebook is finalized', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(
        makeGradebook({ status: 'finalized' }),
      );
      await expect(
        service.addCategory(GB_ID, dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when gradebook does not exist', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(null);
      await expect(
        service.addCategory(GB_ID, dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when called by non-owner teacher', async () => {
      await expect(
        service.addCategory(GB_ID, dto, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // updateCategory
  // =========================================================================

  describe('updateCategory', () => {
    const dto = { name: 'Quarterly Assessment', weightPercentage: 35 };

    it('updates and returns the category', async () => {
      mockDb.update.mockReturnValue(makeUpdateChain([makeCategory({ name: 'Quarterly Assessment' })]));
      const result = await service.updateCategory(CAT_ID, dto, TCH_ID, TEACHER_ROLES);
      expect(result).toMatchObject({ name: 'Quarterly Assessment' });
    });

    it('throws NotFoundException when category does not exist', async () => {
      mockDb.query.gradebookCategories.findFirst.mockResolvedValue(null);
      await expect(
        service.updateCategory('bad-id', dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(
        service.updateCategory(CAT_ID, dto, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when gradebook is locked', async () => {
      mockDb.query.gradebookCategories.findFirst.mockResolvedValue(
        makeCategory({ gradebook: makeGradebook({ status: 'locked' }) }),
      );
      await expect(
        service.updateCategory(CAT_ID, dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // deleteCategory
  // =========================================================================

  describe('deleteCategory', () => {
    it('deletes the category and returns confirmation', async () => {
      const result = await service.deleteCategory(CAT_ID, TCH_ID, TEACHER_ROLES);
      expect(result).toEqual({ deleted: true, id: CAT_ID });
    });

    it('throws NotFoundException when category does not exist', async () => {
      mockDb.query.gradebookCategories.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteCategory('bad-id', TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when gradebook is locked', async () => {
      mockDb.query.gradebookCategories.findFirst.mockResolvedValue(
        makeCategory({ gradebook: makeGradebook({ status: 'locked' }) }),
      );
      await expect(
        service.deleteCategory(CAT_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(
        service.deleteCategory(CAT_ID, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // addItem
  // =========================================================================

  describe('addItem', () => {
    const dto = { categoryId: CAT_ID, title: 'Quiz 1', maxScore: 50 };

    it('inserts and returns the new item', async () => {
      mockDb.query.gradebookCategories.findFirst.mockResolvedValue(makeCategory());
      mockDb.insert.mockReturnValue(makeInsertChain([makeItem()]));

      const result = await service.addItem(GB_ID, dto, TCH_ID, TEACHER_ROLES);
      expect(result).toMatchObject({ title: 'Quiz 1' });
    });

    it('throws NotFoundException when category does not belong to gradebook', async () => {
      mockDb.query.gradebookCategories.findFirst.mockResolvedValue(null);
      await expect(
        service.addItem(GB_ID, dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when gradebook is locked', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(
        makeGradebook({ status: 'locked' }),
      );
      await expect(
        service.addItem(GB_ID, dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });

    it('stores null assessmentId when not provided', async () => {
      mockDb.query.gradebookCategories.findFirst.mockResolvedValue(makeCategory());
      mockDb.insert.mockReturnValue(makeInsertChain([makeItem()]));

      await service.addItem(GB_ID, { ...dto, assessmentId: undefined }, TCH_ID, TEACHER_ROLES);

      const insertValues = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertValues.assessmentId).toBeNull();
    });
  });

  // =========================================================================
  // updateItem
  // =========================================================================

  describe('updateItem', () => {
    it('updates and returns the item', async () => {
      mockDb.update.mockReturnValue(makeUpdateChain([makeItem({ title: 'Updated Quiz' })]));
      const result = await service.updateItem(
        ITEM_ID,
        { title: 'Updated Quiz' },
        TCH_ID,
        TEACHER_ROLES,
      );
      expect(result).toMatchObject({ title: 'Updated Quiz' });
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(null);
      await expect(
        service.updateItem(ITEM_ID, { title: 'X' }, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(
        service.updateItem(ITEM_ID, { title: 'X' }, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // deleteItem
  // =========================================================================

  describe('deleteItem', () => {
    it('deletes the item and returns confirmation', async () => {
      const result = await service.deleteItem(ITEM_ID, TCH_ID, TEACHER_ROLES);
      expect(result).toEqual({ deleted: true, id: ITEM_ID });
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteItem(ITEM_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when gradebook is locked', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(
        makeItem({ gradebook: makeGradebook({ status: 'locked' }) }),
      );
      await expect(
        service.deleteItem(ITEM_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // recordScore
  // =========================================================================

  describe('recordScore', () => {
    const dto = { studentId: STU_A, score: 40 };

    it('upserts and returns the score record', async () => {
      mockDb.insert.mockReturnValue({
        ...makeInsertChain([makeScore()]),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
      });
      const result = await service.recordScore(ITEM_ID, dto, TCH_ID, TEACHER_ROLES);
      expect(result).toMatchObject({ score: '40.00' });
    });

    it('throws BadRequestException when score exceeds maxScore', async () => {
      await expect(
        service.recordScore(ITEM_ID, { ...dto, score: 100 }, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows score equal to maxScore (exact maximum)', async () => {
      mockDb.insert.mockReturnValue({
        ...makeInsertChain([makeScore({ score: '50.00' })]),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
      });
      await expect(
        service.recordScore(ITEM_ID, { studentId: STU_A, score: 50 }, TCH_ID, TEACHER_ROLES),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(null);
      await expect(
        service.recordScore('bad-id', dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when gradebook is locked', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(
        makeItem({ gradebook: makeGradebook({ status: 'locked' }) }),
      );
      await expect(
        service.recordScore(ITEM_ID, dto, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException for non-owner teacher', async () => {
      await expect(
        service.recordScore(ITEM_ID, dto, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // bulkRecordScores
  // =========================================================================

  describe('bulkRecordScores', () => {
    const dto = {
      scores: [
        { studentId: STU_A, score: 40 },
        { studentId: STU_B, score: 35 },
      ],
    };

    it('saves all scores and returns saved count', async () => {
      mockDb.insert.mockReturnValue({
        ...makeInsertChain([makeScore()]),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
      });
      const result = await service.bulkRecordScores(ITEM_ID, dto, TCH_ID, TEACHER_ROLES);
      expect(result.saved).toBe(2);
    });

    it('throws BadRequestException when any score exceeds maxScore', async () => {
      await expect(
        service.bulkRecordScores(
          ITEM_ID,
          { scores: [{ studentId: STU_A, score: 200 }] },
          TCH_ID,
          TEACHER_ROLES,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('includes student id in the error message when score is invalid', async () => {
      await expect(
        service.bulkRecordScores(
          ITEM_ID,
          { scores: [{ studentId: STU_A, score: 99 }] },
          TCH_ID,
          TEACHER_ROLES,
        ),
      ).rejects.toThrow(STU_A);
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(
        service.bulkRecordScores(ITEM_ID, dto, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // syncScoresFromAssessment
  // =========================================================================

  describe('syncScoresFromAssessment', () => {
    it('delegates to GradebookSyncService and returns result', async () => {
      const result = await service.syncScoresFromAssessment(ITEM_ID, TCH_ID, TEACHER_ROLES);
      expect(result).toEqual({ synced: 3 });
      expect(mockSyncService.syncFromAssessment).toHaveBeenCalledWith(ITEM_ID, TCH_ID);
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(null);
      await expect(
        service.syncScoresFromAssessment(ITEM_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(
        service.syncScoresFromAssessment(ITEM_ID, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // previewGrades
  // =========================================================================

  describe('previewGrades', () => {
    it('delegates to computation service and returns preview array', async () => {
      const result = await service.previewGrades(GB_ID, TCH_ID, TEACHER_ROLES);
      expect(result.gradebookId).toBe(GB_ID);
      expect(result.preview).toHaveLength(2);
      expect(mockComputationService.computeGrades).toHaveBeenCalledWith(GB_ID);
    });

    it('calculates the correct interventionCount', async () => {
      const result = await service.previewGrades(GB_ID, TCH_ID, TEACHER_ROLES);
      // STU_B has 55% → For Intervention
      expect(result.interventionCount).toBe(1);
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(
        service.previewGrades(GB_ID, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // finalizeGradebook
  // =========================================================================

  describe('finalizeGradebook', () => {
    it('validates weights, computes grades, inserts final grades, marks finalized', async () => {
      const result = await service.finalizeGradebook(GB_ID, TCH_ID, TEACHER_ROLES);

      expect(mockComputationService.validateCategoryWeights).toHaveBeenCalledTimes(1);
      expect(mockComputationService.computeGrades).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ gradeCount: 2 });
    });

    it('throws ConflictException when gradebook is already locked', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(
        makeGradebook({ status: 'locked' }),
      );
      await expect(
        service.finalizeGradebook(GB_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when gradebook is already finalized', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(
        makeGradebook({ status: 'finalized' }),
      );
      await expect(
        service.finalizeGradebook(GB_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when called by non-owner teacher', async () => {
      await expect(
        service.finalizeGradebook(GB_ID, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });

    it('propagates UnprocessableEntityException from validateCategoryWeights', async () => {
      mockComputationService.validateCategoryWeights.mockRejectedValue(
        new UnprocessableEntityException('Weights do not sum to 100%'),
      );
      // Need to re-throw inside transaction
      mockDb.transaction.mockImplementation(async (fn: any) => fn({
        insert: jest.fn().mockReturnValue(makeInsertChain()),
        update: jest.fn().mockReturnValue(makeUpdateChain()),
        delete: jest.fn().mockReturnValue(makeDeleteChain()),
      }));
      await expect(
        service.finalizeGradebook(GB_ID, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('includes interventionCount in the return value', async () => {
      // Simulate one intervention grade in the post-transaction query
      mockDb.query.gradebookFinalGrades.findMany.mockResolvedValue([
        makeFinalGrade({ remarks: 'Passed' }),
        makeFinalGrade({ studentId: STU_B, remarks: 'For Intervention' }),
      ]);

      const result = await service.finalizeGradebook(GB_ID, TCH_ID, TEACHER_ROLES);
      expect(result.interventionCount).toBe(1);
    });

    it('allows admin to finalize any gradebook', async () => {
      await expect(
        service.finalizeGradebook(GB_ID, ADM_ID, ADMIN_ROLES),
      ).resolves.toBeDefined();
    });
  });

  // =========================================================================
  // getFinalGrades
  // =========================================================================

  describe('getFinalGrades', () => {
    it('returns all final grades for a gradebook', async () => {
      const result = await service.getFinalGrades(GB_ID, TCH_ID, TEACHER_ROLES);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toMatchObject({ gradebookId: GB_ID });
    });

    it('throws NotFoundException when gradebook does not exist', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(null);
      await expect(
        service.getFinalGrades('bad-id', TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for non-owner teacher', async () => {
      await expect(
        service.getFinalGrades(GB_ID, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // getStudentGrade
  // =========================================================================

  describe('getStudentGrade', () => {
    it("teacher can view any student's grade", async () => {
      const result = await service.getStudentGrade(GB_ID, STU_A, TCH_ID, TEACHER_ROLES);
      expect(result).toMatchObject({ studentId: STU_A });
    });

    it("student can view their own grade", async () => {
      const result = await service.getStudentGrade(GB_ID, STU_A, STU_A, STUDENT_ROLES);
      expect(result).toMatchObject({ studentId: STU_A });
    });

    it("student cannot view another student's grade", async () => {
      await expect(
        service.getStudentGrade(GB_ID, STU_A, STU_B, STUDENT_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when no grade record exists', async () => {
      mockDb.query.gradebookFinalGrades.findFirst.mockResolvedValue(null);
      await expect(
        service.getStudentGrade(GB_ID, STU_A, TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('admin can view any grade', async () => {
      await expect(
        service.getStudentGrade(GB_ID, STU_A, ADM_ID, ADMIN_ROLES),
      ).resolves.toBeDefined();
    });
  });

  // =========================================================================
  // listAdviserSection
  // =========================================================================

  describe('listAdviserSection', () => {
    it('returns section info with gradebooks grouped by class', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([
        makeClass(), makeClass({ id: 'class-2', subjectName: 'Science' }),
      ]);
      mockDb.query.gradebooks.findMany.mockResolvedValue([makeGradebook()]);

      const result = await service.listAdviserSection(SEC_ID, TCH_ID, TEACHER_ROLES) as any;

      expect(result).toMatchObject({ sectionId: SEC_ID, sectionName: 'Sampaguita' });
      expect(Array.isArray(result.classes)).toBe(true);
    });

    it('returns empty classes array when section has no classes', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([]);

      const result = await service.listAdviserSection(SEC_ID, TCH_ID, TEACHER_ROLES);
      expect(result).toEqual([]);
    });

    it('throws NotFoundException when section does not exist', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(null);
      await expect(
        service.listAdviserSection('bad-id', TCH_ID, TEACHER_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the adviser and not admin', async () => {
      await expect(
        service.listAdviserSection(SEC_ID, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to view any section', async () => {
      mockDb.query.sections.findFirst.mockResolvedValue(
        makeSection({ adviserId: TCH_ID }), // different adviser
      );
      mockDb.query.classes.findMany.mockResolvedValue([makeClass()]);
      mockDb.query.gradebooks.findMany.mockResolvedValue([makeGradebook()]);

      await expect(
        service.listAdviserSection(SEC_ID, ADM_ID, ADMIN_ROLES),
      ).resolves.toBeDefined();
    });
  });

  // =========================================================================
  // getClassAverage
  // =========================================================================

  describe('getClassAverage', () => {
    it('returns correct average over multiple grades', async () => {
      mockDb.query.gradebookFinalGrades.findMany.mockResolvedValue([
        makeFinalGrade({ finalPercentage: '90.000', remarks: 'Passed' }),
        makeFinalGrade({ finalPercentage: '70.000', studentId: STU_B, remarks: 'For Intervention' }),
      ]);

      const result = await service.getClassAverage(GB_ID, TCH_ID, TEACHER_ROLES);

      expect(result.average).toBeCloseTo(80, 2);
      expect(result.count).toBe(2);
      expect(result.interventionCount).toBe(1);
    });

    it('returns zero average when no final grades exist', async () => {
      mockDb.query.gradebookFinalGrades.findMany.mockResolvedValue([]);
      const result = await service.getClassAverage(GB_ID, TCH_ID, TEACHER_ROLES);
      expect(result.average).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  // =========================================================================
  // getGradeDistribution
  // =========================================================================

  describe('getGradeDistribution', () => {
    it('bins grades into correct bands', async () => {
      mockDb.query.gradebookFinalGrades.findMany.mockResolvedValue([
        makeFinalGrade({ finalPercentage: '95.000' }), // 90-100
        makeFinalGrade({ finalPercentage: '85.000' }), // 80-89
        makeFinalGrade({ finalPercentage: '76.000' }), // 75-79
        makeFinalGrade({ finalPercentage: '70.000' }), // 65-74
        makeFinalGrade({ finalPercentage: '55.000' }), // Below 65
      ]);

      const result = await service.getGradeDistribution(GB_ID, TCH_ID, TEACHER_ROLES);

      expect(result.distribution['90-100']).toBe(1);
      expect(result.distribution['80-89']).toBe(1);
      expect(result.distribution['75-79']).toBe(1);
      expect(result.distribution['65-74']).toBe(1);
      expect(result.distribution['Below 65']).toBe(1);
      expect(result.total).toBe(5);
    });

    it('returns all zero counts when no grades exist', async () => {
      mockDb.query.gradebookFinalGrades.findMany.mockResolvedValue([]);
      const result = await service.getGradeDistribution(GB_ID, TCH_ID, TEACHER_ROLES);
      expect(Object.values(result.distribution).every((v) => v === 0)).toBe(true);
    });
  });

  // =========================================================================
  // getInterventionList
  // =========================================================================

  describe('getInterventionList', () => {
    it('returns only students flagged For Intervention', async () => {
      mockDb.query.gradebookFinalGrades.findMany.mockResolvedValue([
        makeFinalGrade({ studentId: STU_B, finalPercentage: '55.000', remarks: 'For Intervention', student: { id: STU_B, firstName: 'Bob', lastName: 'Cruz', email: 'bob@school.edu' } }),
      ]);

      const result = await service.getInterventionList(GB_ID, TCH_ID, TEACHER_ROLES);
      expect(result).toHaveLength(1);
      expect(result[0].remarks).toBe('For Intervention');
    });

    it('returns empty array when all students passed', async () => {
      mockDb.query.gradebookFinalGrades.findMany.mockResolvedValue([]);
      const result = await service.getInterventionList(GB_ID, TCH_ID, TEACHER_ROLES);
      expect(result).toHaveLength(0);
    });

    it('throws ForbiddenException for non-owner', async () => {
      await expect(
        service.getInterventionList(GB_ID, TCH2_ID, TEACHER_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

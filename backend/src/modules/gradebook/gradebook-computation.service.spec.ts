import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import {
  GradebookComputationService,
  StudentGradeResult,
} from './gradebook-computation.service';
import { DatabaseService } from '../../database/database.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GRADEBOOK_ID = 'gb-uuid-1';
const CLASS_ID = 'class-uuid-1';
const CAT_WW = 'cat-ww-uuid';  // Written Works 30%
const CAT_PT = 'cat-pt-uuid';  // Performance Tasks 40%
const CAT_QE = 'cat-qe-uuid';  // Quarterly Exam 30%

const STUDENT_A = 'student-a-uuid';
const STUDENT_B = 'student-b-uuid';
const STUDENT_C = 'student-c-uuid'; // intervention student

const ITEM_WW1 = 'item-ww1-uuid';
const ITEM_WW2 = 'item-ww2-uuid';
const ITEM_PT1 = 'item-pt1-uuid';
const ITEM_QE1 = 'item-qe1-uuid';

const makeGradebook = () => ({ classId: CLASS_ID });

const makeCategories = (overrides: any[] = []) =>
  overrides.length
    ? overrides
    : [
        { id: CAT_WW, gradebookId: GRADEBOOK_ID, name: 'Written Works', weightPercentage: '30.00' },
        { id: CAT_PT, gradebookId: GRADEBOOK_ID, name: 'Performance Tasks', weightPercentage: '40.00' },
        { id: CAT_QE, gradebookId: GRADEBOOK_ID, name: 'Quarterly Exam', weightPercentage: '30.00' },
      ];

/** Build items with inline score records */
const makeItems = (withScores = true) => [
  {
    id: ITEM_WW1,
    gradebookId: GRADEBOOK_ID,
    categoryId: CAT_WW,
    maxScore: '20.00',
    scores: withScores
      ? [
          { studentId: STUDENT_A, score: '20.00' }, // 100%
          { studentId: STUDENT_B, score: '14.00' }, // 70%
          { studentId: STUDENT_C, score: '10.00' }, // 50%
        ]
      : [],
  },
  {
    id: ITEM_WW2,
    gradebookId: GRADEBOOK_ID,
    categoryId: CAT_WW,
    maxScore: '20.00',
    scores: withScores
      ? [
          { studentId: STUDENT_A, score: '18.00' }, // 90%
          { studentId: STUDENT_B, score: '16.00' }, // 80%
          { studentId: STUDENT_C, score: '8.00' },  // 40%
        ]
      : [],
  },
  {
    id: ITEM_PT1,
    gradebookId: GRADEBOOK_ID,
    categoryId: CAT_PT,
    maxScore: '50.00',
    scores: withScores
      ? [
          { studentId: STUDENT_A, score: '50.00' }, // 100%
          { studentId: STUDENT_B, score: '40.00' }, // 80%
          { studentId: STUDENT_C, score: '30.00' }, // 60%
        ]
      : [],
  },
  {
    id: ITEM_QE1,
    gradebookId: GRADEBOOK_ID,
    categoryId: CAT_QE,
    maxScore: '100.00',
    scores: withScores
      ? [
          { studentId: STUDENT_A, score: '95.00' }, // 95%
          { studentId: STUDENT_B, score: '75.00' }, // 75%
          { studentId: STUDENT_C, score: '60.00' }, // 60%
        ]
      : [],
  },
];

const makeEnrolled = (students = [STUDENT_A, STUDENT_B, STUDENT_C]) =>
  students.map((s) => ({ studentId: s }));

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

const buildMockDb = (overrides: Partial<any> = {}) => ({
  query: {
    gradebooks: {
      findFirst: jest.fn().mockResolvedValue(makeGradebook()),
    },
    gradebookCategories: {
      findMany: jest.fn().mockResolvedValue(makeCategories()),
    },
    gradebookItems: {
      findMany: jest.fn().mockResolvedValue(makeItems()),
    },
  },
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([{ total: '100.00' }]),
  }),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Helper: set db.select chain to return a specific total
// ---------------------------------------------------------------------------
function mockWeightTotal(db: any, total: string) {
  db.select.mockReturnValue({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([{ total }]),
  });
}

function mockEnrolled(db: any, students = [STUDENT_A, STUDENT_B, STUDENT_C]) {
  db.select = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(makeEnrolled(students)),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GradebookComputationService', () => {
  let service: GradebookComputationService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = buildMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradebookComputationService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile();

    service = module.get<GradebookComputationService>(GradebookComputationService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // validateCategoryWeights
  // =========================================================================

  describe('validateCategoryWeights', () => {
    it('passes when weights sum to exactly 100', async () => {
      mockWeightTotal(mockDb, '100.00');
      await expect(
        service.validateCategoryWeights(GRADEBOOK_ID),
      ).resolves.toBeUndefined();
    });

    it('passes when weights sum to 100.0005 (within tolerance)', async () => {
      mockWeightTotal(mockDb, '100.0005');
      await expect(
        service.validateCategoryWeights(GRADEBOOK_ID),
      ).resolves.toBeUndefined();
    });

    it('throws UnprocessableEntityException when weights sum to 95', async () => {
      mockWeightTotal(mockDb, '95.00');
      await expect(
        service.validateCategoryWeights(GRADEBOOK_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when weights sum to 110', async () => {
      mockWeightTotal(mockDb, '110.00');
      await expect(
        service.validateCategoryWeights(GRADEBOOK_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when no categories exist (sum = 0)', async () => {
      mockWeightTotal(mockDb, '0');
      await expect(
        service.validateCategoryWeights(GRADEBOOK_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('includes the current total in the error message', async () => {
      mockWeightTotal(mockDb, '85.00');
      await expect(
        service.validateCategoryWeights(GRADEBOOK_ID),
      ).rejects.toThrow('85.00%');
    });
  });

  // =========================================================================
  // computeGrades
  // =========================================================================

  describe('computeGrades', () => {
    beforeEach(() => {
      // Redirect select to return enrolled students (separate from weight validation)
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(makeEnrolled()),
      });
    });

    it('returns a Map keyed by studentId for all enrolled students', async () => {
      const result = await service.computeGrades(GRADEBOOK_ID);
      expect(result.size).toBe(3);
      expect(result.has(STUDENT_A)).toBe(true);
      expect(result.has(STUDENT_B)).toBe(true);
      expect(result.has(STUDENT_C)).toBe(true);
    });

    it('computes correct final_percentage for top student (Student A)', async () => {
      /*
       * Student A:
       *  WW:  WW1=100%, WW2=90%  → avg=95%  → weighted = 95 * 0.30 = 28.5
       *  PT:  PT1=100%            → avg=100% → weighted = 100 * 0.40 = 40
       *  QE:  QE1=95%             → avg=95%  → weighted = 95 * 0.30 = 28.5
       *  Final = 28.5 + 40 + 28.5 = 97
       */
      const result = await service.computeGrades(GRADEBOOK_ID);
      const gradeA = result.get(STUDENT_A)!;
      expect(gradeA.finalPercentage).toBeCloseTo(97, 2);
      expect(gradeA.remarks).toBe('Passed');
    });

    it('computes correct final_percentage for average student (Student B)', async () => {
      /*
       * Student B:
       *  WW:  WW1=70%, WW2=80%  → avg=75%  → weighted = 75 * 0.30 = 22.5
       *  PT:  PT1=80%            → avg=80%  → weighted = 80 * 0.40 = 32
       *  QE:  QE1=75%            → avg=75%  → weighted = 75 * 0.30 = 22.5
       *  Final = 22.5 + 32 + 22.5 = 77
       */
      const result = await service.computeGrades(GRADEBOOK_ID);
      const gradeB = result.get(STUDENT_B)!;
      expect(gradeB.finalPercentage).toBeCloseTo(77, 2);
      expect(gradeB.remarks).toBe('Passed');
    });

    it('flags student below 74% as For Intervention (Student C)', async () => {
      /*
       * Student C:
       *  WW:  WW1=50%, WW2=40%  → avg=45%  → weighted = 45 * 0.30 = 13.5
       *  PT:  PT1=60%            → avg=60%  → weighted = 60 * 0.40 = 24
       *  QE:  QE1=60%            → avg=60%  → weighted = 60 * 0.30 = 18
       *  Final = 13.5 + 24 + 18 = 55.5
       */
      const result = await service.computeGrades(GRADEBOOK_ID);
      const gradeC = result.get(STUDENT_C)!;
      expect(gradeC.finalPercentage).toBeCloseTo(55.5, 2);
      expect(gradeC.remarks).toBe('For Intervention');
    });

    it('returns "For Intervention" exactly at the boundary (74% - epsilon)', async () => {
      // Override items so the student scores just below 74%
      // Simple: one category 100%, one item, score = 73.9 / 100
      mockDb.query.gradebookCategories.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Total', weightPercentage: '100.00' },
      ]);
      mockDb.query.gradebookItems.findMany.mockResolvedValue([
        { id: 'item-1', categoryId: 'cat-1', maxScore: '100.00', scores: [
          { studentId: STUDENT_A, score: '73.9' },
        ]},
      ]);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ studentId: STUDENT_A }]),
      });

      const result = await service.computeGrades(GRADEBOOK_ID);
      expect(result.get(STUDENT_A)!.remarks).toBe('For Intervention');
    });

    it('returns "Passed" exactly at 74%', async () => {
      mockDb.query.gradebookCategories.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Total', weightPercentage: '100.00' },
      ]);
      mockDb.query.gradebookItems.findMany.mockResolvedValue([
        { id: 'item-1', categoryId: 'cat-1', maxScore: '100.00', scores: [
          { studentId: STUDENT_A, score: '74.00' },
        ]},
      ]);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ studentId: STUDENT_A }]),
      });

      const result = await service.computeGrades(GRADEBOOK_ID);
      expect(result.get(STUDENT_A)!.remarks).toBe('Passed');
    });

    it('treats a missing score as 0 (absent student)', async () => {
      // STUDENT_A has no score for QE1
      mockDb.query.gradebookCategories.findMany.mockResolvedValue([
        { id: CAT_QE, name: 'Quarterly Exam', weightPercentage: '100.00' },
      ]);
      mockDb.query.gradebookItems.findMany.mockResolvedValue([
        { id: ITEM_QE1, categoryId: CAT_QE, maxScore: '100.00', scores: [] }, // no scores
      ]);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ studentId: STUDENT_A }]),
      });

      const result = await service.computeGrades(GRADEBOOK_ID);
      // Score = 0 / 100 * 100 = 0%  → final = 0 * (100/100) = 0
      expect(result.get(STUDENT_A)!.finalPercentage).toBe(0);
      expect(result.get(STUDENT_A)!.remarks).toBe('For Intervention');
    });

    it('includes per-category breakdown in the result', async () => {
      const result = await service.computeGrades(GRADEBOOK_ID);
      const gradeA = result.get(STUDENT_A)!;
      expect(gradeA.categoryBreakdown).toHaveLength(3);
      const wwBreakdown = gradeA.categoryBreakdown.find(
        (b) => b.categoryId === CAT_WW,
      );
      expect(wwBreakdown).toBeDefined();
      expect(wwBreakdown!.weightPercentage).toBe(30);
    });

    it('throws UnprocessableEntityException when gradebook is not found', async () => {
      mockDb.query.gradebooks.findFirst.mockResolvedValue(null);

      await expect(service.computeGrades('nonexistent-id')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when class has no enrolled students', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]), // empty enrolled list
      });

      await expect(service.computeGrades(GRADEBOOK_ID)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('handles a category with no items (contributes 0 to final)', async () => {
      // Two categories: Written Works 50% (has items), Performance Tasks 50% (no items)
      mockDb.query.gradebookCategories.findMany.mockResolvedValue([
        { id: CAT_WW, name: 'Written Works', weightPercentage: '50.00' },
        { id: CAT_PT, name: 'Performance Tasks', weightPercentage: '50.00' },
      ]);
      mockDb.query.gradebookItems.findMany.mockResolvedValue([
        { id: ITEM_WW1, categoryId: CAT_WW, maxScore: '100.00', scores: [
          { studentId: STUDENT_A, score: '80.00' },
        ]},
        // No items for CAT_PT
      ]);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ studentId: STUDENT_A }]),
      });

      const result = await service.computeGrades(GRADEBOOK_ID);
      // WW: 80% * 0.5 = 40; PT: 0% * 0.5 = 0; total = 40
      expect(result.get(STUDENT_A)!.finalPercentage).toBeCloseTo(40, 2);
    });

    it('handles a single student and single category correctly', async () => {
      mockDb.query.gradebookCategories.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Total', weightPercentage: '100.00' },
      ]);
      mockDb.query.gradebookItems.findMany.mockResolvedValue([
        { id: 'item-1', categoryId: 'cat-1', maxScore: '50.00', scores: [
          { studentId: STUDENT_A, score: '40.00' },
        ]},
      ]);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ studentId: STUDENT_A }]),
      });

      const result = await service.computeGrades(GRADEBOOK_ID);
      // (40/50)*100 = 80%;  80 * (100/100) = 80
      expect(result.get(STUDENT_A)!.finalPercentage).toBeCloseTo(80, 3);
    });
  });
});

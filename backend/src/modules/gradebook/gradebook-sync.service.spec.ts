import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GradebookSyncService } from './gradebook-sync.service';
import { DatabaseService } from '../../database/database.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ITEM_ID = 'item-uuid-1';
const ASSESSMENT_ID = 'assessment-uuid-1';
const GRADEBOOK_ID = 'gb-uuid-1';
const STUDENT_A = 'student-a-uuid';
const STUDENT_B = 'student-b-uuid';
const USER_ID = 'teacher-uuid-1';

const makeItem = (overrides: Partial<any> = {}) => ({
  id: ITEM_ID,
  assessmentId: ASSESSMENT_ID,
  maxScore: '50.00',
  gradebook: { teacherId: USER_ID, status: 'draft' },
  ...overrides,
});

const makeAttempt = (studentId: string, score: number) => ({
  studentId,
  score,
  submittedAt: new Date(),
});

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

const makeInsertChain = (returning: any[] = []) => ({
  values: jest.fn().mockReturnThis(),
  onConflictDoUpdate: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(returning),
});

const buildMockDb = () => ({
  query: {
    gradebookItems: {
      findFirst: jest.fn().mockResolvedValue(makeItem()),
      findMany: jest.fn().mockResolvedValue([]),
    },
    assessmentAttempts: {
      findMany: jest.fn().mockResolvedValue([
        makeAttempt(STUDENT_A, 80), // 80% → 80/100 * 50 = 40
        makeAttempt(STUDENT_B, 60), // 60% → 60/100 * 50 = 30
      ]),
    },
    gradebookScores: {
      findFirst: jest.fn(),
    },
  },
  insert: jest.fn().mockReturnValue(makeInsertChain()),
  update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnThis(), where: jest.fn() }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GradebookSyncService', () => {
  let service: GradebookSyncService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = buildMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradebookSyncService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile();

    service = module.get<GradebookSyncService>(GradebookSyncService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // syncFromAssessment (public — manual endpoint)
  // =========================================================================

  describe('syncFromAssessment', () => {
    it('returns synced count equal to number of unique students with attempts', async () => {
      const result = await service.syncFromAssessment(ITEM_ID, USER_ID);
      expect(result.synced).toBe(2);
    });

    it('calls upsert insert for each student', async () => {
      await service.syncFromAssessment(ITEM_ID, USER_ID);
      // Two students → two insert calls
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('scales assessment percentage score to item maxScore', async () => {
      // STUDENT_A score = 80% → 80/100 * 50 = 40
      await service.syncFromAssessment(ITEM_ID, USER_ID);
      const firstInsertValues =
        mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(parseFloat(firstInsertValues.score)).toBeCloseTo(40, 1);
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(null);
      await expect(service.syncFromAssessment('bad-id', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when item has no assessmentId', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(
        makeItem({ assessmentId: null }),
      );
      await expect(service.syncFromAssessment(ITEM_ID, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when gradebook is locked', async () => {
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(
        makeItem({ gradebook: { teacherId: USER_ID, status: 'locked' } }),
      );
      await expect(service.syncFromAssessment(ITEM_ID, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns synced=0 when there are no submitted attempts', async () => {
      mockDb.query.assessmentAttempts.findMany.mockResolvedValue([]);
      const result = await service.syncFromAssessment(ITEM_ID, USER_ID);
      expect(result.synced).toBe(0);
    });

    it('deduplicates attempts — keeps only the latest per student', async () => {
      // Student A appears twice; only first (latest by orderBy desc) is kept
      mockDb.query.assessmentAttempts.findMany.mockResolvedValue([
        makeAttempt(STUDENT_A, 90), // latest
        makeAttempt(STUDENT_A, 70), // older — should be ignored
      ]);
      const result = await service.syncFromAssessment(ITEM_ID, USER_ID);
      expect(result.synced).toBe(1);
    });

    it('uses onConflictDoUpdate for idempotent upsert', async () => {
      await service.syncFromAssessment(ITEM_ID, USER_ID);
      const insertChain = mockDb.insert.mock.results[0].value;
      expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // handleAssessmentSubmitted (EventEmitter2 listener)
  // =========================================================================

  describe('handleAssessmentSubmitted', () => {
    const event = {
      assessmentId: ASSESSMENT_ID,
      studentId: STUDENT_A,
      rawScore: 40,
      totalPoints: 50,
    };

    it('does nothing when no gradebook items are linked to the assessment', async () => {
      mockDb.query.gradebookItems.findMany.mockResolvedValue([]);
      await expect(service.handleAssessmentSubmitted(event)).resolves.toBeUndefined();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('does nothing for finalized/locked gradebooks (only processes draft)', async () => {
      mockDb.query.gradebookItems.findMany.mockResolvedValue([
        {
          id: ITEM_ID,
          assessmentId: ASSESSMENT_ID,
          gradebook: { status: 'finalized', id: GRADEBOOK_ID },
        },
        {
          id: 'item-2',
          assessmentId: ASSESSMENT_ID,
          gradebook: { status: 'locked', id: GRADEBOOK_ID },
        },
      ]);
      // Link the item lookup used inside _syncItemFromAssessment
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(makeItem());

      await service.handleAssessmentSubmitted(event);

      // Both items are non-draft → no sync attempted
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('syncs scores for all draft gradebook items linked to the assessment', async () => {
      const draftItem = {
        id: ITEM_ID,
        assessmentId: ASSESSMENT_ID,
        gradebook: { status: 'draft', id: GRADEBOOK_ID },
      };
      mockDb.query.gradebookItems.findMany.mockResolvedValue([draftItem]);
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(makeItem());

      await service.handleAssessmentSubmitted(event);

      // Two students have attempts → two upserts
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('does not throw even if the sync fails for one item (logs error)', async () => {
      const draftItem = {
        id: ITEM_ID,
        assessmentId: ASSESSMENT_ID,
        gradebook: { status: 'draft', id: GRADEBOOK_ID },
      };
      mockDb.query.gradebookItems.findMany.mockResolvedValue([draftItem]);
      // Make findFirst return null to simulate an error inside _syncItemFromAssessment
      mockDb.query.gradebookItems.findFirst.mockResolvedValue(null);

      await expect(service.handleAssessmentSubmitted(event)).resolves.toBeUndefined();
    });
  });
});

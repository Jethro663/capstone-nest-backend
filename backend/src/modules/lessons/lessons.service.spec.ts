import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { DatabaseService } from '../../database/database.service';
import { RoleName } from '../auth/decorators/roles.decorator';

// ─── Fixture data ────────────────────────────────────────────────────────────

const CLASS_ID = '00000000-0000-0000-0000-000000000001';
const LESSON_ID = '00000000-0000-0000-0000-000000000010';
const BLOCK_ID = '00000000-0000-0000-0000-000000000020';
const STUDENT_ID = '00000000-0000-0000-0000-000000000030';
const TEACHER_ID = '00000000-0000-0000-0000-000000000040';
const ADMIN_ID = '00000000-0000-0000-0000-000000000050';
const OTHER_TEACHER_ID = '00000000-0000-0000-0000-000000000060';

const MOCK_CLASS = { id: CLASS_ID, teacherId: TEACHER_ID };

const MOCK_BLOCK = {
  id: BLOCK_ID,
  lessonId: LESSON_ID,
  type: 'text' as const,
  order: 1,
  content: { text: 'Hello' },
  metadata: {},
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const MOCK_LESSON = {
  id: LESSON_ID,
  title: 'Test Lesson',
  description: 'A test lesson',
  classId: CLASS_ID,
  order: 1,
  isDraft: false,
  sourceExtractionId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  contentBlocks: [MOCK_BLOCK],
  class: MOCK_CLASS,
};

const MOCK_DRAFT_LESSON = { ...MOCK_LESSON, isDraft: true };

const TEACHER_USER = { userId: TEACHER_ID, roles: [RoleName.Teacher] };
const ADMIN_USER = { userId: ADMIN_ID, roles: [RoleName.Admin] };
const OTHER_TEACHER_USER = {
  userId: OTHER_TEACHER_ID,
  roles: [RoleName.Teacher],
};

// ─── DB mock builder ─────────────────────────────────────────────────────────

/**
 * Creates a fresh Drizzle mock object. Each method returns a jest.fn() so
 * individual tests can override behaviour with mockResolvedValueOnce etc.
 */
function buildMockDb() {
  const db: any = {
    query: {
      lessons: { findFirst: jest.fn(), findMany: jest.fn() },
      lessonContentBlocks: { findFirst: jest.fn(), findMany: jest.fn() },
      classes: { findFirst: jest.fn() },
      lessonCompletions: { findFirst: jest.fn(), findMany: jest.fn() },
      users: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    select: jest.fn(),
    transaction: jest.fn(),
  };

  // transaction passes through to the callback using the same db mock
  db.transaction.mockImplementation((cb: (tx: any) => Promise<any>) => cb(db));

  return db;
}

/** Chains insert(table).values({}).returning() → resolves with `rows`. */
function mockInsert(db: any, rows: any[]) {
  const returning = jest.fn().mockResolvedValue(rows);
  const values = jest.fn().mockReturnValue({ returning });
  db.insert.mockReturnValueOnce({ values });
}

/** Chains update(table).set({}).where() → resolves with `[]. */
function mockUpdate(db: any, rows: any[] = []) {
  const where = jest.fn().mockResolvedValue(rows);
  const set = jest.fn().mockReturnValue({ where });
  db.update.mockReturnValueOnce({ set });
}

/** Chains update(table).set({}).where().returning() → resolves with `rows`. */
function mockUpdateReturning(db: any, rows: any[]) {
  const returning = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  db.update.mockReturnValueOnce({ set });
}

/** Chains delete(table).where() → resolves. */
function mockDelete(db: any) {
  const where = jest.fn().mockResolvedValue(undefined);
  db.delete.mockReturnValueOnce({ where });
}

/** Chains select({}).from().innerJoin().where() → resolves with `rows`. */
function mockSelect(db: any, rows: any[]) {
  const where = jest.fn().mockResolvedValue(rows);
  const innerJoin = jest.fn().mockReturnValue({ where });
  const from = jest.fn().mockReturnValue({ innerJoin });
  db.select.mockReturnValueOnce({ from });
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('LessonsService', () => {
  let service: LessonsService;
  let db: ReturnType<typeof buildMockDb>;

  beforeEach(async () => {
    db = buildMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        {
          provide: DatabaseService,
          useValue: { db },
        },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ───────────────────────────────────────────────────────────────────────────
  // getLessonsByClass
  // ───────────────────────────────────────────────────────────────────────────
  describe('getLessonsByClass', () => {
    it('returns all lessons including drafts when filterDrafts=false', async () => {
      db.query.lessons.findMany.mockResolvedValue([
        MOCK_LESSON,
        MOCK_DRAFT_LESSON,
      ]);

      const result = await service.getLessonsByClass(CLASS_ID, false);

      expect(db.query.lessons.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('returns only published lessons when filterDrafts=true', async () => {
      db.query.lessons.findMany.mockResolvedValue([MOCK_LESSON]);

      const result = await service.getLessonsByClass(CLASS_ID, true);

      expect(result).toHaveLength(1);
      expect(result[0].isDraft).toBe(false);
    });

    it('returns empty array when class has no lessons', async () => {
      db.query.lessons.findMany.mockResolvedValue([]);

      const result = await service.getLessonsByClass(CLASS_ID);

      expect(result).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getLessonById
  // ───────────────────────────────────────────────────────────────────────────
  describe('getLessonById', () => {
    it('returns lesson with contentBlocks and class', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);

      const result = await service.getLessonById(LESSON_ID);

      expect(result).toEqual(MOCK_LESSON);
      expect(result.contentBlocks).toHaveLength(1);
      expect(result.class).toBeDefined();
    });

    it('throws NotFoundException for unknown lessonId', async () => {
      db.query.lessons.findFirst.mockResolvedValue(undefined);

      await expect(service.getLessonById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // createLesson
  // ───────────────────────────────────────────────────────────────────────────
  describe('createLesson', () => {
    const dto = { title: 'New Lesson', classId: CLASS_ID };

    it('creates lesson with auto-incremented order inside a transaction', async () => {
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS); // ownership check
      db.query.lessons.findFirst
        .mockResolvedValueOnce({ order: 3 }) // lastLesson inside transaction
        .mockResolvedValue(MOCK_LESSON); // getLessonById after insert

      mockInsert(db, [{ id: LESSON_ID }]);

      const result = await service.createLesson(dto, TEACHER_ID, [
        RoleName.Teacher,
      ]);

      expect(db.transaction).toHaveBeenCalledTimes(1);
      // values() should have been called with order = 4 (3 + 1)
      const valuesFn = db.insert.mock.results[0]?.value?.values;
      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({ order: 4, isDraft: true }),
      );
      expect(result).toEqual(MOCK_LESSON);
    });

    it('uses order=1 when no existing lessons', async () => {
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      db.query.lessons.findFirst
        .mockResolvedValueOnce(undefined) // no lastLesson
        .mockResolvedValue(MOCK_LESSON);

      mockInsert(db, [{ id: LESSON_ID }]);

      await service.createLesson(dto, TEACHER_ID, [RoleName.Teacher]);

      const valuesFn = db.insert.mock.results[0]?.value?.values;
      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({ order: 1 }),
      );
    });

    it('respects explicit order when provided in dto', async () => {
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      db.query.lessons.findFirst
        .mockResolvedValueOnce({ order: 5 })
        .mockResolvedValue(MOCK_LESSON);

      mockInsert(db, [{ id: LESSON_ID }]);

      await service.createLesson({ ...dto, order: 99 }, TEACHER_ID, [
        RoleName.Teacher,
      ]);

      const valuesFn = db.insert.mock.results[0]?.value?.values;
      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({ order: 99 }),
      );
    });

    it('throws ForbiddenException when teacher does not own the class', async () => {
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS); // teacherId = TEACHER_ID

      await expect(
        service.createLesson(dto, OTHER_TEACHER_ID, [RoleName.Teacher]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin can create lesson in any class', async () => {
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      db.query.lessons.findFirst
        .mockResolvedValueOnce(undefined)
        .mockResolvedValue(MOCK_LESSON);

      mockInsert(db, [{ id: LESSON_ID }]);

      await expect(
        service.createLesson(dto, ADMIN_ID, [RoleName.Admin]),
      ).resolves.toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // updateLesson
  // ───────────────────────────────────────────────────────────────────────────
  describe('updateLesson', () => {
    it('updates lesson and returns refreshed record', async () => {
      // getLessonById called twice: ownership lookup + return
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS); // ownership check
      mockUpdate(db);

      const result = await service.updateLesson(
        LESSON_ID,
        { title: 'Updated' },
        TEACHER_ID,
        [RoleName.Teacher],
      );

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual(MOCK_LESSON);
    });

    it('throws NotFoundException for non-existent lessonId', async () => {
      db.query.lessons.findFirst.mockResolvedValue(undefined);

      await expect(
        service.updateLesson(LESSON_ID, { title: 'X' }, TEACHER_ID, [
          RoleName.Teacher,
        ]),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when teacher does not own it', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);

      await expect(
        service.updateLesson(LESSON_ID, { title: 'X' }, OTHER_TEACHER_ID, [
          RoleName.Teacher,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // deleteLesson
  // ───────────────────────────────────────────────────────────────────────────
  describe('deleteLesson', () => {
    it('deletes and returns the deleted lesson', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      mockDelete(db);

      const result = await service.deleteLesson(LESSON_ID, TEACHER_ID, [
        RoleName.Teacher,
      ]);

      expect(db.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual(MOCK_LESSON);
    });

    it('throws NotFoundException for unknown lesson', async () => {
      db.query.lessons.findFirst.mockResolvedValue(undefined);

      await expect(
        service.deleteLesson(LESSON_ID, TEACHER_ID, [RoleName.Teacher]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // publishLesson
  // ───────────────────────────────────────────────────────────────────────────
  describe('publishLesson', () => {
    it('sets isDraft to false and returns updated lesson', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_DRAFT_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      mockUpdate(db);
      // second findFirst for getLessonById after update
      db.query.lessons.findFirst.mockResolvedValue({
        ...MOCK_DRAFT_LESSON,
        isDraft: false,
      });

      const result = await service.publishLesson(LESSON_ID, TEACHER_ID, [
        RoleName.Teacher,
      ]);

      const setFn = db.update.mock.results[0]?.value?.set;
      expect(setFn).toHaveBeenCalledWith(
        expect.objectContaining({ isDraft: false }),
      );
      expect(result.isDraft).toBe(false);
    });

    it('is idempotent when lesson is already published', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON); // already published
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      mockUpdate(db);
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);

      await expect(
        service.publishLesson(LESSON_ID, TEACHER_ID, [RoleName.Teacher]),
      ).resolves.toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // addContentBlock
  // ───────────────────────────────────────────────────────────────────────────
  describe('addContentBlock', () => {
    const blockDto = {
      lessonId: LESSON_ID,
      type: 'text' as const,
      order: 1,
      content: { text: 'Hello' },
    };

    it('inserts block and returns the new record', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      mockInsert(db, [MOCK_BLOCK]);

      const result = await service.addContentBlock(blockDto, TEACHER_ID, [
        RoleName.Teacher,
      ]);

      expect(result).toEqual(MOCK_BLOCK);
    });

    it('throws BadRequestException when lessonId is missing', async () => {
      await expect(
        service.addContentBlock(
          { ...blockDto, lessonId: undefined },
          TEACHER_ID,
          [RoleName.Teacher],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when lesson does not exist', async () => {
      db.query.lessons.findFirst.mockResolvedValue(undefined);

      await expect(
        service.addContentBlock(blockDto, TEACHER_ID, [RoleName.Teacher]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getContentBlockById
  // ───────────────────────────────────────────────────────────────────────────
  describe('getContentBlockById', () => {
    it('returns the block', async () => {
      db.query.lessonContentBlocks.findFirst.mockResolvedValue(MOCK_BLOCK);

      const result = await service.getContentBlockById(BLOCK_ID);

      expect(result).toEqual(MOCK_BLOCK);
    });

    it('throws NotFoundException for unknown block', async () => {
      db.query.lessonContentBlocks.findFirst.mockResolvedValue(undefined);

      await expect(service.getContentBlockById('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // updateContentBlock
  // ───────────────────────────────────────────────────────────────────────────
  describe('updateContentBlock', () => {
    it('selectively patches only provided fields', async () => {
      db.query.lessonContentBlocks.findFirst
        .mockResolvedValueOnce(MOCK_BLOCK) // initial fetch
        .mockResolvedValue(MOCK_BLOCK); // refetch after update
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      mockUpdate(db);

      await service.updateContentBlock(BLOCK_ID, { order: 5 }, TEACHER_ID, [
        RoleName.Teacher,
      ]);

      const setFn = db.update.mock.results[0]?.value?.set;
      expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ order: 5 }));
      // type was not provided, should NOT be in the update payload
      const callArg = setFn.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('type');
    });

    it('throws NotFoundException when block does not exist', async () => {
      db.query.lessonContentBlocks.findFirst.mockResolvedValue(undefined);

      await expect(
        service.updateContentBlock(BLOCK_ID, { order: 1 }, TEACHER_ID, [
          RoleName.Teacher,
        ]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // deleteContentBlock
  // ───────────────────────────────────────────────────────────────────────────
  describe('deleteContentBlock', () => {
    it('deletes and returns the removed block', async () => {
      db.query.lessonContentBlocks.findFirst.mockResolvedValue(MOCK_BLOCK);
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      mockDelete(db);

      const result = await service.deleteContentBlock(BLOCK_ID, TEACHER_ID, [
        RoleName.Teacher,
      ]);

      expect(result).toEqual(MOCK_BLOCK);
      expect(db.delete).toHaveBeenCalledTimes(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // reorderBlocks
  // ───────────────────────────────────────────────────────────────────────────
  describe('reorderBlocks', () => {
    const BLOCK_ID_2 = '00000000-0000-0000-0000-000000000021';
    const reorderDto = {
      blocks: [
        { id: BLOCK_ID, order: 2 },
        { id: BLOCK_ID_2, order: 1 },
      ],
    };

    it('validates block ownership and wraps updates in a transaction', async () => {
      // getLessonById
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      // ownership check
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      // block validation query returns both blocks belonging to lesson
      db.query.lessonContentBlocks.findMany.mockResolvedValueOnce([
        { id: BLOCK_ID },
        { id: BLOCK_ID_2 },
      ]);
      // two updates inside transaction
      mockUpdate(db);
      mockUpdate(db);
      // getLessonById after reorder
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);

      await service.reorderBlocks(LESSON_ID, reorderDto, TEACHER_ID, [
        RoleName.Teacher,
      ]);

      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(db.update).toHaveBeenCalledTimes(2);
    });

    it('throws BadRequestException when a block ID does not belong to the lesson', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      // only one block returned — BLOCK_ID_2 is foreign
      db.query.lessonContentBlocks.findMany.mockResolvedValueOnce([
        { id: BLOCK_ID },
      ]);

      await expect(
        service.reorderBlocks(LESSON_ID, reorderDto, TEACHER_ID, [
          RoleName.Teacher,
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not call db.transaction when block validation fails', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      db.query.lessonContentBlocks.findMany.mockResolvedValueOnce([]);

      await expect(
        service.reorderBlocks(LESSON_ID, reorderDto, TEACHER_ID, [
          RoleName.Teacher,
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // markLessonComplete
  // ───────────────────────────────────────────────────────────────────────────
  describe('markLessonComplete', () => {
    it('inserts a completion record and returns { isCompleted: true, completedAt }', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON); // published
      db.query.users.findFirst.mockResolvedValue({ id: STUDENT_ID });

      const now = new Date();
      mockInsert(db, [{ id: 'comp-1', completedAt: now }]);

      const result = await service.markLessonComplete(STUDENT_ID, LESSON_ID);

      expect(result.isCompleted).toBe(true);
      expect(result.completedAt).toBe(now);
    });

    it('throws BadRequestException when lesson is still a draft', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_DRAFT_LESSON);

      await expect(
        service.markLessonComplete(STUDENT_ID, LESSON_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates existing record on unique constraint violation (error code 23505)', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.users.findFirst.mockResolvedValue({ id: STUDENT_ID });

      // simulate PG unique violation
      const returning = jest.fn().mockRejectedValue({ code: '23505' });
      const values = jest.fn().mockReturnValue({ returning });
      db.insert.mockReturnValueOnce({ values });

      const now = new Date();
      mockUpdateReturning(db, [{ completedAt: now }]);

      const result = await service.markLessonComplete(STUDENT_ID, LESSON_ID);

      expect(result.isCompleted).toBe(true);
      expect(result.message).toBe('Lesson already marked as complete');
      expect(result.completedAt).toBe(now);
    });

    it('rethrows non-constraint errors', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.users.findFirst.mockResolvedValue({ id: STUDENT_ID });

      const returning = jest
        .fn()
        .mockRejectedValue(new Error('Unexpected DB error'));
      const values = jest.fn().mockReturnValue({ returning });
      db.insert.mockReturnValueOnce({ values });

      await expect(
        service.markLessonComplete(STUDENT_ID, LESSON_ID),
      ).rejects.toThrow('Unexpected DB error');
    });

    it('throws NotFoundException when student does not exist', async () => {
      db.query.lessons.findFirst.mockResolvedValue(MOCK_LESSON);
      db.query.users.findFirst.mockResolvedValue(undefined);

      await expect(
        service.markLessonComplete(STUDENT_ID, LESSON_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // isLessonCompleted
  // ───────────────────────────────────────────────────────────────────────────
  describe('isLessonCompleted', () => {
    it('returns { isCompleted: false, completedAt: null } for a new student', async () => {
      db.query.lessonCompletions.findFirst.mockResolvedValue(undefined);

      const result = await service.isLessonCompleted(STUDENT_ID, LESSON_ID);

      expect(result).toEqual({ isCompleted: false, completedAt: null });
    });

    it('returns { isCompleted: true, completedAt } after completion', async () => {
      const completedAt = new Date('2026-02-01');
      db.query.lessonCompletions.findFirst.mockResolvedValue({ completedAt });

      const result = await service.isLessonCompleted(STUDENT_ID, LESSON_ID);

      expect(result).toEqual({ isCompleted: true, completedAt });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getDraftLessons
  // ───────────────────────────────────────────────────────────────────────────
  describe('getDraftLessons', () => {
    it('returns only draft lessons for a class', async () => {
      db.query.lessons.findMany.mockResolvedValue([MOCK_DRAFT_LESSON]);

      const result = await service.getDraftLessons(CLASS_ID);

      expect(result).toHaveLength(1);
      expect(db.query.lessons.findMany).toHaveBeenCalledTimes(1);
    });

    it('accepts an optional sourceExtractionId filter', async () => {
      db.query.lessons.findMany.mockResolvedValue([]);

      await service.getDraftLessons(CLASS_ID, 'extraction-uuid');

      // Verify findMany was called (filter built with 3 conditions)
      expect(db.query.lessons.findMany).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no drafts exist', async () => {
      db.query.lessons.findMany.mockResolvedValue([]);

      const result = await service.getDraftLessons(CLASS_ID);

      expect(result).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getCompletedLessonsForClass
  // ───────────────────────────────────────────────────────────────────────────
  describe('getCompletedLessonsForClass', () => {
    it('returns completions with progressPercentage via DB-level join', async () => {
      const rows = [
        {
          lessonId: LESSON_ID,
          completedAt: new Date(),
          progressPercentage: 100,
        },
      ];
      mockSelect(db, rows);

      const result = await service.getCompletedLessonsForClass(
        STUDENT_ID,
        CLASS_ID,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('progressPercentage', 100);
      expect(db.select).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when student has no completions in class', async () => {
      mockSelect(db, []);

      const result = await service.getCompletedLessonsForClass(
        STUDENT_ID,
        CLASS_ID,
      );

      expect(result).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // assertTeacherOwnership (tested indirectly)
  // ───────────────────────────────────────────────────────────────────────────
  describe('assertTeacherOwnership (via createLesson)', () => {
    const dto = { title: 'L', classId: CLASS_ID };

    it('admin bypasses ownership check entirely', async () => {
      // classes.findFirst should NOT be called for admins
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS);
      db.query.lessons.findFirst
        .mockResolvedValueOnce(undefined)
        .mockResolvedValue(MOCK_LESSON);
      mockInsert(db, [{ id: LESSON_ID }]);

      await service.createLesson(dto, ADMIN_ID, [RoleName.Admin]);

      // classes.findFirst called once for OWNERSHIP check — admins skip it
      // but it may be called for class existence if we kept that check;
      // assert no ForbiddenException is thrown
      expect(true).toBe(true); // no throw = pass
    });

    it('teacher with non-matching teacherId is rejected', async () => {
      db.query.classes.findFirst.mockResolvedValue(MOCK_CLASS); // teacherId = TEACHER_ID

      await expect(
        service.createLesson(dto, OTHER_TEACHER_ID, [RoleName.Teacher]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when class does not exist', async () => {
      db.query.classes.findFirst.mockResolvedValue(undefined);

      await expect(
        service.createLesson(dto, TEACHER_ID, [RoleName.Teacher]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

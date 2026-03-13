import { Test, TestingModule } from '@nestjs/testing';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { RoleName } from '../auth/decorators/roles.decorator';
import {
  CreateLessonDto,
  UpdateLessonDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ReorderBlocksDto,
} from './DTO/lesson.dto';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CLASS_ID = '00000000-0000-0000-0000-000000000001';
const LESSON_ID = '00000000-0000-0000-0000-000000000010';
const BLOCK_ID = '00000000-0000-0000-0000-000000000020';

const TEACHER_USER = {
  userId: '00000000-0000-0000-0000-000000000040',
  roles: [RoleName.Teacher],
};
const ADMIN_USER = {
  userId: '00000000-0000-0000-0000-000000000050',
  roles: [RoleName.Admin],
};
const STUDENT_USER = {
  userId: '00000000-0000-0000-0000-000000000030',
  roles: [RoleName.Student],
};

const MOCK_LESSON = {
  id: LESSON_ID,
  title: 'Test Lesson',
  classId: CLASS_ID,
  order: 1,
  isDraft: false,
  contentBlocks: [],
  class: { id: CLASS_ID, teacherId: TEACHER_USER.userId },
};

const MOCK_BLOCK = {
  id: BLOCK_ID,
  lessonId: LESSON_ID,
  type: 'text',
  order: 1,
  content: { text: 'Hello' },
};

// ─── Mock service ─────────────────────────────────────────────────────────────

const mockLessonsService = {
  getLessonsByClass: jest.fn(),
  getDraftLessons: jest.fn(),
  getLessonById: jest.fn(),
  createLesson: jest.fn(),
  updateLesson: jest.fn(),
  publishLesson: jest.fn(),
  deleteLesson: jest.fn(),
  addContentBlock: jest.fn(),
  updateContentBlock: jest.fn(),
  deleteContentBlock: jest.fn(),
  reorderBlocks: jest.fn(),
  markLessonComplete: jest.fn(),
  isLessonCompleted: jest.fn(),
  getCompletedLessonsForClass: jest.fn(),
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('LessonsController', () => {
  let controller: LessonsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonsController],
      providers: [{ provide: LessonsService, useValue: mockLessonsService }],
    }).compile();

    controller = module.get<LessonsController>(LessonsController);
  });

  // ─── getLessonsByClass ──────────────────────────────────────────────────────

  describe('getLessonsByClass', () => {
    it('passes filterDrafts=false for a teacher caller', async () => {
      mockLessonsService.getLessonsByClass.mockResolvedValue([MOCK_LESSON]);

      const res = await controller.getLessonsByClass(CLASS_ID, TEACHER_USER);

      expect(mockLessonsService.getLessonsByClass).toHaveBeenCalledWith(
        CLASS_ID,
        false, // teacher should NOT have drafts filtered
      );
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(res.data).toEqual([MOCK_LESSON]);
    });

    it('passes filterDrafts=true for a student caller', async () => {
      mockLessonsService.getLessonsByClass.mockResolvedValue([MOCK_LESSON]);

      await controller.getLessonsByClass(CLASS_ID, STUDENT_USER);

      expect(mockLessonsService.getLessonsByClass).toHaveBeenCalledWith(
        CLASS_ID,
        true, // student should only see published
      );
    });

    it('passes filterDrafts=false for an admin caller', async () => {
      mockLessonsService.getLessonsByClass.mockResolvedValue([]);

      await controller.getLessonsByClass(CLASS_ID, ADMIN_USER);

      expect(mockLessonsService.getLessonsByClass).toHaveBeenCalledWith(
        CLASS_ID,
        false,
      );
    });

    it('returns { success, message, data, count }', async () => {
      mockLessonsService.getLessonsByClass.mockResolvedValue([MOCK_LESSON]);

      const res = await controller.getLessonsByClass(CLASS_ID, TEACHER_USER);

      expect(res).toMatchObject({
        success: true,
        message: expect.any(String),
        data: expect.any(Array),
        count: expect.any(Number),
      });
    });
  });

  // ─── getDraftLessons ────────────────────────────────────────────────────────

  describe('getDraftLessons', () => {
    it('returns draft lessons with count', async () => {
      const draft = { ...MOCK_LESSON, isDraft: true };
      mockLessonsService.getDraftLessons.mockResolvedValue([draft]);

      const res = await controller.getDraftLessons(CLASS_ID);

      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(res.data[0].isDraft).toBe(true);
    });

    it('calls service with classId', async () => {
      mockLessonsService.getDraftLessons.mockResolvedValue([]);

      await controller.getDraftLessons(CLASS_ID);

      expect(mockLessonsService.getDraftLessons).toHaveBeenCalledWith(CLASS_ID);
    });
  });

  // ─── getLessonById ──────────────────────────────────────────────────────────

  describe('getLessonById', () => {
    it('returns lesson wrapped in success envelope', async () => {
      mockLessonsService.getLessonById.mockResolvedValue(MOCK_LESSON);

      const res = await controller.getLessonById(LESSON_ID);

      expect(res).toMatchObject({ success: true, data: MOCK_LESSON });
    });

    it('calls service with the correct lessonId', async () => {
      mockLessonsService.getLessonById.mockResolvedValue(MOCK_LESSON);

      await controller.getLessonById(LESSON_ID);

      expect(mockLessonsService.getLessonById).toHaveBeenCalledWith(LESSON_ID);
    });
  });

  // ─── createLesson ───────────────────────────────────────────────────────────

  describe('createLesson', () => {
    const dto: CreateLessonDto = {
      title: 'New Lesson',
      classId: CLASS_ID,
    };

    it('passes userId and roles from @CurrentUser to service', async () => {
      mockLessonsService.createLesson.mockResolvedValue(MOCK_LESSON);

      await controller.createLesson(dto, TEACHER_USER);

      expect(mockLessonsService.createLesson).toHaveBeenCalledWith(
        dto,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
    });

    it('returns { success, message, data }', async () => {
      mockLessonsService.createLesson.mockResolvedValue(MOCK_LESSON);

      const res = await controller.createLesson(dto, TEACHER_USER);

      expect(res).toMatchObject({
        success: true,
        message: expect.any(String),
        data: MOCK_LESSON,
      });
    });
  });

  // ─── updateLesson ───────────────────────────────────────────────────────────

  describe('updateLesson', () => {
    const dto: UpdateLessonDto = { title: 'Updated' };

    it('passes lessonId, dto, userId, and roles to service', async () => {
      mockLessonsService.updateLesson.mockResolvedValue(MOCK_LESSON);

      await controller.updateLesson(LESSON_ID, dto, TEACHER_USER);

      expect(mockLessonsService.updateLesson).toHaveBeenCalledWith(
        LESSON_ID,
        dto,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
    });

    it('returns updated lesson in success envelope', async () => {
      mockLessonsService.updateLesson.mockResolvedValue(MOCK_LESSON);

      const res = await controller.updateLesson(LESSON_ID, dto, TEACHER_USER);

      expect(res.success).toBe(true);
      expect(res.data).toEqual(MOCK_LESSON);
    });
  });

  // ─── publishLesson ──────────────────────────────────────────────────────────

  describe('publishLesson', () => {
    it('calls service with lessonId, userId, roles', async () => {
      mockLessonsService.publishLesson.mockResolvedValue({
        ...MOCK_LESSON,
        isDraft: false,
      });

      await controller.publishLesson(LESSON_ID, TEACHER_USER);

      expect(mockLessonsService.publishLesson).toHaveBeenCalledWith(
        LESSON_ID,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
    });

    it('returns published lesson', async () => {
      const published = { ...MOCK_LESSON, isDraft: false };
      mockLessonsService.publishLesson.mockResolvedValue(published);

      const res = await controller.publishLesson(LESSON_ID, TEACHER_USER);

      expect(res.data.isDraft).toBe(false);
    });
  });

  // ─── deleteLesson ───────────────────────────────────────────────────────────

  describe('deleteLesson', () => {
    it('returns { success: true, message } with HTTP 200 (no 204 no-content)', async () => {
      mockLessonsService.deleteLesson.mockResolvedValue(undefined);

      const res = await controller.deleteLesson(LESSON_ID, TEACHER_USER);

      expect(res).toMatchObject({ success: true, message: expect.any(String) });
    });

    it('calls service with lessonId, userId, roles', async () => {
      mockLessonsService.deleteLesson.mockResolvedValue(undefined);

      await controller.deleteLesson(LESSON_ID, TEACHER_USER);

      expect(mockLessonsService.deleteLesson).toHaveBeenCalledWith(
        LESSON_ID,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
    });
  });

  // ─── addContentBlock ────────────────────────────────────────────────────────

  describe('addContentBlock', () => {
    const dto: CreateContentBlockDto = {
      type: 'text',
      order: 1,
      content: { text: 'Hello' },
    };

    it('overrides lessonId in body with URL param', async () => {
      mockLessonsService.addContentBlock.mockResolvedValue(MOCK_BLOCK);

      await controller.addContentBlock(
        LESSON_ID,
        { ...dto, lessonId: 'SHOULD-BE-OVERWRITTEN' },
        TEACHER_USER,
      );

      const calledDto = mockLessonsService.addContentBlock.mock.calls[0][0];
      expect(calledDto.lessonId).toBe(LESSON_ID);
    });

    it('returns block in success envelope with 201', async () => {
      mockLessonsService.addContentBlock.mockResolvedValue(MOCK_BLOCK);

      const res = await controller.addContentBlock(
        LESSON_ID,
        dto,
        TEACHER_USER,
      );

      expect(res.success).toBe(true);
      expect(res.data).toEqual(MOCK_BLOCK);
    });

    it('passes userId and roles to service', async () => {
      mockLessonsService.addContentBlock.mockResolvedValue(MOCK_BLOCK);

      await controller.addContentBlock(LESSON_ID, dto, TEACHER_USER);

      expect(mockLessonsService.addContentBlock).toHaveBeenCalledWith(
        expect.any(Object),
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
    });
  });

  // ─── updateContentBlock ─────────────────────────────────────────────────────

  describe('updateContentBlock', () => {
    const dto: UpdateContentBlockDto = { order: 5 };

    it('calls service with blockId, dto, userId, roles', async () => {
      mockLessonsService.updateContentBlock.mockResolvedValue(MOCK_BLOCK);

      await controller.updateContentBlock(BLOCK_ID, dto, TEACHER_USER);

      expect(mockLessonsService.updateContentBlock).toHaveBeenCalledWith(
        BLOCK_ID,
        dto,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
    });

    it('returns updated block', async () => {
      mockLessonsService.updateContentBlock.mockResolvedValue(MOCK_BLOCK);

      const res = await controller.updateContentBlock(
        BLOCK_ID,
        dto,
        TEACHER_USER,
      );

      expect(res.data).toEqual(MOCK_BLOCK);
    });
  });

  // ─── deleteContentBlock ─────────────────────────────────────────────────────

  describe('deleteContentBlock', () => {
    it('returns { success: true, message } (no 204 no-content)', async () => {
      mockLessonsService.deleteContentBlock.mockResolvedValue(undefined);

      const res = await controller.deleteContentBlock(BLOCK_ID, TEACHER_USER);

      expect(res).toMatchObject({ success: true, message: expect.any(String) });
    });

    it('calls service with blockId, userId, roles', async () => {
      mockLessonsService.deleteContentBlock.mockResolvedValue(undefined);

      await controller.deleteContentBlock(BLOCK_ID, TEACHER_USER);

      expect(mockLessonsService.deleteContentBlock).toHaveBeenCalledWith(
        BLOCK_ID,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
    });
  });

  // ─── reorderBlocks ──────────────────────────────────────────────────────────

  describe('reorderBlocks', () => {
    const dto: ReorderBlocksDto = {
      blocks: [{ id: BLOCK_ID, order: 1 }],
    };

    it('calls service with lessonId, dto, userId, roles', async () => {
      mockLessonsService.reorderBlocks.mockResolvedValue(MOCK_LESSON);

      await controller.reorderBlocks(LESSON_ID, dto, TEACHER_USER);

      expect(mockLessonsService.reorderBlocks).toHaveBeenCalledWith(
        LESSON_ID,
        dto,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
    });

    it('returns lesson with reordered blocks in success envelope', async () => {
      mockLessonsService.reorderBlocks.mockResolvedValue(MOCK_LESSON);

      const res = await controller.reorderBlocks(LESSON_ID, dto, TEACHER_USER);

      expect(res.success).toBe(true);
      expect(res.data).toEqual(MOCK_LESSON);
    });
  });

  // ─── markLessonComplete ─────────────────────────────────────────────────────

  describe('markLessonComplete', () => {
    const completion = { isCompleted: true, completedAt: new Date() };

    it('uses userId from @CurrentUser()', async () => {
      mockLessonsService.markLessonComplete.mockResolvedValue(completion);

      await controller.markLessonComplete(LESSON_ID, STUDENT_USER);

      expect(mockLessonsService.markLessonComplete).toHaveBeenCalledWith(
        STUDENT_USER.userId,
        LESSON_ID,
      );
    });

    it('returns { success, message, data }', async () => {
      mockLessonsService.markLessonComplete.mockResolvedValue(completion);

      const res = await controller.markLessonComplete(LESSON_ID, STUDENT_USER);

      expect(res).toMatchObject({
        success: true,
        message: expect.any(String),
        data: completion,
      });
    });
  });

  // ─── getCompletionStatus ────────────────────────────────────────────────────

  describe('getCompletionStatus', () => {
    it('uses userId from @CurrentUser()', async () => {
      mockLessonsService.isLessonCompleted.mockResolvedValue({
        isCompleted: true,
        completedAt: new Date(),
      });

      await controller.getCompletionStatus(LESSON_ID, STUDENT_USER);

      expect(mockLessonsService.isLessonCompleted).toHaveBeenCalledWith(
        STUDENT_USER.userId,
        LESSON_ID,
      );
    });

    it('returns { success, data } without message field', async () => {
      const status = { isCompleted: false, completedAt: null };
      mockLessonsService.isLessonCompleted.mockResolvedValue(status);

      const res = await controller.getCompletionStatus(LESSON_ID, STUDENT_USER);

      expect(res).toEqual({ success: true, data: status });
    });
  });

  // ─── getCompletedLessons ────────────────────────────────────────────────────

  describe('getCompletedLessons', () => {
    it('uses userId from @CurrentUser() and passes classId', async () => {
      mockLessonsService.getCompletedLessonsForClass.mockResolvedValue([]);

      await controller.getCompletedLessons(CLASS_ID, STUDENT_USER);

      expect(
        mockLessonsService.getCompletedLessonsForClass,
      ).toHaveBeenCalledWith(STUDENT_USER.userId, CLASS_ID);
    });

    it('returns { success, data, count }', async () => {
      const rows = [
        {
          lessonId: LESSON_ID,
          completedAt: new Date(),
          progressPercentage: 100,
        },
      ];
      mockLessonsService.getCompletedLessonsForClass.mockResolvedValue(rows);

      const res = await controller.getCompletedLessons(CLASS_ID, STUDENT_USER);

      expect(res).toMatchObject({
        success: true,
        data: rows,
        count: 1,
      });
      // progressPercentage must be present (regression: old impl dropped it)
      expect(res.data[0]).toHaveProperty('progressPercentage', 100);
    });

    it('returns count=0 and empty data when no completions', async () => {
      mockLessonsService.getCompletedLessonsForClass.mockResolvedValue([]);

      const res = await controller.getCompletedLessons(CLASS_ID, STUDENT_USER);

      expect(res.count).toBe(0);
      expect(res.data).toEqual([]);
    });
  });
});

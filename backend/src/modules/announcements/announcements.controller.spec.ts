import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CLASS_ID = 'class-uuid-1';
const ANN_ID = 'ann-uuid-1';

const TEACHER_USER = { userId: 'teacher-uuid-1', roles: ['teacher'] };
const STUDENT_USER = { userId: 'student-uuid-1', roles: ['student'] };
const ADMIN_USER = { userId: 'admin-uuid-1', roles: ['admin'] };

const makeAnnouncement = (overrides: Partial<any> = {}) => ({
  id: ANN_ID,
  classId: CLASS_ID,
  authorId: TEACHER_USER.userId,
  title: 'Test Announcement',
  content: '<p>Hello class</p>',
  isPinned: false,
  scheduledAt: null,
  publishedAt: new Date(),
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;

  const mockService = {
    create: jest.fn(),
    findAllByClass: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementsController],
      providers: [{ provide: AnnouncementsService, useValue: mockService }],
    }).compile();

    controller = module.get<AnnouncementsController>(AnnouncementsController);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /classes/:classId/announcements
  // ──────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('returns standard success envelope with created announcement', async () => {
      const ann = makeAnnouncement();
      mockService.create.mockResolvedValue(ann);

      const dto = { title: 'Hello', content: '<p>Test</p>' };
      const result = await controller.create(
        CLASS_ID,
        dto as any,
        TEACHER_USER,
      );

      expect(result).toEqual({
        success: true,
        message: 'Announcement created.',
        data: ann,
      });
      expect(mockService.create).toHaveBeenCalledWith(
        CLASS_ID,
        TEACHER_USER.userId,
        dto,
        false,
      );
    });

    it('passes teacherId from CurrentUser, not from params', async () => {
      mockService.create.mockResolvedValue(makeAnnouncement());

      await controller.create(
        CLASS_ID,
        { title: 'x', content: '<p>y</p>' } as any,
        TEACHER_USER,
      );

      const [, calledTeacherId] = mockService.create.mock.calls[0];
      expect(calledTeacherId).toBe(TEACHER_USER.userId);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /classes/:classId/announcements
  // ──────────────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('passes isTeacher=true when user has teacher role', async () => {
      mockService.findAllByClass.mockResolvedValue([]);

      await controller.findAll(CLASS_ID, {} as any, TEACHER_USER);

      const [, , isTeacher] = mockService.findAllByClass.mock.calls[0];
      expect(isTeacher).toBe(true);
    });

    it('passes isTeacher=false when user has student role', async () => {
      mockService.findAllByClass.mockResolvedValue([]);

      await controller.findAll(CLASS_ID, {} as any, STUDENT_USER);

      const [, , isTeacher] = mockService.findAllByClass.mock.calls[0];
      expect(isTeacher).toBe(false);
    });

    it('treats admin as a privileged class viewer', async () => {
      mockService.findAllByClass.mockResolvedValue([]);

      await controller.findAll(CLASS_ID, {} as any, ADMIN_USER);

      const [, , isTeacher] = mockService.findAllByClass.mock.calls[0];
      expect(isTeacher).toBe(true);
    });

    it('returns standard success envelope with data array', async () => {
      const rows = [makeAnnouncement()];
      mockService.findAllByClass.mockResolvedValue(rows);

      const result = await controller.findAll(
        CLASS_ID,
        {} as any,
        TEACHER_USER,
      );

      expect(result).toEqual({
        success: true,
        message: 'Announcements retrieved.',
        data: rows,
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /classes/:classId/announcements/:id
  // ──────────────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('resolves and wraps announcement in success envelope', async () => {
      const ann = makeAnnouncement();
      mockService.findOne.mockResolvedValue(ann);

      const result = await controller.findOne(CLASS_ID, ANN_ID, TEACHER_USER);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(ann);
      expect(mockService.findOne).toHaveBeenCalledWith(CLASS_ID, ANN_ID, true);
    });

    it('passes isTeacher=false for student user', async () => {
      mockService.findOne.mockResolvedValue(makeAnnouncement());

      await controller.findOne(CLASS_ID, ANN_ID, STUDENT_USER);

      const [, , isTeacher] = mockService.findOne.mock.calls[0];
      expect(isTeacher).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /classes/:classId/announcements/:id
  // ──────────────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('passes all four arguments to service and returns success envelope', async () => {
      const updated = makeAnnouncement({ title: 'New Title' });
      mockService.update.mockResolvedValue(updated);

      const dto = { title: 'New Title' };
      const result = await controller.update(
        CLASS_ID,
        ANN_ID,
        dto as any,
        TEACHER_USER,
      );

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('New Title');
      expect(mockService.update).toHaveBeenCalledWith(
        CLASS_ID,
        ANN_ID,
        TEACHER_USER.userId,
        dto,
        false,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE /classes/:classId/announcements/:id
  // ──────────────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('returns success:true when service soft-deletes', async () => {
      mockService.remove.mockResolvedValue({
        message: 'Announcement archived successfully.',
      });

      const result = await controller.remove(CLASS_ID, ANN_ID, TEACHER_USER);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Announcement archived successfully.');
      expect(mockService.remove).toHaveBeenCalledWith(
        CLASS_ID,
        ANN_ID,
        TEACHER_USER.userId,
        false,
      );
    });
  });
});

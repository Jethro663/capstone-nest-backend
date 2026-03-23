import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CURRENT_USER = { userId: 'user-uuid-1' };
const NOTIF_ID = 'notif-uuid-1';

const makeNotification = (overrides: Partial<any> = {}) => ({
  id: NOTIF_ID,
  userId: CURRENT_USER.userId,
  type: 'announcement_posted',
  title: 'Test',
  body: 'Body text',
  isRead: false,
  readAt: null,
  createdAt: new Date(),
  ...overrides,
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockService = {
    findByUser: jest.fn(),
    getUnreadCount: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /notifications
  // ──────────────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns paginated notifications in success envelope', async () => {
      const rows = [makeNotification()];
      mockService.findByUser.mockResolvedValue({
        data: rows,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.findAll(CURRENT_USER, {
        page: 1,
        limit: 20,
      } as any);

      expect(result).toEqual({
        success: true,
        message: 'Notifications retrieved.',
        data: rows,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockService.findByUser).toHaveBeenCalledWith(CURRENT_USER.userId, {
        page: 1,
        limit: 20,
      });
    });

    it('passes userId from CurrentUser to service, not a param', async () => {
      mockService.findByUser.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await controller.findAll(CURRENT_USER, {} as any);

      expect(mockService.findByUser.mock.calls[0][0]).toBe(CURRENT_USER.userId);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /notifications/unread-count
  // ──────────────────────────────────────────────────────────────────────────

  describe('getUnreadCount()', () => {
    it('returns count nested in data object', async () => {
      mockService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount(CURRENT_USER);

      expect(result).toEqual({
        success: true,
        message: 'Unread count retrieved.',
        data: { count: 5 },
      });
    });

    it('returns count of 0 when all notifications are read', async () => {
      mockService.getUnreadCount.mockResolvedValue(0);

      const result = await controller.getUnreadCount(CURRENT_USER);

      expect(result.data.count).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /notifications/read-all
  // ──────────────────────────────────────────────────────────────────────────

  describe('markAllRead()', () => {
    it('returns updatedCount in data and success:true', async () => {
      mockService.markAllRead.mockResolvedValue({ updatedCount: 4 });

      const result = await controller.markAllRead(CURRENT_USER);

      expect(result).toEqual({
        success: true,
        message: 'All notifications marked as read.',
        data: { updatedCount: 4 },
      });
      expect(mockService.markAllRead).toHaveBeenCalledWith(CURRENT_USER.userId);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /notifications/:id/read
  // ──────────────────────────────────────────────────────────────────────────

  describe('markRead()', () => {
    it('calls service with id and userId and wraps result', async () => {
      const updated = makeNotification({ isRead: true });
      mockService.markRead.mockResolvedValue(updated);

      const result = await controller.markRead(NOTIF_ID, CURRENT_USER);

      expect(result).toEqual({
        success: true,
        message: 'Notification marked as read.',
        data: updated,
      });
      expect(mockService.markRead).toHaveBeenCalledWith(
        NOTIF_ID,
        CURRENT_USER.userId,
      );
    });

    it('passes userId from CurrentUser to prevent cross-user marking', async () => {
      mockService.markRead.mockResolvedValue(
        makeNotification({ isRead: true }),
      );

      await controller.markRead(NOTIF_ID, CURRENT_USER);

      const [, calledUserId] = mockService.markRead.mock.calls[0];
      expect(calledUserId).toBe(CURRENT_USER.userId);
    });
  });
});

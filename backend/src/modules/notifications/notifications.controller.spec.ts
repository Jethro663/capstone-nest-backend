import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDevicesService } from './notification-devices.service';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CURRENT_USER = { userId: 'user-uuid-1' };
const NOTIF_ID = 'notif-uuid-1';
const INSTALLATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
    dismissOne: jest.fn(),
    dismissAll: jest.fn(),
  };
  const mockDevicesService = {
    register: jest.fn(),
    revoke: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockService },
        { provide: NotificationDevicesService, useValue: mockDevicesService },
      ],
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

  describe('dismissOne()', () => {
    it('dismisses only the authenticated user notification', async () => {
      mockService.dismissOne.mockResolvedValue({ dismissedCount: 1 });

      const result = await controller.dismissOne(NOTIF_ID, CURRENT_USER);

      expect(mockService.dismissOne).toHaveBeenCalledWith(
        NOTIF_ID,
        CURRENT_USER.userId,
      );
      expect(result).toEqual({
        success: true,
        message: 'Notification deleted.',
        data: { dismissedCount: 1 },
      });
    });
  });

  describe('dismissAll()', () => {
    it('dismisses all visible notifications for the authenticated user', async () => {
      mockService.dismissAll.mockResolvedValue({ dismissedCount: 4 });

      const result = await controller.dismissAll(CURRENT_USER);

      expect(mockService.dismissAll).toHaveBeenCalledWith(CURRENT_USER.userId);
      expect(result).toEqual({
        success: true,
        message: 'Notifications cleared.',
        data: { dismissedCount: 4 },
      });
    });
  });

  describe('notification devices', () => {
    it('registers against the authenticated user and never accepts a body user id', async () => {
      const dto = {
        platform: 'android' as const,
        provider: 'expo' as const,
        pushToken: 'ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]',
        notificationsEnabled: true,
        appVersion: '0.1.45',
        buildNumber: 46,
      };
      mockDevicesService.register.mockResolvedValue({
        installationId: INSTALLATION_ID,
        notificationsEnabled: true,
      });

      const result = await controller.registerDevice(
        INSTALLATION_ID,
        CURRENT_USER,
        dto,
      );

      expect(mockDevicesService.register).toHaveBeenCalledWith(
        CURRENT_USER.userId,
        INSTALLATION_ID,
        dto,
      );
      expect(result).toEqual({
        success: true,
        message: 'Notification device registered.',
        data: {
          installationId: INSTALLATION_ID,
          notificationsEnabled: true,
        },
      });
    });

    it('revokes only the authenticated user installation', async () => {
      mockDevicesService.revoke.mockResolvedValue({
        installationId: INSTALLATION_ID,
        notificationsEnabled: false,
        disabled: true,
      });

      await controller.revokeDevice(INSTALLATION_ID, CURRENT_USER);

      expect(mockDevicesService.revoke).toHaveBeenCalledWith(
        CURRENT_USER.userId,
        INSTALLATION_ID,
        'user_revoke',
      );
    });
  });
});

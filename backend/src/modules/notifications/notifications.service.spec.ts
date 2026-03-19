import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { DatabaseService } from '../../database/database.service';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1';
const OTHER_USER_ID = 'user-uuid-2';
const NOTIF_ID = 'notif-uuid-1';
const ANN_ID = 'ann-uuid-1';

const makeNotification = (overrides: Partial<any> = {}) => ({
  id: NOTIF_ID,
  userId: USER_ID,
  type: 'announcement_posted',
  referenceId: ANN_ID,
  title: 'New Announcement',
  body: 'A new announcement was posted in your class.',
  isRead: false,
  readAt: null,
  createdAt: new Date(),
  ...overrides,
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb = {
      query: {
        notifications: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // createBulk()
  // ══════════════════════════════════════════════════════════════════════════

  describe('createBulk()', () => {
    it('calls db.insert with all provided inputs', async () => {
      const insertChain = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const inputs = [
        {
          userId: 'u1',
          type: 'announcement_posted' as const,
          title: 'T',
          body: 'B',
        },
        {
          userId: 'u2',
          type: 'announcement_posted' as const,
          title: 'T',
          body: 'B',
        },
      ];

      await service.createBulk(inputs);

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      const passedRows = insertChain.values.mock.calls[0][0];
      expect(passedRows).toHaveLength(2);
      expect(passedRows[0].userId).toBe('u1');
      expect(passedRows[1].userId).toBe('u2');
    });

    it('does nothing when inputs array is empty (no DB call)', async () => {
      await service.createBulk([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('sets isRead=false on every inserted notification', async () => {
      const capturedRows: any[] = [];
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockImplementation((rows) => {
          capturedRows.push(...rows);
          return Promise.resolve(undefined);
        }),
      });

      await service.createBulk([
        {
          userId: 'u1',
          type: 'announcement_posted' as const,
          title: 'T',
          body: 'B',
        },
      ]);

      expect(capturedRows[0].isRead).toBe(false);
    });

    it('propagates referenceId when provided', async () => {
      const capturedRows: any[] = [];
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockImplementation((rows) => {
          capturedRows.push(...rows);
          return Promise.resolve(undefined);
        }),
      });

      await service.createBulk([
        {
          userId: 'u1',
          type: 'announcement_posted' as const,
          referenceId: ANN_ID,
          title: 'T',
          body: 'B',
        },
      ]);

      expect(capturedRows[0].referenceId).toBe(ANN_ID);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findByUser()
  // ══════════════════════════════════════════════════════════════════════════

  describe('findByUser()', () => {
    it('returns paginated notifications from db', async () => {
      const rows = [makeNotification()];
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 1 }]),
        }),
      });
      mockDb.query.notifications.findMany.mockResolvedValue(rows);

      const result = await service.findByUser(USER_ID, { page: 1, limit: 20 });

      expect(result).toEqual({
        data: rows,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('calculates correct offset for page 2', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 0 }]),
        }),
      });
      mockDb.query.notifications.findMany.mockResolvedValue([]);

      await service.findByUser(USER_ID, { page: 2, limit: 10 });

      expect(mockDb.query.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 10 }),
      );
    });

    it('applies the isRead filter when provided', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 0 }]),
        }),
      });
      mockDb.query.notifications.findMany.mockResolvedValue([]);

      await service.findByUser(USER_ID, {
        page: 1,
        limit: 20,
        isRead: false,
      });

      expect(mockDb.query.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // getUnreadCount()
  // ══════════════════════════════════════════════════════════════════════════

  describe('getUnreadCount()', () => {
    it('returns the numeric count from DB', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ value: 7 }]),
        }),
      });

      const count = await service.getUnreadCount(USER_ID);

      expect(count).toBe(7);
    });

    it('returns 0 when no unread notifications', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ value: 0 }]),
        }),
      });

      const count = await service.getUnreadCount(USER_ID);

      expect(count).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // markRead()
  // ══════════════════════════════════════════════════════════════════════════

  describe('markRead()', () => {
    it('marks notification as read and returns the updated row', async () => {
      const notif = makeNotification({ isRead: false });
      const updatedNotif = makeNotification({
        isRead: true,
        readAt: new Date(),
      });

      mockDb.query.notifications.findFirst.mockResolvedValue(notif);
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedNotif]),
          }),
        }),
      });

      const result = await service.markRead(NOTIF_ID, USER_ID);

      expect(result.isRead).toBe(true);
    });

    it('throws NotFoundException when notification does not exist', async () => {
      mockDb.query.notifications.findFirst.mockResolvedValue(null);

      await expect(service.markRead(NOTIF_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when notification belongs to another user', async () => {
      mockDb.query.notifications.findFirst.mockResolvedValue(
        makeNotification({ userId: OTHER_USER_ID }),
      );

      await expect(service.markRead(NOTIF_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns notification immediately without DB update when already read', async () => {
      const alreadyRead = makeNotification({
        isRead: true,
        readAt: new Date(),
      });
      mockDb.query.notifications.findFirst.mockResolvedValue(alreadyRead);

      const result = await service.markRead(NOTIF_ID, USER_ID);

      // No update query should have been issued
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual(alreadyRead);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // markAllRead()
  // ══════════════════════════════════════════════════════════════════════════

  describe('markAllRead()', () => {
    it('returns the count of updated notifications', async () => {
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest
              .fn()
              .mockResolvedValue([{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }]),
          }),
        }),
      });

      const result = await service.markAllRead(USER_ID);

      expect(result).toEqual({ updatedCount: 3 });
    });

    it('returns updatedCount:0 when all already read', async () => {
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.markAllRead(USER_ID);

      expect(result).toEqual({ updatedCount: 0 });
    });
  });
});

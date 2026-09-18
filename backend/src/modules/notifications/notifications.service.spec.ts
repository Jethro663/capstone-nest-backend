import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  NotificationsService,
  visibleNotificationsWhere,
} from './notifications.service';
import { DatabaseService } from '../../database/database.service';
import { PgDialect } from 'drizzle-orm/pg-core';
import { PushNotificationDispatchService } from './push-notification-dispatch.service';

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
  hiddenAt: null,
  dismissedAt: null,
  createdAt: new Date(),
  ...overrides,
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockDb: any;

  const createInsertChain = () => {
    const insertChain: {
      values: jest.Mock;
      onConflictDoUpdate: jest.Mock;
      onConflictDoNothing: jest.Mock;
      returning: jest.Mock;
    } = {
      values: jest.fn(),
      onConflictDoUpdate: jest.fn(),
      onConflictDoNothing: jest.fn(),
      returning: jest.fn().mockResolvedValue([]),
    };
    insertChain.values.mockReturnValue(insertChain);
    insertChain.onConflictDoUpdate.mockReturnValue(insertChain);
    insertChain.onConflictDoNothing.mockReturnValue(insertChain);
    return insertChain;
  };

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
    it('keeps the persisted inbox result when post-commit push dispatch fails', async () => {
      const insertChain = createInsertChain();
      const persisted = {
        id: 'notification-row-1',
        userId: 'u1',
        type: 'announcement_posted',
        referenceId: ANN_ID,
        title: 'T',
        body: 'B',
        metadata: null,
        dismissedAt: null,
        createdAt: new Date('2026-09-18T00:00:00.000Z'),
      };
      insertChain.returning.mockResolvedValue([persisted]);
      mockDb.insert.mockReturnValue(insertChain);
      const dispatch = {
        enqueueCreated: jest.fn().mockRejectedValue(new Error('queue down')),
      };
      const isolatedService = new NotificationsService(
        { db: mockDb } as DatabaseService,
        dispatch as unknown as PushNotificationDispatchService,
      );

      await expect(
        isolatedService.createBulk([
          {
            userId: 'u1',
            type: 'announcement_posted',
            referenceId: ANN_ID,
            title: 'T',
            body: 'B',
          },
        ]),
      ).resolves.toEqual([
        expect.objectContaining({ id: 'notification-row-1' }),
      ]);
      expect(dispatch.enqueueCreated).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'notification-row-1' }),
      ]);
    });

    it('calls db.insert with all provided inputs', async () => {
      const insertChain = createInsertChain();
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
      expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
    });

    it('returns the persisted notification identities needed by realtime clients', async () => {
      const insertChain = createInsertChain();
      const createdAt = new Date('2026-09-16T00:00:00.000Z');
      insertChain.returning.mockResolvedValue([
        {
          id: 'notification-row-1',
          userId: 'u1',
          type: 'announcement_posted',
          referenceId: ANN_ID,
          title: 'T',
          body: 'B',
          metadata: { classId: 'class-1' },
          dismissedAt: null,
          createdAt,
        },
      ]);
      mockDb.insert.mockReturnValue(insertChain);

      await expect(
        service.createBulk([
          {
            userId: 'u1',
            type: 'announcement_posted',
            referenceId: ANN_ID,
            title: 'T',
            body: 'B',
            metadata: { classId: 'class-1' },
          },
        ]),
      ).resolves.toEqual([
        expect.objectContaining({
          id: 'notification-row-1',
          referenceId: ANN_ID,
          createdAt,
        }),
      ]);
    });

    it('does not re-emit a notification the user already dismissed', async () => {
      const insertChain = createInsertChain();
      insertChain.returning.mockResolvedValue([
        {
          id: 'notification-row-1',
          userId: 'u1',
          type: 'grade_updated',
          referenceId: 'grade-1',
          title: 'Grade updated',
          body: 'Your grade changed.',
          metadata: null,
          dismissedAt: new Date('2026-09-15T00:00:00.000Z'),
          createdAt: new Date('2026-09-16T00:00:00.000Z'),
        },
      ]);
      mockDb.insert.mockReturnValue(insertChain);

      await expect(
        service.createBulk([
          {
            userId: 'u1',
            type: 'grade_updated',
            referenceId: 'grade-1',
            title: 'Grade updated',
            body: 'Your grade changed.',
          },
        ]),
      ).resolves.toEqual([]);
    });

    it('does nothing when inputs array is empty (no DB call)', async () => {
      await service.createBulk([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('sets isRead=false on every inserted notification', async () => {
      const capturedRows: any[] = [];
      const insertChain = createInsertChain();
      insertChain.values.mockImplementation((rows) => {
        capturedRows.push(...rows);
        return insertChain;
      });
      mockDb.insert = jest.fn().mockReturnValue(insertChain);

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
      const insertChain = createInsertChain();
      insertChain.values.mockImplementation((rows) => {
        capturedRows.push(...rows);
        return insertChain;
      });
      mockDb.insert = jest.fn().mockReturnValue(insertChain);

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

    it('upserts duplicate reference notifications instead of throwing', async () => {
      const insertChain = createInsertChain();
      mockDb.insert.mockReturnValue(insertChain);

      await service.createBulk([
        {
          userId: 'u1',
          type: 'grade_updated',
          referenceId: 'case-1',
          title: 'New intervention checklist assigned',
          body: 'Open Learners Path to continue.',
        },
      ]);

      expect(insertChain.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.any(Array),
          targetWhere: expect.anything(),
          set: expect.objectContaining({
            title: expect.anything(),
            body: expect.anything(),
            isRead: false,
            readAt: null,
            createdAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findByUser()
  // ══════════════════════════════════════════════════════════════════════════

  describe('findByUser()', () => {
    it('uses the same hidden-row exclusion for inbox and unread queries', () => {
      const dialect = new PgDialect();
      const compiled = dialect.sqlToQuery(
        visibleNotificationsWhere(USER_ID, false)!,
      );

      expect(compiled.sql).toContain('"notifications"."hidden_at" is null');
      expect(compiled.sql).toContain('"notifications"."dismissed_at" is null');
      expect(compiled.sql).toContain('"notifications"."is_read" = $2');
    });

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

  describe('hideArchivedTeacherContext()', () => {
    it('sets hiddenAt only when staff and archived context ids are supplied', async () => {
      const where = jest.fn().mockResolvedValue(undefined);
      const set = jest.fn().mockReturnValue({ where });
      mockDb.update.mockReturnValue({ set });

      await service.hideArchivedTeacherContext({
        userIds: ['teacher-1'],
        classIds: ['class-1'],
        sectionIds: ['section-1'],
      });

      expect(set).toHaveBeenCalledWith({ hiddenAt: expect.any(Date) });
      expect(where).toHaveBeenCalledWith(expect.anything());
    });

    it('does not update when there is no staff recipient or context', async () => {
      await service.hideArchivedTeacherContext({
        userIds: [],
        classIds: ['class-1'],
        sectionIds: [],
      });
      await service.hideArchivedTeacherContext({
        userIds: ['teacher-1'],
        classIds: [],
        sectionIds: [],
      });

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('createBulkDeduped()', () => {
    it('skips notifications that already exist for the same user, type, and reference', async () => {
      const insertChain = createInsertChain();
      mockDb.insert.mockReturnValue(insertChain);
      insertChain.returning.mockResolvedValue([
        {
          id: 'notification-row-u2',
          userId: 'u2',
          type: 'assessment_assigned',
          referenceId: 'assessment-1',
          title: 'New assessment',
          body: 'A new assessment is available.',
          metadata: { classId: 'class-1' },
          createdAt: new Date('2026-09-16T00:00:00.000Z'),
        },
      ]);

      const inserted = await service.createBulkDeduped([
        {
          userId: 'u1',
          type: 'assessment_assigned',
          referenceId: 'assessment-1',
          title: 'New assessment',
          body: 'A new assessment is available.',
        },
        {
          userId: 'u2',
          type: 'assessment_assigned',
          referenceId: 'assessment-1',
          title: 'New assessment',
          body: 'A new assessment is available.',
        },
      ]);

      expect(inserted.map((item) => item.userId)).toEqual(['u2']);
      expect(inserted[0]).toEqual(
        expect.objectContaining({
          id: 'notification-row-u2',
          referenceId: 'assessment-1',
          metadata: { classId: 'class-1' },
        }),
      );
      expect(insertChain.onConflictDoNothing).toHaveBeenCalled();
    });
  });

  describe('dismissOne()', () => {
    it('dismisses only the current user notification', async () => {
      const returning = jest.fn().mockResolvedValue([{ id: NOTIF_ID }]);
      const where = jest.fn().mockReturnValue({ returning });
      const set = jest.fn().mockReturnValue({ where });
      mockDb.update.mockReturnValue({ set });

      const result = await service.dismissOne(NOTIF_ID, USER_ID);

      expect(set).toHaveBeenCalledWith({ dismissedAt: expect.any(Date) });
      expect(where).toHaveBeenCalledWith(expect.anything());
      expect(result).toEqual({ dismissedCount: 1 });
    });

    it('is idempotent when the notification is missing, foreign, or already dismissed', async () => {
      const returning = jest.fn().mockResolvedValue([]);
      const where = jest.fn().mockReturnValue({ returning });
      const set = jest.fn().mockReturnValue({ where });
      mockDb.update.mockReturnValue({ set });

      await expect(service.dismissOne(NOTIF_ID, USER_ID)).resolves.toEqual({
        dismissedCount: 0,
      });
    });
  });

  describe('dismissAll()', () => {
    it('dismisses all visible notifications for only the current user', async () => {
      const returning = jest
        .fn()
        .mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);
      const where = jest.fn().mockReturnValue({ returning });
      const set = jest.fn().mockReturnValue({ where });
      mockDb.update.mockReturnValue({ set });

      const result = await service.dismissAll(USER_ID);

      expect(set).toHaveBeenCalledWith({ dismissedAt: expect.any(Date) });
      expect(where).toHaveBeenCalledWith(expect.anything());
      expect(result).toEqual({ dismissedCount: 2 });
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

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { AnnouncementsService } from './announcements.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CLASS_ID = 'class-uuid-1';
const TEACHER_ID = 'teacher-uuid-1';
const OTHER_TEACHER_ID = 'teacher-uuid-2';
const ANN_ID = 'ann-uuid-1';

const makeClass = (overrides: Partial<any> = {}) => ({
  id: CLASS_ID,
  teacherId: TEACHER_ID,
  subjectName: 'Math',
  ...overrides,
});

const makeAnnouncement = (overrides: Partial<any> = {}) => ({
  id: ANN_ID,
  classId: CLASS_ID,
  authorId: TEACHER_ID,
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Builds the Drizzle insert(...).values().returning() chain mock */
function makeInsertChain(returnValue: any[]) {
  return {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(returnValue),
      }),
    }),
  };
}

/** Builds the Drizzle update(...).set().where() chain mock */
function makeUpdateChain(returnValue: any[] = []) {
  return {
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(returnValue),
      }),
    }),
  };
}

/** update().set().where().returning() */
function makeUpdateReturningChain(returnValue: any[]) {
  return {
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(returnValue),
        }),
      }),
    }),
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let mockDb: any;
  let mockQueue: { add: jest.Mock };
  let mockAuditService: { log: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

    mockDb = {
      query: {
        classes: { findFirst: jest.fn() },
        announcements: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: getQueueToken('announcements'), useValue: mockQueue },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // create()
  // ══════════════════════════════════════════════════════════════════════════

  describe('create()', () => {
    it('inserts an announcement and enqueues a fan-out job for immediate posts', async () => {
      const ann = makeAnnouncement();
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      Object.assign(mockDb, makeInsertChain([ann]));

      const dto = { title: 'Hello', content: '<p>Test</p>', isPinned: false };
      const result = await service.create(CLASS_ID, TEACHER_ID, dto as any);

      expect(result).toEqual(ann);

      // Queue receives the job
      expect(mockQueue.add).toHaveBeenCalledWith(
        'fan-out',
        expect.objectContaining({ announcementId: ann.id, classId: CLASS_ID }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('strips XSS from content before inserting', async () => {
      const maliciousContent = '<script>alert("xss")</script><p>Hello</p>';
      const capturedValues: any[] = [];

      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockImplementation((vals) => {
          capturedValues.push(vals);
          return {
            returning: jest.fn().mockResolvedValue([makeAnnouncement()]),
          };
        }),
      });

      await service.create(CLASS_ID, TEACHER_ID, {
        title: 'Test',
        content: maliciousContent,
      } as any);

      expect(capturedValues[0].content).not.toContain('<script>');
      expect(capturedValues[0].content).not.toContain('alert');
    });

    it('trims whitespace from title before inserting', async () => {
      const capturedValues: any[] = [];
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockImplementation((vals) => {
          capturedValues.push(vals);
          return {
            returning: jest.fn().mockResolvedValue([makeAnnouncement()]),
          };
        }),
      });

      await service.create(CLASS_ID, TEACHER_ID, {
        title: '   Spaces Around   ',
        content: '<p>hello</p>',
      } as any);

      expect(capturedValues[0].title).toBe('Spaces Around');
    });

    it('does NOT enqueue fan-out when scheduledAt is in the future', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      Object.assign(
        mockDb,
        makeInsertChain([
          makeAnnouncement({
            scheduledAt: new Date(futureDate),
            publishedAt: null,
          }),
        ]),
      );

      await service.create(CLASS_ID, TEACHER_ID, {
        title: 'Future',
        content: '<p>scheduled</p>',
        scheduledAt: futureDate,
      } as any);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when teacher does not own the class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(null); // class not found for this teacher

      await expect(
        service.create(CLASS_ID, OTHER_TEACHER_ID, {
          title: 'Test',
          content: '<p>test</p>',
        } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findAllByClass()
  // ══════════════════════════════════════════════════════════════════════════

  describe('findAllByClass()', () => {
    it('calls findMany with correct pagination offset', async () => {
      mockDb.query.announcements.findMany.mockResolvedValue([]);

      await service.findAllByClass(CLASS_ID, TEACHER_ID, true, {
        page: 3,
        limit: 10,
      });

      expect(mockDb.query.announcements.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20 }),
      );
    });

    it('returns announcements from db', async () => {
      const rows = [makeAnnouncement(), makeAnnouncement({ id: 'ann-2' })];
      mockDb.query.announcements.findMany.mockResolvedValue(rows);

      const result = await service.findAllByClass(
        CLASS_ID,
        TEACHER_ID,
        true,
        {},
      );

      expect(result).toHaveLength(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findOne()
  // ══════════════════════════════════════════════════════════════════════════

  describe('findOne()', () => {
    it('returns the announcement when found', async () => {
      const ann = makeAnnouncement();
      mockDb.query.announcements.findFirst.mockResolvedValue(ann);

      const result = await service.findOne(CLASS_ID, ANN_ID, false);
      expect(result).toEqual(ann);
    });

    it('throws NotFoundException when announcement does not exist', async () => {
      mockDb.query.announcements.findFirst.mockResolvedValue(null);

      await expect(service.findOne(CLASS_ID, ANN_ID, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // update()
  // ══════════════════════════════════════════════════════════════════════════

  describe('update()', () => {
    it('updates allowed fields and returns the updated row', async () => {
      const updated = makeAnnouncement({
        title: 'Updated Title',
        isPinned: true,
      });

      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.announcements.findFirst.mockResolvedValue(
        makeAnnouncement(),
      );
      Object.assign(mockDb, makeUpdateReturningChain([updated]));

      const result = await service.update(CLASS_ID, ANN_ID, TEACHER_ID, {
        title: 'Updated Title',
        isPinned: true,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.isPinned).toBe(true);
    });

    it('throws NotFoundException when announcement is not found', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.announcements.findFirst.mockResolvedValue(null);

      await expect(
        service.update(CLASS_ID, ANN_ID, TEACHER_ID, { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when teacher does not own the announcement', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      // Announcement was authored by someone else
      mockDb.query.announcements.findFirst.mockResolvedValue(
        makeAnnouncement({ authorId: 'another-teacher' }),
      );

      await expect(
        service.update(CLASS_ID, ANN_ID, TEACHER_ID, { title: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when teacher does not own the class', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(null);

      await expect(
        service.update(CLASS_ID, ANN_ID, OTHER_TEACHER_ID, { title: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('re-sanitizes content on update', async () => {
      const capturedSet: any[] = [];
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.announcements.findFirst.mockResolvedValue(
        makeAnnouncement(),
      );
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((vals) => {
          capturedSet.push(vals);
          return {
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([makeAnnouncement()]),
            }),
          };
        }),
      });

      await service.update(CLASS_ID, ANN_ID, TEACHER_ID, {
        content: '<script>evil()</script><p>safe</p>',
      });

      expect(capturedSet[0].content).not.toContain('<script>');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // remove()
  // ══════════════════════════════════════════════════════════════════════════

  describe('remove()', () => {
    it('sets archivedAt (soft delete) and returns success message', async () => {
      const capturedSet: any[] = [];
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.announcements.findFirst.mockResolvedValue(
        makeAnnouncement(),
      );
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((vals) => {
          capturedSet.push(vals);
          return { where: jest.fn().mockResolvedValue(undefined) };
        }),
      });

      const result = await service.remove(CLASS_ID, ANN_ID, TEACHER_ID);

      expect(result.message).toContain('archived');
      expect(capturedSet[0].archivedAt).toBeDefined();
    });

    it('throws NotFoundException when announcement does not exist', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.announcements.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(CLASS_ID, ANN_ID, TEACHER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when teacher did not author the announcement', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.announcements.findFirst.mockResolvedValue(
        makeAnnouncement({ authorId: 'another-teacher' }),
      );

      await expect(
        service.remove(CLASS_ID, ANN_ID, TEACHER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // publishDueAnnouncements()
  // ══════════════════════════════════════════════════════════════════════════

  describe('publishDueAnnouncements()', () => {
    it('enqueues fan-out jobs for each due announcement', async () => {
      const due = [
        makeAnnouncement({ id: 'sched-1', publishedAt: null }),
        makeAnnouncement({ id: 'sched-2', publishedAt: null }),
      ];
      mockDb.query.announcements.findMany.mockResolvedValue(due);
      Object.assign(mockDb, makeUpdateChain([]));

      await service.publishDueAnnouncements();

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'fan-out',
        expect.objectContaining({ announcementId: 'sched-1' }),
        expect.anything(),
      );
    });

    it('does nothing when no announcements are due', async () => {
      mockDb.query.announcements.findMany.mockResolvedValue([]);

      await service.publishDueAnnouncements();

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});

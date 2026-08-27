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
        classes: { findFirst: jest.fn(), findMany: jest.fn() },
        enrollments: { findFirst: jest.fn() },
        announcements: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
      select: jest.fn(),
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
    mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
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

      await service.findAllByClass(CLASS_ID, TEACHER_ID, ['teacher'], {
        page: 3,
        limit: 10,
      });

      expect(mockDb.query.announcements.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20 }),
      );
    });

    it('returns announcements with owner capabilities', async () => {
      const rows = [makeAnnouncement(), makeAnnouncement({ id: 'ann-2' })];
      mockDb.query.announcements.findMany.mockResolvedValue(rows);

      const result = await service.findAllByClass(
        CLASS_ID,
        TEACHER_ID,
        ['teacher'],
        {},
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          canEdit: true,
          canDelete: true,
          restrictionReason: null,
        }),
      );
    });

    it('marks announcements from another author as protected', async () => {
      mockDb.query.announcements.findMany.mockResolvedValue([
        makeAnnouncement({ authorId: 'admin-uuid-1' }),
      ]);

      const [result] = await service.findAllByClass(
        CLASS_ID,
        TEACHER_ID,
        ['teacher'],
        {},
      );

      expect(result).toEqual(
        expect.objectContaining({
          canEdit: false,
          canDelete: false,
          restrictionReason: 'not_author',
        }),
      );
    });

    it('prioritizes core template protection over ownership', async () => {
      mockDb.query.announcements.findMany.mockResolvedValue([
        makeAnnouncement({ isCoreTemplateAsset: true }),
      ]);

      const [result] = await service.findAllByClass(
        CLASS_ID,
        TEACHER_ID,
        ['teacher'],
        {},
      );

      expect(result).toEqual(
        expect.objectContaining({
          canEdit: false,
          canDelete: false,
          restrictionReason: 'core_template',
        }),
      );
    });

    it('allows admins to manage non-core announcements', async () => {
      mockDb.query.announcements.findMany.mockResolvedValue([
        makeAnnouncement({ authorId: 'teacher-uuid-99' }),
      ]);

      const [result] = await service.findAllByClass(
        CLASS_ID,
        'admin-uuid-1',
        ['admin'],
        {},
      );

      expect(result).toEqual(
        expect.objectContaining({
          canEdit: true,
          canDelete: true,
          restrictionReason: null,
        }),
      );
    });

    it('returns false capabilities to enrolled students', async () => {
      mockDb.query.enrollments.findFirst.mockResolvedValue({ id: 'enrollment' });
      mockDb.query.announcements.findMany.mockResolvedValue([
        makeAnnouncement({ authorId: 'teacher-uuid-99' }),
      ]);

      const [result] = await service.findAllByClass(
        CLASS_ID,
        'student-uuid-1',
        ['student'],
        {},
      );

      expect(result).toEqual(
        expect.objectContaining({
          canEdit: false,
          canDelete: false,
          restrictionReason: 'not_author',
        }),
      );
    });

    it('throws ForbiddenException when student viewer is not enrolled', async () => {
      mockDb.query.enrollments.findFirst.mockResolvedValue(null);

      await expect(
        service.findAllByClass(CLASS_ID, 'student-uuid-99', ['student'], {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findTeacherFeed()', () => {
    const classTwo = {
      id: 'class-uuid-2',
      teacherId: TEACHER_ID,
      subjectCode: 'SCI8',
      subjectName: 'Science',
      section: { id: 'section-2', name: 'Bonifacio' },
    };

    beforeEach(() => {
      mockDb.query.classes.findMany.mockResolvedValue([
        { ...makeClass(), subjectCode: 'MATH8', section: null },
        classTwo,
      ]);
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              total: 3,
              pinnedTotal: 1,
              latestCreatedAt: new Date('2026-08-28T04:00:00.000Z'),
            },
          ]),
        }),
      });
      mockDb.query.announcements.findMany.mockResolvedValue([
        makeAnnouncement({
          id: 'pinned',
          isPinned: true,
          class: classTwo,
          author: { id: TEACHER_ID, firstName: 'Tina', lastName: 'Teacher' },
        }),
        makeAnnouncement({
          id: 'regular',
          class: { ...makeClass(), subjectCode: 'MATH8', section: null },
          author: { id: 'admin-uuid-1', firstName: 'Ada', lastName: 'Admin' },
          authorId: 'admin-uuid-1',
        }),
      ]);
    });

    it('returns paginated announcements across the teacher owned classes', async () => {
      const result = await service.findTeacherFeed(TEACHER_ID, {
        page: 1,
        limit: 2,
      });

      expect(mockDb.query.classes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
        }),
      );
      expect(mockDb.query.announcements.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 2,
          offset: 0,
          orderBy: expect.any(Array),
        }),
      );
      expect(result).toEqual({
        items: [
          expect.objectContaining({ id: 'pinned', canEdit: true }),
          expect.objectContaining({
            id: 'regular',
            canDelete: false,
            restrictionReason: 'not_author',
          }),
        ],
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        pinnedTotal: 1,
        latestCreatedAt: new Date('2026-08-28T04:00:00.000Z'),
      });
    });

    it('rejects a class filter that is not owned by the teacher', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([
        { ...makeClass(), subjectCode: 'MATH8', section: null },
      ]);

      await expect(
        service.findTeacherFeed(TEACHER_ID, {
          classId: 'class-uuid-2',
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('accepts a class filter owned by the teacher', async () => {
      await expect(
        service.findTeacherFeed(TEACHER_ID, {
          classId: CLASS_ID,
          page: 1,
          limit: 20,
        }),
      ).resolves.toEqual(expect.objectContaining({ total: 3 }));
    });

    it('returns an empty first page when the teacher has no classes', async () => {
      mockDb.query.classes.findMany.mockResolvedValue([]);

      await expect(service.findTeacherFeed(TEACHER_ID, {})).resolves.toEqual({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        pinnedTotal: 0,
        latestCreatedAt: null,
      });
      expect(mockDb.query.announcements.findMany).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findOne()
  // ══════════════════════════════════════════════════════════════════════════

  describe('findOne()', () => {
    it('returns the announcement when found', async () => {
      const ann = makeAnnouncement();
      mockDb.query.announcements.findFirst.mockResolvedValue(ann);

      const result = await service.findOne(CLASS_ID, ANN_ID, TEACHER_ID, [
        'teacher',
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          ...ann,
          canEdit: true,
          canDelete: true,
          restrictionReason: null,
        }),
      );
    });

    it('throws NotFoundException when announcement does not exist', async () => {
      mockDb.query.announcements.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(CLASS_ID, ANN_ID, TEACHER_ID, ['teacher']),
      ).rejects.toThrow(NotFoundException);
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
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: TEACHER_ID,
        action: 'announcement.updated',
        targetType: 'announcement',
        targetId: ANN_ID,
        metadata: expect.objectContaining({
          classId: CLASS_ID,
          changedFields: ['title', 'isPinned'],
          isPinned: true,
        }),
      });
    });

    it('throws NotFoundException when announcement is not found', async () => {
      mockDb.query.classes.findFirst.mockResolvedValue(makeClass());
      mockDb.query.announcements.findFirst.mockResolvedValue(null);

      await expect(
        service.update(CLASS_ID, ANN_ID, TEACHER_ID, { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockAuditService.log).not.toHaveBeenCalled();
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
        makeAnnouncement({
          id: 'sched-1',
          publishedAt: null,
          authorId: TEACHER_ID,
        }),
        makeAnnouncement({
          id: 'sched-2',
          publishedAt: null,
          authorId: OTHER_TEACHER_ID,
        }),
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
      expect(mockAuditService.log).toHaveBeenCalledTimes(2);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: TEACHER_ID,
          action: 'announcement.published_scheduled',
          targetType: 'announcement',
          targetId: 'sched-1',
          metadata: expect.objectContaining({
            classId: CLASS_ID,
            trigger: 'scheduler',
          }),
        }),
      );
    });

    it('does nothing when no announcements are due', async () => {
      mockDb.query.announcements.findMany.mockResolvedValue([]);

      await service.publishDueAnnouncements();

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });
});

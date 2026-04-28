import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DiscussionBoardService } from './discussion-board.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

describe('DiscussionBoardService', () => {
  let service: DiscussionBoardService;
  let mockDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb = {
      query: {
        classes: { findFirst: jest.fn() },
        enrollments: { findFirst: jest.fn(), findMany: jest.fn() },
        discussionThreads: { findFirst: jest.fn(), findMany: jest.fn() },
        discussionComments: { findFirst: jest.fn(), findMany: jest.fn() },
        discussionThreadAttachments: { findFirst: jest.fn() },
        discussionCommentAttachments: { findFirst: jest.fn() },
        discussionCommentReactions: { findMany: jest.fn() },
        uploadedFiles: { findFirst: jest.fn(), findMany: jest.fn() },
      },
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      select: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionBoardService,
        { provide: DatabaseService, useValue: { db: mockDb } },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: getQueueToken('discussion-board'),
          useValue: { add: jest.fn().mockResolvedValue({ id: 'job-1' }) },
        },
      ],
    }).compile();

    service = module.get<DiscussionBoardService>(DiscussionBoardService);
  });

  it('denies student thread-list access when not enrolled', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.enrollments.findFirst.mockResolvedValue(null);

    await expect(
      service.listThreads('class-1', 'student-1', ['student'], {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('enforces per-student active comment limit', async () => {
    jest.spyOn(service as any, 'getThreadOrThrow').mockResolvedValue({
      thread: {
        id: 'thread-1',
        title: 'Week 2 Discussion',
        status: 'published',
        publishedAt: new Date(),
        allowComments: true,
        commentLimitPerStudent: 1,
      },
      access: {
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        classTeacherId: 'teacher-1',
      },
    });
    jest
      .spyOn(service as any, 'resolveCommentImageAttachments')
      .mockResolvedValue([]);
    jest
      .spyOn(service as any, 'sanitizeCommentHtml')
      .mockReturnValue('<p>First</p>');

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ total: 1 }]),
      }),
    });

    await expect(
      service.createComment('class-1', 'thread-1', 'student-1', ['student'], {
        bodyHtml: '<p>Second</p>',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects non-image comment attachment uploads', async () => {
    jest.spyOn(service as any, 'getThreadOrThrow').mockResolvedValue({
      thread: {
        id: 'thread-1',
        status: 'published',
        publishedAt: new Date(),
        allowComments: true,
      },
      access: {
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        classTeacherId: 'teacher-1',
      },
    });

    await expect(
      service.uploadCommentImageFile(
        'class-1',
        'thread-1',
        'student-1',
        ['student'],
        {
          mimetype: 'application/pdf',
          originalname: 'guide.pdf',
          filename: 'guide.pdf',
          size: 5000,
          path: 'uploads/guide.pdf',
        } as Express.Multer.File,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('hides draft threads from students', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });
    mockDb.query.enrollments.findFirst.mockResolvedValue({
      id: 'enrollment-1',
    });
    mockDb.query.discussionThreads.findFirst.mockResolvedValue({
      id: 'thread-1',
      classId: 'class-1',
      authorId: 'teacher-1',
      title: 'Draft only',
      status: 'draft',
      publishedAt: null,
      archivedAt: null,
      attachments: [],
      author: {
        id: 'teacher-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'teacher@example.com',
      },
    });

    await expect(
      service.getThread('class-1', 'thread-1', 'student-1', ['student']),
    ).rejects.toThrow(NotFoundException);
  });
});

import { ForbiddenException } from '@nestjs/common';
import { JaService } from './ja.service';

const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440000';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440001';
const THREAD_ID = '550e8400-e29b-41d4-a716-446655440002';

type PaginationService = JaService & {
  getActivityHistory: (
    user: { id: string; email: string; roles: string[] },
    query: { classId: string; mode?: 'all' | 'ask' | 'review'; page?: number; limit?: number },
  ) => Promise<any>;
  getAskThread: (
    user: { id: string; email: string; roles: string[] },
    threadId: string,
    query?: { limit?: number; before?: string },
  ) => Promise<any>;
};

describe('JaService pagination', () => {
  let service: PaginationService;
  let mockDb: any;
  let countResults: Array<Array<{ total: number }>>;

  beforeEach(() => {
    countResults = [];
    mockDb = {
      query: {
        enrollments: { findFirst: jest.fn().mockResolvedValue({ classId: CLASS_ID }) },
        jaThreads: { findMany: jest.fn(), findFirst: jest.fn() },
        jaSessions: { findMany: jest.fn() },
        jaThreadMessages: { findMany: jest.fn(), findFirst: jest.fn() },
      },
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockImplementation(() =>
            Promise.resolve(countResults.shift() ?? [{ total: 0 }]),
          ),
        }),
      })),
    };

    service = new JaService(
      { db: mockDb } as any,
      {} as any,
      {} as any,
      {} as any,
    ) as PaginationService;
  });

  it('returns a stable mixed activity page with authoritative counts', async () => {
    countResults.push([{ total: 2 }], [{ total: 1 }]);
    mockDb.query.jaThreads.findMany.mockResolvedValue([
      {
        id: 'b-thread',
        classId: CLASS_ID,
        title: 'Fractions help',
        status: 'active',
        lastMessageAt: new Date('2026-08-29T10:00:00.000Z'),
        updatedAt: new Date('2026-08-29T09:00:00.000Z'),
      },
      {
        id: 'a-thread',
        classId: CLASS_ID,
        title: 'Older thread',
        status: 'active',
        lastMessageAt: null,
        updatedAt: new Date('2026-08-27T09:00:00.000Z'),
      },
    ]);
    mockDb.query.jaSessions.findMany.mockResolvedValue([
      {
        id: 'review-session',
        classId: CLASS_ID,
        status: 'completed',
        currentIndex: 4,
        questionCount: 5,
        startedAt: new Date('2026-08-28T08:00:00.000Z'),
        completedAt: new Date('2026-08-29T11:00:00.000Z'),
        updatedAt: new Date('2026-08-29T11:00:00.000Z'),
      },
    ]);

    expect(typeof service.getActivityHistory).toBe('function');
    const result = await service.getActivityHistory(
      { id: STUDENT_ID, email: 'student@example.com', roles: ['student'] },
      { classId: CLASS_ID, mode: 'all', page: 1, limit: 2 },
    );

    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      'review-session',
      'b-thread',
    ]);
    expect(result.counts).toEqual({ all: 3, ask: 2, review: 1 });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNext: true,
      hasPrevious: false,
    });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        mode: 'review',
        title: 'Assessment Replay',
        subtitle: 'COMPLETED - 4/5',
        activityAt: '2026-08-29T11:00:00.000Z',
      }),
    );
  });

  it('applies a mode filter before pagination', async () => {
    countResults.push([{ total: 3 }], [{ total: 4 }]);
    mockDb.query.jaThreads.findMany.mockResolvedValue([]);
    mockDb.query.jaSessions.findMany.mockResolvedValue([
      {
        id: 'review-page-two',
        classId: CLASS_ID,
        status: 'active',
        currentIndex: 1,
        questionCount: 5,
        startedAt: new Date('2026-08-20T08:00:00.000Z'),
        completedAt: null,
        updatedAt: new Date('2026-08-20T09:00:00.000Z'),
      },
    ]);

    const result = await service.getActivityHistory(
      { id: STUDENT_ID, email: 'student@example.com', roles: ['student'] },
      { classId: CLASS_ID, mode: 'review', page: 2, limit: 3 },
    );

    expect(mockDb.query.jaThreads.findMany).not.toHaveBeenCalled();
    expect(result.pagination).toEqual(
      expect.objectContaining({ page: 2, total: 4, hasPrevious: true, hasNext: false }),
    );
  });

  it('rejects activity history for an inaccessible class', async () => {
    mockDb.query.enrollments.findFirst.mockResolvedValue(null);

    await expect(
      service.getActivityHistory(
        { id: STUDENT_ID, email: 'student@example.com', roles: ['student'] },
        { classId: CLASS_ID },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uses stable mode and id tie-breakers for equal activity times', async () => {
    countResults.push([{ total: 2 }], [{ total: 1 }]);
    const activityAt = new Date('2026-08-29T10:00:00.000Z');
    mockDb.query.jaThreads.findMany.mockResolvedValue([
      {
        id: 'b-thread',
        classId: CLASS_ID,
        title: 'B',
        status: 'active',
        lastMessageAt: activityAt,
        updatedAt: activityAt,
      },
      {
        id: 'a-thread',
        classId: CLASS_ID,
        title: 'A',
        status: 'active',
        lastMessageAt: activityAt,
        updatedAt: activityAt,
      },
    ]);
    mockDb.query.jaSessions.findMany.mockResolvedValue([
      {
        id: 'review-session',
        classId: CLASS_ID,
        status: 'completed',
        currentIndex: 5,
        questionCount: 5,
        startedAt: activityAt,
        completedAt: activityAt,
        updatedAt: activityAt,
      },
    ]);

    const result = await service.getActivityHistory(
      { id: STUDENT_ID, email: 'student@example.com', roles: ['student'] },
      { classId: CLASS_ID },
    );

    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      'a-thread',
      'b-thread',
      'review-session',
    ]);
    expect(result.pagination).toEqual(
      expect.objectContaining({ page: 1, limit: 8, totalPages: 1 }),
    );
  });

  it('returns newest Ask messages with a cursor for earlier messages', async () => {
    mockDb.query.jaThreads.findFirst.mockResolvedValue({
      id: THREAD_ID,
      classId: CLASS_ID,
      title: 'Thread',
      status: 'active',
      updatedAt: new Date('2026-08-29T12:00:00.000Z'),
    });
    mockDb.query.jaThreadMessages.findFirst.mockResolvedValue({
      content:
        'LESSON_CONTEXT::{"lessonId":"lesson-1","title":"Fractions"}',
    });
    mockDb.query.jaThreadMessages.findMany.mockResolvedValue([
      {
        id: 'message-3',
        role: 'assistant',
        content: 'Newest',
        citationsJson: null,
        quickAction: null,
        blocked: false,
        createdAt: new Date('2026-08-29T12:03:00.000Z'),
      },
      {
        id: 'message-2',
        role: 'student',
        content: 'Second',
        citationsJson: null,
        quickAction: 'summary',
        blocked: false,
        createdAt: new Date('2026-08-29T12:02:00.000Z'),
      },
      {
        id: 'message-1',
        role: 'assistant',
        content: 'Older',
        citationsJson: null,
        quickAction: null,
        blocked: false,
        createdAt: new Date('2026-08-29T12:01:00.000Z'),
      },
    ]);

    const result = await service.getAskThread(
      { id: STUDENT_ID, email: 'student@example.com', roles: ['student'] },
      THREAD_ID,
      { limit: 2 },
    );

    expect(result.messages.map((message: { id: string }) => message.id)).toEqual([
      'message-2',
      'message-3',
    ]);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.pageInfo.nextCursor).toEqual(expect.any(String));
    expect(result.thread.contextLessonTitle).toBe('Fractions');
    expect(mockDb.query.jaThreadMessages.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 }),
    );
  });

  it('rejects an invalid Ask message cursor', async () => {
    mockDb.query.jaThreads.findFirst.mockResolvedValue({
      id: THREAD_ID,
      classId: CLASS_ID,
      title: 'Thread',
      status: 'active',
      updatedAt: new Date('2026-08-29T12:00:00.000Z'),
    });

    await expect(
      service.getAskThread(
        { id: STUDENT_ID, email: 'student@example.com', roles: ['student'] },
        THREAD_ID,
        { before: 'not-a-valid-cursor' },
      ),
    ).rejects.toThrow('Invalid JA message cursor.');
  });
});

import { DiscussionBoardProcessor } from './discussion-board.processor';

describe('DiscussionBoardProcessor', () => {
  const mockDb = {
    query: {
      enrollments: {
        findMany: jest.fn(),
      },
    },
  };
  const mockNotificationsService = {
    createBulkDeduped: jest.fn(),
  };
  const mockNotificationsGateway = {
    emitToUser: jest.fn(),
  };

  const processor = new DiscussionBoardProcessor(
    { db: mockDb } as any,
    mockNotificationsService as any,
    mockNotificationsGateway as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unsupported queue contracts without side effects', async () => {
    await expect(
      processor.process({ name: 'unknown-job', data: {} } as any),
    ).rejects.toThrow('Unsupported discussion-board job: unknown-job');
    expect(mockDb.query.enrollments.findMany).not.toHaveBeenCalled();
  });

  it('fans out published-thread notifications to enrolled students', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ]);
    mockNotificationsService.createBulkDeduped.mockResolvedValue([
      {
        userId: 'student-1',
        type: 'discussion_thread_posted',
        title: 'Open Forum',
        body: 'Please discuss chapter 4.',
        referenceId: 'thread-1',
      },
      {
        userId: 'student-2',
        type: 'discussion_thread_posted',
        title: 'Open Forum',
        body: 'Please discuss chapter 4.',
        referenceId: 'thread-1',
      },
    ]);

    await processor.process({
      name: 'thread-published',
      data: {
        classId: 'class-1',
        threadId: 'thread-1',
        title: 'Open Forum',
        bodyHtml: '<p>Please discuss chapter 4.</p>',
      },
    } as any);

    expect(mockNotificationsService.createBulkDeduped).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'student-1',
        type: 'discussion_thread_posted',
        referenceId: 'thread-1',
      }),
      expect.objectContaining({
        userId: 'student-2',
        type: 'discussion_thread_posted',
        referenceId: 'thread-1',
      }),
    ]);
    expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledTimes(2);
  });

  it('skips teacher notification when commenter is the teacher', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ]);
    mockNotificationsService.createBulkDeduped.mockResolvedValue([
      {
        userId: 'student-1',
        type: 'discussion_comment_posted',
        title: 'New replies in "Open Forum"',
        body: 'A new comment was posted in this discussion thread.',
        referenceId: 'thread-1',
      },
      {
        userId: 'student-2',
        type: 'discussion_comment_posted',
        title: 'New replies in "Open Forum"',
        body: 'A new comment was posted in this discussion thread.',
        referenceId: 'thread-1',
      },
    ]);

    await processor.process({
      name: 'comment-created',
      data: {
        classId: 'class-1',
        threadId: 'thread-1',
        commentId: 'comment-1',
        threadTitle: 'Open Forum',
        commenterId: 'teacher-1',
        classTeacherId: 'teacher-1',
      },
    } as any);

    expect(mockNotificationsService.createBulkDeduped).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'student-1',
        type: 'discussion_comment_posted',
        referenceId: 'thread-1',
      }),
      expect.objectContaining({
        userId: 'student-2',
        type: 'discussion_comment_posted',
        referenceId: 'thread-1',
      }),
    ]);
    expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledTimes(2);
  });

  it('notifies teacher and classmates when a student comments', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
      { studentId: 'student-3' },
    ]);
    mockNotificationsService.createBulkDeduped.mockResolvedValue([
      {
        userId: 'teacher-1',
        type: 'discussion_comment_posted',
        title: 'New replies in "Open Forum"',
        body: 'A student posted a new comment in your discussion thread.',
        referenceId: 'thread-1',
      },
      {
        userId: 'student-2',
        type: 'discussion_comment_posted',
        title: 'New replies in "Open Forum"',
        body: 'A new comment was posted in this discussion thread.',
        referenceId: 'thread-1',
      },
      {
        userId: 'student-3',
        type: 'discussion_comment_posted',
        title: 'New replies in "Open Forum"',
        body: 'A new comment was posted in this discussion thread.',
        referenceId: 'thread-1',
      },
    ]);

    await processor.process({
      name: 'comment-created',
      data: {
        classId: 'class-1',
        threadId: 'thread-1',
        commentId: 'comment-1',
        threadTitle: 'Open Forum',
        commenterId: 'student-1',
        classTeacherId: 'teacher-1',
      },
    } as any);

    expect(mockNotificationsService.createBulkDeduped).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'teacher-1',
        type: 'discussion_comment_posted',
        referenceId: 'thread-1',
      }),
      expect.objectContaining({
        userId: 'student-2',
        type: 'discussion_comment_posted',
        referenceId: 'thread-1',
      }),
      expect.objectContaining({
        userId: 'student-3',
        type: 'discussion_comment_posted',
        referenceId: 'thread-1',
      }),
    ]);
    expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledTimes(3);
  });
});

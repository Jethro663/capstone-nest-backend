import { discussionBoardService } from '@/services/discussion-board-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('discussionBoardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls list endpoint with pagination params', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, message: 'ok', data: { items: [], page: 1, limit: 20, total: 0 } },
    });

    await discussionBoardService.listThreads('class-1', { page: 2, limit: 10 });

    expect(mockedApi.get).toHaveBeenCalledWith('/classes/class-1/discussion-threads', {
      params: { page: 2, limit: 10 },
    });
  });

  it('posts create-comment payload to the correct route', async () => {
    mockedApi.post.mockResolvedValue({
      data: { success: true, message: 'created', data: { id: 'comment-1' } },
    });

    await discussionBoardService.createComment('class-1', 'thread-1', {
      bodyHtml: '<p>Hello</p>',
      attachmentFileIds: ['file-1'],
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/classes/class-1/discussion-threads/thread-1/comments',
      {
        bodyHtml: '<p>Hello</p>',
        attachmentFileIds: ['file-1'],
      },
    );
  });

  it('posts moderation report payload to the correct comment route', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        message: 'reported',
        data: {
          commentId: 'comment-1',
          reportedAt: '2026-05-04T10:00:00.000Z',
          reasonCode: 'inappropriate',
        },
      },
    });

    await discussionBoardService.reportComment('class-1', 'thread-1', 'comment-1', {
      reasonCode: 'inappropriate',
      notes: 'Personal attack toward a classmate.',
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/classes/class-1/discussion-threads/thread-1/comments/comment-1/report',
      {
        reasonCode: 'inappropriate',
        notes: 'Personal attack toward a classmate.',
      },
    );
  });

  it('posts multipart form-data for thread attachment uploads', async () => {
    mockedApi.post.mockResolvedValue({
      data: { success: true, message: 'uploaded', data: { id: 'file-1' } },
    });

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    await discussionBoardService.uploadThreadAttachment('class-1', file);

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/classes/class-1/discussion-threads/uploads',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  });

  it('resolves inline preview URL from the thread attachment list', () => {
    const result = discussionBoardService.previewUrl(
      {
        id: 'thread-1',
        classId: 'class-1',
        authorId: 'teacher-1',
        title: 'Thread',
        bodyHtml: '<p>Body</p>',
        themeId: 'classic',
        commentLimitPerStudent: 1,
        allowComments: true,
        isPinned: false,
        status: 'published',
        publishedAt: null,
        closedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        commentCount: 0,
        attachments: [
          {
            id: 'attachment-1',
            type: 'image',
            fileId: 'file-1',
            originalName: 'diagram.png',
            mimeType: 'image/png',
            sizeBytes: 20,
            inlineUrl: '/api/classes/class-1/discussion-threads/thread-1/attachments/attachment-1/inline',
            downloadUrl: '/api/classes/class-1/discussion-threads/thread-1/attachments/attachment-1/download',
          },
        ],
      },
      'attachment-1',
    );

    expect(result).toBe(
      '/api/classes/class-1/discussion-threads/thread-1/attachments/attachment-1/inline',
    );
  });
});

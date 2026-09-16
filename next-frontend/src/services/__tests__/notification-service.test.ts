import { notificationService } from '@/services/notification-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes backend body into the frontend message field', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: [
          {
            id: 'notification-1',
            userId: 'student-1',
            type: 'assessment_assigned',
            title: 'New assessment',
            body: 'Algebra Quiz is ready.',
            referenceId: 'assessment-1',
            isRead: false,
            createdAt: '2026-06-17T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });

    const result = await notificationService.getAll();

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        message: 'Algebra Quiz is ready.',
        metadata: { referenceId: 'assessment-1' },
      }),
    );
  });

  it('deletes one current-user notification by its persisted row id', async () => {
    mockedApi.delete.mockResolvedValue({
      data: {
        success: true,
        message: 'Notification deleted.',
        data: { dismissedCount: 1 },
      },
    });

    const result = await notificationService.dismissOne('notification-1');

    expect(mockedApi.delete).toHaveBeenCalledWith('/notifications/notification-1');
    expect(result.data.dismissedCount).toBe(1);
  });

  it('clears only the current user notification inbox', async () => {
    mockedApi.delete.mockResolvedValue({
      data: {
        success: true,
        message: 'Notifications cleared.',
        data: { dismissedCount: 4 },
      },
    });

    const result = await notificationService.dismissAll();

    expect(mockedApi.delete).toHaveBeenCalledWith('/notifications');
    expect(result.data.dismissedCount).toBe(4);
  });
});

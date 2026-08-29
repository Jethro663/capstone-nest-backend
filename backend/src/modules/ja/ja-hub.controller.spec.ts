import { JaHubController } from './ja-hub.controller';

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'student@example.com',
  roles: ['student'],
};

type PaginationController = JaHubController & {
  activityHistory: (query: any, currentUser: typeof user) => Promise<any>;
  getAskThread: (
    threadId: string,
    query: any,
    currentUser: typeof user,
  ) => Promise<any>;
};

describe('JaHubController pagination', () => {
  it('delegates activity history and preserves the response envelope', async () => {
    const data = {
      items: [],
      counts: { all: 0, ask: 0, review: 0 },
      pagination: {
        page: 1,
        limit: 8,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    };
    const jaService = {
      getActivityHistory: jest.fn().mockResolvedValue(data),
    };
    const controller = new JaHubController(
      jaService as any,
    ) as PaginationController;
    const query = {
      classId: '550e8400-e29b-41d4-a716-446655440001',
      mode: 'all',
      page: 1,
      limit: 8,
    };

    expect(typeof controller.activityHistory).toBe('function');
    await expect(controller.activityHistory(query, user)).resolves.toEqual({
      success: true,
      message: 'JA activity history loaded',
      data,
    });
    expect(jaService.getActivityHistory).toHaveBeenCalledWith(user, query);
  });

  it('forwards message pagination query to the service', async () => {
    const data = {
      thread: { id: '550e8400-e29b-41d4-a716-446655440002' },
      messages: [],
      pageInfo: { hasMore: false, nextCursor: null },
    };
    const jaService = {
      getAskThread: jest.fn().mockResolvedValue(data),
    };
    const controller = new JaHubController(
      jaService as any,
    ) as PaginationController;
    const query = { limit: 20, before: 'cursor' };

    await expect(
      controller.getAskThread(data.thread.id, query, user),
    ).resolves.toEqual({
      success: true,
      message: 'JA Ask thread loaded',
      data,
    });
    expect(jaService.getAskThread).toHaveBeenCalledWith(
      user,
      data.thread.id,
      query,
    );
  });
});

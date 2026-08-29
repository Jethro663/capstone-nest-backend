import { api } from '@/lib/api-client';
import { jaService } from './ja-service';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('jaService pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it('requests a server-owned activity history page', async () => {
    const params = {
      classId: 'class-1',
      mode: 'review' as const,
      page: 2,
      limit: 8,
    };

    await jaService.getActivityHistory(params);

    expect(mockedApi.get).toHaveBeenCalledWith('/ai/student/ja/history', {
      params,
    });
  });

  it('forwards an Ask message cursor without changing the thread route', async () => {
    const params = { limit: 20, before: 'older-cursor' };

    await jaService.getAskThread('thread-1', params);

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/ai/student/ja/ask/threads/thread-1',
      { params },
    );
  });
});

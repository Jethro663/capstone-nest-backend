import { api } from '@/lib/api-client';
import { lessonService } from './lesson-service';

jest.mock('@/lib/api-client', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('lessonService version safety', () => {
  beforeEach(() => jest.resetAllMocks());

  it('inspects the version and sends its expected lesson timestamp on restore', async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: { id: 'v1' } } });
    mockedApi.post.mockResolvedValue({ data: { success: true, data: { id: 'lesson-1' } } });

    await lessonService.getVersionDetail('lesson-1', 'v1');
    await lessonService.restoreVersion('lesson-1', 'v1', {
      expectedLessonUpdatedAt: '2026-09-18T10:00:00.000Z',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/lessons/lesson-1/versions/v1');
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/lessons/lesson-1/versions/v1/restore',
      { expectedLessonUpdatedAt: '2026-09-18T10:00:00.000Z' },
    );
  });
});

import { getLessonPreview } from './preview-api';

describe('getLessonPreview', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses the scoped public endpoint without forwarding account credentials', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'lesson-1', title: 'Energy', contentBlocks: [] } }),
    }) as jest.Mock;

    await expect(getLessonPreview('scoped-token', 'https://backend.test')).resolves.toMatchObject({
      id: 'lesson-1',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://backend.test/api/lessons/preview/scoped-token',
      { cache: 'no-store' },
    );
  });

  it('returns a neutral error instead of fabricated lesson data', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as jest.Mock;
    await expect(getLessonPreview('expired', 'https://backend.test')).rejects.toThrow(
      'Lesson preview is unavailable or expired',
    );
  });
});

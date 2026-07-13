import axios from 'axios';
import { refreshSessionAccessToken } from './session-refresh';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('refreshSessionAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shares single-flight promise across parallel calls', async () => {
    let resolvePost: any;
    const promise = new Promise((resolve) => {
      resolvePost = resolve;
    });
    mockedAxios.post.mockReturnValueOnce(promise as any);

    const call1 = refreshSessionAccessToken();
    const call2 = refreshSessionAccessToken();
    const call3 = refreshSessionAccessToken();

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    resolvePost({ data: { data: { accessToken: 'new-token-123' } } });

    const [res1, res2, res3] = await Promise.all([call1, call2, call3]);
    expect(res1).toBe('new-token-123');
    expect(res2).toBe('new-token-123');
    expect(res3).toBe('new-token-123');
  });

  it('returns null immediately on 401/403 without retrying', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 401 },
    });

    const result = await refreshSessionAccessToken();
    expect(result).toBeNull();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('retries once after transient network error and returns token on success', async () => {
    mockedAxios.post
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({
        data: { accessToken: 'recovered-token-456' },
      });

    const result = await refreshSessionAccessToken();
    expect(result).toBe('recovered-token-456');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });
});

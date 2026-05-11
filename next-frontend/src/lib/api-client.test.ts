const refreshSessionAccessTokenMock = jest.fn();
const toastErrorMock = jest.fn();

let responseRejected:
  | ((error: {
      config?: Record<string, unknown>;
      response?: { status?: number; data?: Record<string, unknown> };
    }) => Promise<unknown>)
  | null = null;

const fakeApi = Object.assign(jest.fn(), {
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn((_fulfilled, rejected) => {
        responseRejected = rejected;
      }),
    },
  },
});

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => fakeApi),
  },
}));

jest.mock('./session-refresh', () => ({
  refreshSessionAccessToken: () => refreshSessionAccessTokenMock(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('api-client auth refresh handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    responseRejected = null;
    jest.resetModules();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears stale access token when the refresh request fails after a protected API 401', async () => {
    refreshSessionAccessTokenMock.mockRejectedValue(new Error('Invalid refresh token'));
    const { getAccessToken, setAccessToken } = await import('./api-client');
    setAccessToken('stale-access-token');

    await expect(
      responseRejected?.({
        config: { url: '/roster-import/section-id/pending', headers: {} },
        response: {
          status: 401,
          data: { statusCode: 401, message: 'Invalid or expired token' },
        },
      }),
    ).rejects.toThrow('Invalid refresh token');

    expect(getAccessToken()).toBeNull();
  });
});

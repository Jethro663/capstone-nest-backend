import { adminChatbotService } from '@/services/admin-chatbot-service';
import { api, getAccessToken, setAccessToken } from '@/lib/api-client';
import { refreshSessionAccessToken } from '@/lib/session-refresh';
import axios from 'axios';

const directAxiosPostMock = jest.fn();

jest.mock('axios', () => {
  const isAxiosError = (value: unknown) =>
    Boolean((value as { isAxiosError?: boolean } | null)?.isAxiosError);

  return {
    __esModule: true,
    default: {
      post: (...args: unknown[]) => directAxiosPostMock(...args),
      isAxiosError,
    },
    isAxiosError,
  };
});

jest.mock('@/lib/api-origin', () => ({
  getFrontendApiOrigin: () => 'http://127.0.0.1:3000',
}));

jest.mock('@/lib/session-refresh', () => ({
  refreshSessionAccessToken: jest.fn(),
}));

jest.mock('@/lib/api-client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
  getAccessToken: jest.fn(),
  setAccessToken: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedRefreshSessionAccessToken =
  refreshSessionAccessToken as jest.MockedFunction<typeof refreshSessionAccessToken>;
const mockedGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockedSetAccessToken = setAccessToken as jest.MockedFunction<typeof setAccessToken>;

describe('adminChatbotService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    directAxiosPostMock.mockReset();
  });

  it('normalizes proxied admin chat responses', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          reply: 'Current risk is concentrated in Grade 7 sections.',
          sessionId: 'session-1',
          sources: [],
        },
      },
    });

    const result = await adminChatbotService.sendMessage({
      message: 'Give me a class-by-class risk snapshot.',
      sessionId: null,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/ai/admin/chat', {
      message: 'Give me a class-by-class risk snapshot.',
      sessionId: null,
    });
    expect(result).toMatchObject({
      reply: 'Current risk is concentrated in Grade 7 sections.',
      sessionId: 'session-1',
      sources: [],
    });
  });

  it('falls back to a direct backend request when the frontend proxy rejects the admin chat POST', async () => {
    mockedApi.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500 },
    });
    mockedGetAccessToken.mockReturnValue(null);
    mockedRefreshSessionAccessToken.mockResolvedValue('fresh-admin-token');
    directAxiosPostMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          reply: 'Direct backend fallback succeeded.',
          sessionId: 'session-2',
          chart: null,
          sources: [
            {
              source: 'student-performance-report',
              filters: { limit: 12 },
              window: 'latest snapshot',
            },
          ],
        },
      },
    });

    const result = await adminChatbotService.sendMessage({
      message: 'Show me usage trends for this week.',
      sessionId: null,
    });

    expect(mockedRefreshSessionAccessToken).toHaveBeenCalledTimes(1);
    expect(mockedSetAccessToken).toHaveBeenCalledWith('fresh-admin-token');
    expect(directAxiosPostMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/api/ai/admin/chat',
      {
        message: 'Show me usage trends for this week.',
        sessionId: null,
      },
      expect.objectContaining({
        withCredentials: true,
        timeout: 70000,
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-admin-token',
        }),
      }),
    );
    expect(result).toMatchObject({
      reply: 'Direct backend fallback succeeded.',
      sessionId: 'session-2',
      sources: [
        expect.objectContaining({
          source: 'student-performance-report',
        }),
      ],
    });
  });
});

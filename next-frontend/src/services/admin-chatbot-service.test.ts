import { adminChatbotService } from '@/services/admin-chatbot-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  getAccessToken: jest.fn(),
  setAccessToken: jest.fn(),
}));

jest.mock('@/lib/session-refresh', () => ({
  refreshSessionAccessToken: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('adminChatbotService.getHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats cloud runtime availability as online even when Ollama is unavailable', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          runtimeAvailable: true,
          runtimeProvider: 'openrouter',
          runtimeMode: 'cloud',
          ollamaAvailable: false,
          configuredModel: 'google/gemma-4-26b-a4b-it',
          cloudAvailable: true,
        },
      },
    });

    await expect(adminChatbotService.getHealth()).resolves.toEqual({
      online: true,
      model: 'google/gemma-4-26b-a4b-it',
    });
  });
});

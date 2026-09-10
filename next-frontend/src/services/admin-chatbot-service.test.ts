import { adminChatbotService } from '@/services/admin-chatbot-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
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

describe('adminChatbotService.sendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes scoped evidence, table data, follow-ups, and a safe action', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          reply: 'Two learner records need review.',
          sessionId: '11111111-1111-1111-1111-111111111111',
          chart: null,
          sources: [
            {
              source: 'student-performance-report',
              label: 'Student performance report',
              filters: { gradingPeriod: 'Q3' },
              window: '2026-09-11T00:00:00.000Z',
              recordCount: 2,
              total: 8,
              truncated: true,
              href: '/dashboard/admin/reports',
            },
          ],
          dataView: {
            title: 'At-risk learners',
            columns: ['Class', 'Learners'],
            rows: [['MATH-7', '2']],
            total: 8,
            truncated: true,
          },
          suggestedPrompts: ['Compare with the last 30 days'],
          action: {
            kind: 'navigate',
            target: 'reports',
            label: 'Open reports',
            description: 'Review the matching records.',
            href: '/dashboard/admin/reports',
            draft: null,
          },
          scope: {
            timeRange: 'current_period',
            schoolYear: '2026-2027',
            gradingPeriod: 'Q3',
            periodLabel: 'Term 3',
          },
        },
      },
    });

    await expect(
      adminChatbotService.sendMessage({
        message: 'Show at-risk learners',
        scope: { timeRange: 'current_period' },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        dataView: {
          title: 'At-risk learners',
          columns: ['Class', 'Learners'],
          rows: [['MATH-7', '2']],
          total: 8,
          truncated: true,
        },
        suggestedPrompts: ['Compare with the last 30 days'],
        action: expect.objectContaining({
          target: 'reports',
          href: '/dashboard/admin/reports',
        }),
        scope: expect.objectContaining({ periodLabel: 'Term 3' }),
        sources: [
          expect.objectContaining({
            label: 'Student performance report',
            recordCount: 2,
            total: 8,
            truncated: true,
            href: '/dashboard/admin/reports',
          }),
        ],
      }),
    );
  });

  it('drops malformed structured fields and external action links', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        data: {
          reply: 'A safe answer remains available.',
          sessionId: null,
          sources: [
            {
              source: 'audit-log',
              filters: {},
              href: 'https://example.com/unsafe',
            },
          ],
          dataView: {
            title: 'Broken table',
            columns: ['One', 'Two'],
            rows: [['only-one-cell']],
            truncated: false,
          },
          suggestedPrompts: ['Valid follow-up', 42, 'Valid follow-up'],
          action: {
            kind: 'navigate',
            target: 'audit',
            label: 'Unsafe link',
            description: 'Must not render an external URL.',
            href: 'https://example.com/unsafe',
          },
        },
      },
    });

    const result = await adminChatbotService.sendMessage({ message: 'Audit' });

    expect(result.dataView).toBeNull();
    expect(result.suggestedPrompts).toEqual(['Valid follow-up']);
    expect(result.action).toBeNull();
    expect(result.sources[0].href).toBeNull();
  });
});

describe('adminChatbotService conversation history mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renames an admin-owned conversation', async () => {
    mockedApi.patch.mockResolvedValue({
      data: {
        data: {
          sessionId: '11111111-1111-1111-1111-111111111111',
          title: 'Weekly operations',
        },
      },
    });

    await expect(
      adminChatbotService.renameSession(
        '11111111-1111-1111-1111-111111111111',
        'Weekly operations',
      ),
    ).resolves.toEqual({
      sessionId: '11111111-1111-1111-1111-111111111111',
      title: 'Weekly operations',
    });
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/ai/admin/sessions/11111111-1111-1111-1111-111111111111',
      { title: 'Weekly operations' },
    );
  });

  it('deletes an admin-owned conversation', async () => {
    mockedApi.delete.mockResolvedValue({
      data: {
        data: {
          sessionId: '11111111-1111-1111-1111-111111111111',
          deleted: true,
        },
      },
    });

    await expect(
      adminChatbotService.deleteSession(
        '11111111-1111-1111-1111-111111111111',
      ),
    ).resolves.toEqual({
      sessionId: '11111111-1111-1111-1111-111111111111',
      deleted: true,
    });
  });
});

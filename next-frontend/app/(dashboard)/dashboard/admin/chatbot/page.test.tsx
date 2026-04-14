'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminChatbotPage from './page';
import { adminChatbotService } from '@/services/admin-chatbot-service';

jest.mock('@/services/admin-chatbot-service', () => ({
  adminChatbotService: {
    getHealth: jest.fn(),
    getHistory: jest.fn(),
    getSession: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      firstName: 'System',
      lastName: 'Admin',
      roles: ['admin'],
    },
    loading: false,
  }),
}));

jest.mock('@/components/admin/AdminPageShell', () => ({
  AdminPageShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const mockedAdminChatbotService =
  adminChatbotService as jest.Mocked<typeof adminChatbotService>;

describe('AdminChatbotPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdminChatbotService.getHealth.mockResolvedValue({
      online: true,
      model: 'llama3.2',
    });
    mockedAdminChatbotService.getHistory.mockResolvedValue([
      {
        sessionId: 'session-1',
        title: 'At-risk trends',
        preview: '2 students are currently flagged as at risk.',
        updatedAt: '2026-04-13T00:00:00.000Z',
      },
    ]);
    mockedAdminChatbotService.getSession.mockResolvedValue({
      sessionId: 'session-1',
      title: 'At-risk trends',
      updatedAt: '2026-04-13T00:00:00.000Z',
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: '2 students are currently flagged as at risk.',
          createdAt: '2026-04-13T00:00:00.000Z',
          chart: {
            type: 'bar',
            title: 'At-risk students by class',
            labels: ['MATH-7', 'SCI-7'],
            series: [{ name: 'At-risk students', data: [2, 1] }],
          },
          sources: [
            {
              source: 'student-performance-report',
              filters: { window: 'latest' },
              window: 'latest snapshot',
            },
          ],
        },
      ],
    });
    mockedAdminChatbotService.sendMessage.mockResolvedValue({
      reply: 'Assessment submissions increased by 18%.',
      sessionId: 'session-2',
      chart: {
        type: 'line',
        title: 'Assessment submission trend',
        labels: ['Mon', 'Tue', 'Wed'],
        series: [{ name: 'Submissions', data: [4, 6, 9] }],
      },
      sources: [
        {
          source: 'system-usage-report',
          filters: { window: 'last_7_days' },
          window: 'last 7 days',
        },
      ],
    });
  });

  it('loads persisted history and renders session metadata when a history item is opened', async () => {
    render(<AdminChatbotPage />);

    expect(
      await screen.findByRole('heading', { name: 'Recent conversations' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('At-risk trends')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /At-risk trends/i }));

    await waitFor(() =>
      expect(mockedAdminChatbotService.getSession).toHaveBeenCalledWith('session-1'),
    );

    expect(
      (await screen.findAllByText('2 students are currently flagged as at risk.')).length,
    ).toBeGreaterThan(0);
    expect(await screen.findByText('At-risk students by class')).toBeInTheDocument();
    expect(await screen.findByText(/student-performance-report/i)).toBeInTheDocument();
    expect(await screen.findByText(/latest snapshot/i)).toBeInTheDocument();
  });

  it('sends admin chat messages through the dedicated service and renders inline charts and sources', async () => {
    render(<AdminChatbotPage />);

    expect(await screen.findByText('Admin-only analytics workspace')).toBeInTheDocument();
    const input = await screen.findByPlaceholderText(
      'Ask about reports, evaluations, audit events, or usage trends...',
    );
    fireEvent.change(input, {
      target: { value: 'Show me usage trends for this week.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(mockedAdminChatbotService.sendMessage).toHaveBeenCalledWith({
        message: 'Show me usage trends for this week.',
        sessionId: null,
      }),
    );

    expect(
      await screen.findByText('Assessment submissions increased by 18%.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Assessment submission trend'),
    ).toBeInTheDocument();
    expect(await screen.findByText(/system-usage-report/i)).toBeInTheDocument();
    expect(await screen.findByText(/last 7 days/i)).toBeInTheDocument();
  });
});

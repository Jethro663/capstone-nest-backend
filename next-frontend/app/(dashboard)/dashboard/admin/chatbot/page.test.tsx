'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminChatbotPage from './page';
import { adminChatbotService } from '@/services/admin-chatbot-service';

jest.mock('@/services/admin-chatbot-service', () => ({
  adminChatbotService: {
    getHealth: jest.fn(),
    getHistory: jest.fn(),
    getSession: jest.fn(),
    renameSession: jest.fn(),
    deleteSession: jest.fn(),
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

const responseMetadata = {
  chart: null,
  dataView: {
    title: 'At-risk learners',
    columns: ['Class', 'Learners'],
    rows: [['MATH-7', '2']],
    total: 8,
    truncated: true,
  },
  sources: [
    {
      source: 'student-performance-report',
      label: 'Student performance report',
      filters: { gradingPeriod: 'Q3' },
      window: '2026-09-11T03:15:00.000Z',
      recordCount: 2,
      total: 8,
      truncated: true,
      href: '/dashboard/admin/reports',
    },
  ],
  suggestedPrompts: ['Compare with the last 30 days'],
  action: {
    kind: 'navigate' as const,
    target: 'reports' as const,
    label: 'Open reports',
    description: 'Review the matching records.',
    href: '/dashboard/admin/reports',
    draft: null,
  },
  scope: {
    timeRange: 'current_period' as const,
    schoolYear: '2026-2027',
    gradingPeriod: 'Q3' as const,
    periodLabel: 'Quarter 3',
  },
};

describe('AdminChatbotPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdminChatbotService.getHealth.mockResolvedValue({
      online: true,
      model: 'llama3.2',
    });
    mockedAdminChatbotService.getHistory.mockResolvedValue([
      {
        sessionId: '11111111-1111-1111-1111-111111111111',
        title: 'At-risk trends',
        preview: '2 students are currently flagged as at risk.',
        updatedAt: '2026-09-11T00:00:00.000Z',
      },
    ]);
    mockedAdminChatbotService.getSession.mockResolvedValue({
      sessionId: '11111111-1111-1111-1111-111111111111',
      title: 'At-risk trends',
      updatedAt: '2026-09-11T00:00:00.000Z',
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: '2 students are currently flagged as at risk.',
          createdAt: '2026-09-11T00:00:00.000Z',
          ...responseMetadata,
        },
      ],
    });
    mockedAdminChatbotService.renameSession.mockResolvedValue({
      sessionId: '11111111-1111-1111-1111-111111111111',
      title: 'Weekly risk review',
    });
    mockedAdminChatbotService.deleteSession.mockResolvedValue({
      sessionId: '11111111-1111-1111-1111-111111111111',
      deleted: true,
    });
    mockedAdminChatbotService.sendMessage.mockResolvedValue({
      reply: 'Two learner records need review.',
      sessionId: '22222222-2222-2222-2222-222222222222',
      ...responseMetadata,
    });
  });

  it('starts with a simple task-based welcome and searchable conversation history', async () => {
    render(<AdminChatbotPage />);

    expect(
      await screen.findByRole('heading', {
        name: /What can I help you understand, System/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Investigate a problem/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Find records/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search conversations')).toBeInTheDocument();
    expect(await screen.findByText('At-risk trends')).toBeInTheDocument();
  });

  it('loads a saved conversation with structured evidence and actions', async () => {
    render(<AdminChatbotPage />);

    const historyTitle = await screen.findByText('At-risk trends');
    fireEvent.click(historyTitle.closest('button')!);

    await waitFor(() =>
      expect(mockedAdminChatbotService.getSession).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
      ),
    );

    expect(
      (await screen.findAllByText('2 students are currently flagged as at risk.'))
        .length,
    ).toBeGreaterThan(1);
    expect(screen.getByRole('table', { name: 'At-risk learners' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open reports' })).toHaveAttribute(
      'href',
      '/dashboard/admin/reports',
    );
    expect(screen.getByText('Evidence and scope')).toBeInTheDocument();
  });

  it('sends a scoped request and renders useful structured output', async () => {
    render(<AdminChatbotPage />);

    await screen.findByText('At-risk trends');
    const input = await screen.findByPlaceholderText(
      'Ask about people, classes, activity, records, or problems...',
    );
    fireEvent.change(input, {
      target: { value: 'Show learners who need attention.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(mockedAdminChatbotService.sendMessage).toHaveBeenCalledWith({
        message: 'Show learners who need attention.',
        sessionId: null,
        scope: { timeRange: 'current_period' },
      }),
    );

    expect(
      (await screen.findAllByText('Two learner records need review.')).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/showing 1 of 8/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Compare with the last 30 days' }),
    ).toBeInTheDocument();
  });

  it('shows one clear outage banner and leaves history unloaded', async () => {
    mockedAdminChatbotService.getHealth.mockResolvedValueOnce({
      online: false,
      model: 'offline',
    });

    render(<AdminChatbotPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Admin Assistant is temporarily unavailable',
    );
    expect(mockedAdminChatbotService.getHistory).not.toHaveBeenCalled();
    expect(screen.getAllByText(/temporarily unavailable/i)).toHaveLength(1);
  });
});

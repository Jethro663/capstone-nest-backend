import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Page from './page';
import { adminService } from '@/services/admin-service';

jest.mock('@/services/admin-service', () => ({
  adminService: {
    getHealthLive: jest.fn(),
    getHealthReadiness: jest.fn(),
    getWorkflowDiagnostics: jest.fn(),
  },
}));

const workflow = {
  observedAt: '2026-09-29T03:00:00.000Z',
  healthy: false,
  staleAfterSeconds: 900,
  totals: [
    { status: 'pending', count: 2, oldestAgeSeconds: 1200 },
    { status: 'processing', count: 1, oldestAgeSeconds: 60 },
    { status: 'completed', count: 7, oldestAgeSeconds: null },
    { status: 'approved', count: 4, oldestAgeSeconds: null },
    { status: 'cancelled', count: 0, oldestAgeSeconds: null },
    { status: 'rejected', count: 0, oldestAgeSeconds: null },
    { status: 'failed', count: 1, oldestAgeSeconds: null },
  ],
  alerts: [
    {
      code: 'oldest_nonterminal_exceeded',
      severity: 'warning',
      message: 'Oldest nonterminal workflow is 1200 seconds old.',
    },
  ],
};

describe('Admin diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (adminService.getHealthLive as jest.Mock).mockResolvedValue({
      status: 'ok',
      timestamp: '2026-09-29T03:00:00.000Z',
    });
    (adminService.getHealthReadiness as jest.Mock).mockResolvedValue({
      success: true,
      message: 'ready',
      data: {
        ready: true,
        timestamp: '2026-09-29T03:00:00.000Z',
        dependencies: {
          database: { ok: true, message: 'Database connected' },
          redis: { ok: true, message: 'Redis connected' },
          aiService: { ok: true, message: 'AI service connected' },
        },
      },
    });
    (adminService.getWorkflowDiagnostics as jest.Mock).mockResolvedValue(
      workflow,
    );
  });

  it('shows aggregate workflow counts, age, and alerts without row-level data', async () => {
    render(<Page />);

    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Workflow queues')).toBeInTheDocument();
    expect(screen.getByText('2 jobs')).toBeInTheDocument();
    expect(screen.getByText('Oldest: 20m')).toBeInTheDocument();
    expect(
      screen.getByText('Oldest nonterminal workflow is 1200 seconds old.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('200 ms')).not.toBeInTheDocument();
    expect(screen.queryByText('99.9% uptime')).not.toBeInTheDocument();
  });

  it('keeps dependency evidence visible when workflow diagnostics fail', async () => {
    (adminService.getWorkflowDiagnostics as jest.Mock).mockRejectedValue(
      new Error('Workflow diagnostics unavailable'),
    );

    render(<Page />);

    expect((await screen.findAllByText('Database connected')).length).toBeGreaterThan(0);
    expect(screen.getByText('Workflow diagnostics unavailable')).toBeInTheDocument();

    (adminService.getWorkflowDiagnostics as jest.Mock).mockResolvedValue(
      workflow,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(adminService.getWorkflowDiagnostics).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('2 jobs')).toBeInTheDocument();
  });
});

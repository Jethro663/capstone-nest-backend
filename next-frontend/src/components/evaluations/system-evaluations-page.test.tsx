import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SystemEvaluationsPage } from './system-evaluations-page';
import { lxpService } from '@/services/lxp-service';

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    getEvaluations: jest.fn(),
    getSystemEvaluationCampaigns: jest.fn(),
    createSystemEvaluationCampaign: jest.fn(),
  },
}));

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

describe('SystemEvaluationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLxpService.getEvaluations.mockResolvedValue({
      data: { count: 0, rows: [] },
    } as Awaited<ReturnType<typeof lxpService.getEvaluations>>);
    mockedLxpService.getSystemEvaluationCampaigns.mockResolvedValue({
      data: { campaigns: [], count: 0 },
    } as Awaited<ReturnType<typeof lxpService.getSystemEvaluationCampaigns>>);
    mockedLxpService.createSystemEvaluationCampaign.mockResolvedValue({
      data: { id: 'campaign-1', assignmentCount: 0 },
    } as Awaited<ReturnType<typeof lxpService.createSystemEvaluationCampaign>>);
  });

  it('creates active system evaluation campaigns from the admin page', async () => {
    render(
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review module and assessment feedback."
        variant="admin"
      />,
    );

    fireEvent.change(await screen.findByLabelText('Campaign title'), {
      target: { value: 'System Pulse' },
    });
    fireEvent.change(screen.getByLabelText('Starts at'), {
      target: { value: '2026-05-01T08:00' },
    });
    fireEvent.change(screen.getByLabelText('Ends at'), {
      target: { value: '2026-05-20T17:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Campaign' }));

    await waitFor(() =>
      expect(mockedLxpService.createSystemEvaluationCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          formType: 'system',
          audienceRole: 'student',
          title: 'System Pulse',
          status: 'active',
        }),
      ),
    );
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { TeacherEvaluationInsightsPage } from './TeacherEvaluationInsightsPage';
import { lxpService } from '@/services/lxp-service';

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    getMySystemEvaluations: jest.fn(),
    getTeacherEvaluationSummary: jest.fn(),
    submitAssignedSystemEvaluation: jest.fn(),
  },
}));

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

describe('TeacherEvaluationInsightsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLxpService.getMySystemEvaluations.mockResolvedValue({
      data: {
        pending: [
          {
            id: 'assignment-system',
            formType: 'system',
            targetModule: 'overall',
            title: 'Teacher System Pulse',
            description: 'Rate the system.',
            startsAt: '2026-05-01T00:00:00.000Z',
            endsAt: '2026-05-20T00:00:00.000Z',
            status: 'pending',
            questions: [],
          },
          {
            id: 'assignment-ja',
            formType: 'ja_hub',
            targetModule: 'ai_mentor',
            title: 'Teacher JA Hub Pulse',
            description: 'Should not render for teacher respondents.',
            startsAt: '2026-05-01T00:00:00.000Z',
            endsAt: '2026-05-20T00:00:00.000Z',
            status: 'pending',
            questions: [],
          },
        ],
        completed: [],
      },
    } as Awaited<ReturnType<typeof lxpService.getMySystemEvaluations>>);
    mockedLxpService.getTeacherEvaluationSummary.mockResolvedValue({
      data: {
        classes: [],
        periods: [],
        evaluationType: 'teacher_class',
        tabTitle: 'My Teaching',
        tabDescription: 'Anonymous teaching feedback',
        overview: {
          responseCount: 0,
          eligibleCount: 0,
          responseRate: 0,
          averageOverall: 0,
          latestSubmittedAt: null,
        },
        categoryAverages: [],
        comments: [],
        trends: [],
      },
    } as Awaited<ReturnType<typeof lxpService.getTeacherEvaluationSummary>>);
  });

  it('shows only assigned system forms for teacher respondents', async () => {
    render(<TeacherEvaluationInsightsPage />);

    expect(await screen.findByText('Forms To Answer')).toBeInTheDocument();
    expect(screen.getByText('Teacher System Pulse')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByText('Teacher JA Hub Pulse')).not.toBeInTheDocument(),
    );
  });
});

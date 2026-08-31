import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StudentTeacherEvaluationsPage } from './StudentTeacherEvaluationsPage';
import { lxpService } from '@/services/lxp-service';

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/services/lxp-service', () => ({
  lxpService: {
    getMySystemEvaluations: jest.fn(),
    submitAssignedSystemEvaluation: jest.fn(),
    getStudentTeacherEvaluationDashboard: jest.fn(),
    submitTeacherEvaluation: jest.fn(),
  },
}));

const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

describe('StudentTeacherEvaluationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLxpService.getMySystemEvaluations.mockResolvedValue({
      success: true,
      data: {
        pending: [
          {
            id: 'assignment-system',
            campaignId: 'campaign-1',
            audienceRole: 'student',
            classId: null,
            formType: 'system',
            targetModule: 'overall',
            title: 'System Pulse',
            description: 'Rate the LMS experience.',
            startsAt: '2026-05-01T00:00:00.000Z',
            endsAt: '2026-05-20T00:00:00.000Z',
            status: 'pending',
            questions: [
              {
                key: 'system_navigation',
                label:
                  'The system is easy to navigate and I can find what I need.',
              },
              {
                key: 'system_features',
                label: 'The features I use work correctly.',
              },
              {
                key: 'system_speed',
                label:
                  'Pages, submissions, and dashboards load fast enough during normal use.',
              },
              {
                key: 'system_efficiency',
                label:
                  'The system helps me complete school tasks more efficiently.',
              },
              {
                key: 'system_satisfaction',
                label:
                  'Overall, I am satisfied with my experience using the system.',
              },
            ],
          },
        ],
        completed: [],
      },
    } as Awaited<ReturnType<typeof lxpService.getMySystemEvaluations>>);
    mockedLxpService.getStudentTeacherEvaluationDashboard.mockResolvedValue({
      data: {
        currentAcademicState: { schoolYear: '2025-2026', quarter: 'Q2' },
        pending: [],
        completed: [],
      },
    } as Awaited<
      ReturnType<typeof lxpService.getStudentTeacherEvaluationDashboard>
    >);
    mockedLxpService.submitAssignedSystemEvaluation.mockResolvedValue({
      data: { id: 'evaluation-1' },
    } as Awaited<ReturnType<typeof lxpService.submitAssignedSystemEvaluation>>);
  });

  it('filters assigned forms without creating new forms and submits explicit zero-star answers', async () => {
    render(<StudentTeacherEvaluationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'System' }));
    fireEvent.click(screen.getByRole('button', { name: /System Pulse/i }));

    fireEvent.click(
      screen.getByRole('button', { name: /system_navigation 0 stars/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /system_features 5 stars/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /system_speed 5 stars/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /system_efficiency 5 stars/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /system_satisfaction 5 stars/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit Evaluation' }));

    await waitFor(() =>
      expect(
        mockedLxpService.submitAssignedSystemEvaluation,
      ).toHaveBeenCalledWith('assignment-system', {
        questionRatings: {
          system_navigation: 0,
          system_features: 5,
          system_speed: 5,
          system_efficiency: 5,
          system_satisfaction: 5,
        },
        feedback: undefined,
      }),
    );
    expect(mockedLxpService.getMySystemEvaluations).toHaveBeenCalledTimes(2);
  });
});

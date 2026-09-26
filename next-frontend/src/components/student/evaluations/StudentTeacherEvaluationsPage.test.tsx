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
    mockedLxpService.submitTeacherEvaluation.mockResolvedValue({
      data: { id: 'teacher-evaluation-1' },
    } as Awaited<ReturnType<typeof lxpService.submitTeacherEvaluation>>);
  });

  it('explains the zero-to-five scale and submits an explicit zero for a system evaluation', async () => {
    render(<StudentTeacherEvaluationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'System' }));
    fireEvent.click(screen.getByRole('button', { name: /System Pulse/i }));

    const submitButton = screen.getByRole('button', {
      name: 'Submit Evaluation',
    });
    expect(submitButton).toBeDisabled();

    const zeroRating = screen.getAllByRole('radio', {
      name: /0 stars, Not observed/i,
    })[0];
    expect(
      screen.getAllByRole('radio', { name: /5 stars, Excellent/i })[0],
    ).toBeVisible();
    fireEvent.mouseEnter(zeroRating);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'The behavior or result was not demonstrated.',
    );
    fireEvent.mouseLeave(zeroRating);
    fireEvent.focus(zeroRating);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'The behavior or result was not demonstrated.',
    );
    fireEvent.keyDown(zeroRating, { key: 'ArrowRight' });
    expect(
      screen.getAllByRole('radio', { name: /1 stars, Rarely/i })[0],
    ).toHaveAttribute('aria-checked', 'true');
    fireEvent.blur(zeroRating);
    fireEvent.click(
      zeroRating,
    );
    fireEvent.click(
      screen.getAllByRole('radio', { name: /5 stars, Excellent/i })[1],
    );
    fireEvent.click(
      screen.getAllByRole('radio', { name: /5 stars, Excellent/i })[2],
    );
    fireEvent.click(
      screen.getAllByRole('radio', { name: /5 stars, Excellent/i })[3],
    );
    fireEvent.click(
      screen.getAllByRole('radio', { name: /5 stars, Excellent/i })[4],
    );
    expect(screen.getByText('0 · Not observed')).toBeVisible();
    expect(screen.getByText('5 of 5 answered')).toBeVisible();
    fireEvent.click(submitButton);

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

  it('submits the same deliberate zero contract for a teacher evaluation', async () => {
    mockedLxpService.getStudentTeacherEvaluationDashboard.mockResolvedValue({
      data: {
        currentAcademicState: { schoolYear: '2025-2026', quarter: 'Q2' },
        pending: [
          {
            classId: 'class-1',
            gradingPeriod: 'Q2',
            schoolYear: '2025-2026',
            evaluationType: 'teacher_class',
            title: 'Teacher and Class Evaluation',
            description: 'Rate the teaching and learning experience.',
            class: {
              id: 'class-1',
              subjectName: 'Mathematics 7',
              subjectCode: 'MATH-7',
              section: { id: 'section-1', name: 'Bonifacio', gradeLevel: '7' },
            },
            questions: [
              { key: 'teaching_clarity', label: 'Lessons are explained clearly.' },
              { key: 'teacher_support', label: 'The teacher provides support.' },
            ],
          },
        ],
        completed: [],
      },
    } as Awaited<
      ReturnType<typeof lxpService.getStudentTeacherEvaluationDashboard>
    >);

    render(<StudentTeacherEvaluationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Teachers' }));
    fireEvent.click(screen.getByRole('button', { name: /MATH-7/i }));
    fireEvent.click(
      screen.getAllByRole('radio', { name: /0 stars, Not observed/i })[0],
    );
    fireEvent.click(
      screen.getAllByRole('radio', { name: /5 stars, Excellent/i })[1],
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit Evaluation' }));

    await waitFor(() =>
      expect(mockedLxpService.submitTeacherEvaluation).toHaveBeenCalledWith({
        classId: 'class-1',
        gradingPeriod: 'Q2',
        evaluationType: 'teacher_class',
        ratings: {
          teaching_clarity: 0,
          teacher_support: 5,
        },
        comment: undefined,
      }),
    );
  });

  it('shows an in-page load error and retries both evaluation inboxes', async () => {
    mockedLxpService.getMySystemEvaluations.mockRejectedValueOnce(
      new Error('Network unavailable'),
    );

    render(<StudentTeacherEvaluationsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Evaluations unavailable' }),
    ).toBeVisible();
    expect(
      screen.queryByText('No assigned forms for the selected filter.'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading evaluations' }));

    expect(await screen.findByRole('button', { name: /System Pulse/i })).toBeVisible();
    expect(mockedLxpService.getMySystemEvaluations).toHaveBeenCalledTimes(2);
    expect(
      mockedLxpService.getStudentTeacherEvaluationDashboard,
    ).toHaveBeenCalledTimes(2);
  });

  it('keeps the active system draft after a submission failure', async () => {
    mockedLxpService.submitAssignedSystemEvaluation.mockRejectedValueOnce(
      new Error('Please try again'),
    );

    render(<StudentTeacherEvaluationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'System' }));
    fireEvent.click(screen.getByRole('button', { name: /System Pulse/i }));
    const zeroRating = screen.getAllByRole('radio', {
      name: /0 stars, Not observed/i,
    })[0];
    fireEvent.click(zeroRating);
    screen
      .getAllByRole('radio', { name: /5 stars, Excellent/i })
      .slice(1)
      .forEach((choice) => fireEvent.click(choice));
    fireEvent.change(
      screen.getByPlaceholderText('Share a short comment about this evaluation.'),
      { target: { value: 'Keep this draft' } },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit Evaluation' }));

    await waitFor(() =>
      expect(
        mockedLxpService.submitAssignedSystemEvaluation,
      ).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByText('0 · Not observed')).toBeVisible();
    expect(
      screen.getByDisplayValue('Keep this draft'),
    ).toBeVisible();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AiDraftJobsPanel } from './AiDraftJobsPanel';
import { aiService } from '@/services/ai-service';

jest.mock('@/services/ai-service', () => ({
  aiService: {
    listTeacherJobs: jest.fn(),
    deleteTeacherJob: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockedAiService = aiService as jest.Mocked<typeof aiService>;

describe('AiDraftJobsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAiService.listTeacherJobs.mockResolvedValue({
      data: [
        {
          jobId: 'job-approved',
          jobType: 'quiz_generation',
          classId: 'class-1',
          title: 'Fractions checkpoint',
          status: 'approved',
          progressPercent: 100,
          statusMessage: null,
          errorMessage: null,
          outputId: 'output-1',
          assessmentId: 'assessment-1',
          createdAt: '2026-08-26T00:00:00.000Z',
          updatedAt: '2026-08-27T00:00:00.000Z',
        },
        {
          jobId: 'job-processing',
          jobType: 'quiz_generation',
          classId: 'class-1',
          title: 'Geometry review',
          status: 'processing',
          progressPercent: 60,
          statusMessage: 'Writing questions',
          errorMessage: null,
          outputId: null,
          assessmentId: null,
          createdAt: '2026-08-27T00:00:00.000Z',
          updatedAt: '2026-08-27T00:01:00.000Z',
        },
        {
          jobId: 'job-failed',
          jobType: 'quiz_generation',
          classId: 'class-1',
          title: 'Decimals quiz',
          status: 'failed',
          progressPercent: 100,
          statusMessage: null,
          errorMessage: 'Generation timed out',
          outputId: null,
          assessmentId: null,
          createdAt: '2026-08-25T00:00:00.000Z',
          updatedAt: '2026-08-25T00:01:00.000Z',
        },
      ],
    });
    mockedAiService.deleteTeacherJob.mockResolvedValue({
      data: {
        jobId: 'job-failed',
        jobType: 'quiz_generation',
        status: 'cancelled',
        progressPercent: 100,
      },
    });
  });

  it('shows quiz titles, accessible status labels, and job-specific links', async () => {
    render(<AiDraftJobsPanel classId="class-1" />);

    expect(await screen.findByText('Fractions checkpoint')).toBeInTheDocument();
    expect(screen.queryByText('job-approved')).not.toBeInTheDocument();
    expect(screen.getByText('Approved')).toHaveAttribute('data-status', 'approved');
    expect(screen.getByText('Processing')).toHaveAttribute('data-status', 'processing');
    expect(screen.getByText('Failed')).toHaveAttribute('data-status', 'failed');
    expect(screen.getByRole('link', { name: 'Resume Fractions checkpoint' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes/class-1/ai-draft?jobId=job-approved',
    );
    expect(screen.getByRole('link', { name: 'Open Fractions checkpoint assessment' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/assessments/assessment-1/edit',
    );
  });

  it('deletes only the selected job after confirmation and refreshes the list', async () => {
    render(<AiDraftJobsPanel classId="class-1" />);
    await screen.findByText('Decimals quiz');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Decimals quiz job' }));
    expect(screen.getByText('Delete AI draft job?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete job' }));

    await waitFor(() => {
      expect(mockedAiService.deleteTeacherJob).toHaveBeenCalledWith('job-failed');
      expect(mockedAiService.listTeacherJobs).toHaveBeenCalledTimes(2);
    });
  });
});

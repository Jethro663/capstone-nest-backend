'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherAssessmentDetailPage from './page';
import { assessmentService } from '@/services/assessment-service';
import type { Assessment, SubmissionsResponse } from '@/types/assessment';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'assessment-1' }),
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getById: jest.fn(),
    getSubmissions: jest.fn(),
    getStats: jest.fn(),
    getQuestionAnalytics: jest.fn(),
  },
}));

jest.mock('@/components/teacher/assessment/assessment-overview', () => ({
  AssessmentOverview: ({ onOpenReview }: { onOpenReview: () => void }) => (
    <div>
      <p>Overview workbench</p>
      <button type="button" onClick={onOpenReview}>Open review</button>
    </div>
  ),
}));

jest.mock('./_components/review-tab', () => ({
  ReviewTab: ({ onGradeReturned }: { onGradeReturned: () => void }) => (
    <button type="button" onClick={onGradeReturned}>Refresh assessment data</button>
  ),
}));

jest.mock('@/components/teacher/assessment/post-scores-tab', () => ({
  PostScoresTab: ({ onDataChanged }: { onDataChanged: () => void }) => (
    <button type="button" onClick={onDataChanged}>Refresh score data</button>
  ),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn() },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;

const assessment = {
  id: 'assessment-1',
  title: 'Pagsusulit sa Filipino 7',
  classId: 'class-1',
  type: 'quiz',
  totalPoints: 10,
  passingScore: 60,
  isPublished: false,
  dueDate: undefined,
} as Assessment;

const submissions: SubmissionsResponse = {
  assessment: {
    id: assessment.id,
    title: assessment.title,
    type: assessment.type,
    totalPoints: assessment.totalPoints ?? 0,
    isPublished: false,
  },
  submissions: [],
  summary: {
    total: 6,
    notStarted: 6,
    inProgress: 0,
    turnedIn: 0,
    returned: 0,
  },
};

function arrangeSuccessfulLoad() {
  mockedAssessmentService.getById.mockResolvedValue({ data: assessment } as never);
  mockedAssessmentService.getSubmissions.mockResolvedValue({ data: submissions } as never);
  mockedAssessmentService.getStats.mockResolvedValue({
    data: {
      totalAttempts: 0,
      submittedAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
    },
  } as never);
  mockedAssessmentService.getQuestionAnalytics.mockResolvedValue({
    data: { totalResponses: 0, totalAttempts: 0, questions: [] },
  } as never);
}

describe('TeacherAssessmentDetailPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    arrangeSuccessfulLoad();
  });

  it('uses one clear back path and action-oriented workbench views', async () => {
    render(<TeacherAssessmentDetailPage />);

    await screen.findByRole('heading', { name: assessment.title });
    expect(screen.getAllByRole('link', { name: /Back to assignments/i })).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Review & grade' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Scores' })).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('10 points')).toBeInTheDocument();
    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  it('keeps the assessment visible when optional analytics fail', async () => {
    mockedAssessmentService.getQuestionAnalytics.mockRejectedValueOnce(
      new Error('analytics unavailable'),
    );

    render(<TeacherAssessmentDetailPage />);

    await screen.findByRole('heading', { name: assessment.title });
    expect(screen.getByText('Some assessment information is unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByText('Overview workbench')).toBeInTheDocument();
  });

  it('refreshes grading data without replacing the workbench with a page skeleton', async () => {
    render(<TeacherAssessmentDetailPage />);

    await screen.findByRole('heading', { name: assessment.title });
    fireEvent.click(screen.getByRole('button', { name: 'Open review' }));

    mockedAssessmentService.getById.mockReturnValueOnce(new Promise(() => undefined));
    mockedAssessmentService.getSubmissions.mockReturnValueOnce(new Promise(() => undefined));
    mockedAssessmentService.getStats.mockReturnValueOnce(new Promise(() => undefined));
    mockedAssessmentService.getQuestionAnalytics.mockReturnValueOnce(new Promise(() => undefined));

    fireEvent.click(screen.getByRole('button', { name: 'Refresh assessment data' }));
    await waitFor(() => expect(mockedAssessmentService.getById).toHaveBeenCalledTimes(2));

    expect(screen.getByRole('heading', { name: assessment.title })).toBeInTheDocument();
    expect(screen.queryByTestId('assessment-detail-loading')).not.toBeInTheDocument();
  });

  it('shows a dedicated retry state when the assessment identity cannot load', async () => {
    mockedAssessmentService.getById.mockRejectedValueOnce(new Error('network unavailable'));

    render(<TeacherAssessmentDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Assessment unavailable' })).toBeInTheDocument();
    expect(screen.getByText('We could not load this assessment.')).toBeInTheDocument();
    expect(screen.queryByText('Assessment not found.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

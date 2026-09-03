import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PostScoresTab } from './post-scores-tab';
import { assessmentService } from '@/services/assessment-service';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/components/teacher/assessment/preview-modal', () => ({
  PreviewModal: () => null,
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    bulkReturnGrades: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;

describe('PostScoresTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAssessmentService.bulkReturnGrades.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        returned: 1,
        attemptIds: ['attempt-1'],
      },
    } as never);
  });

  it('filters students and releases only the selected pending submissions', async () => {
    const onDataChanged = jest.fn();

    render(
      <PostScoresTab
        assessmentId="assessment-1"
        assessment={{
          id: 'assessment-1',
          title: 'Assessment 1',
          classId: 'class-1',
          type: 'file_upload',
          totalPoints: 100,
          isPublished: true,
        }}
        submissions={{
          assessment: {
            id: 'assessment-1',
            title: 'Assessment 1',
            type: 'file_upload',
            totalPoints: 100,
            isPublished: true,
          },
          submissions: [
            {
              studentId: 'student-1',
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane@example.com',
              status: 'turned_in',
              totalAttempts: 1,
              attempt: {
                id: 'attempt-1',
                isSubmitted: true,
                submittedAt: '2026-03-19T00:10:00.000Z',
                score: 92,
              },
            },
            {
              studentId: 'student-2',
              firstName: 'John',
              lastName: 'Smith',
              email: 'john@example.com',
              status: 'returned',
              totalAttempts: 1,
              attempt: {
                id: 'attempt-2',
                isSubmitted: true,
                submittedAt: '2026-03-20T00:10:00.000Z',
                score: 95,
              },
            },
            {
              studentId: 'student-3',
              firstName: 'Alex',
              lastName: 'Lee',
              email: 'alex@example.com',
              status: 'not_started',
              totalAttempts: 0,
              attempt: null,
            },
          ],
          summary: {
            total: 3,
            notStarted: 1,
            inProgress: 0,
            turnedIn: 1,
            returned: 1,
          },
        }}
        onDataChanged={onDataChanged}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /awaiting release/i }));
    expect(screen.getByText('Doe, Jane')).toBeInTheDocument();
    expect(screen.queryByText('Smith, John')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select Doe, Jane'));
    fireEvent.click(screen.getByRole('button', { name: /release selected \(1\)/i }));
    fireEvent.click(await screen.findByRole('button', { name: /release selected \(1\)/i }));

    await waitFor(() => {
      expect(mockedAssessmentService.bulkReturnGrades).toHaveBeenCalledWith({
        attemptIds: ['attempt-1'],
        teacherFeedback: undefined,
      });
    });

    expect(onDataChanged).toHaveBeenCalled();
  });

  it('does not render unavailable score data as an empty roster', () => {
    render(
      <PostScoresTab
        assessmentId="assessment-1"
        assessment={{
          id: 'assessment-1',
          title: 'Assessment 1',
          classId: 'class-1',
          type: 'quiz',
          totalPoints: 10,
          isPublished: true,
        }}
        submissions={null}
        onDataChanged={jest.fn()}
      />,
    );

    expect(screen.getByText('Scores are temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/All students: 0 students/i)).not.toBeInTheDocument();
  });
});

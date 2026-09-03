import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReviewTab } from './review-tab';
import { assessmentService } from '@/services/assessment-service';
import type { SubmissionsResponse } from '@/types/assessment';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getAttemptResults: jest.fn(),
    returnGrade: jest.fn(),
    unreturnGrade: jest.fn(),
    getAttemptSubmissionFileBlob: jest.fn(),
    downloadAttemptSubmissionAttachmentFile: jest.fn(),
    downloadAttemptSubmissionFile: jest.fn(),
    openAttemptSubmissionFile: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;

const oneReviewableSubmission: SubmissionsResponse = {
  assessment: {
    id: 'assessment-1',
    title: 'Filipino Quiz',
    type: 'quiz',
    totalPoints: 10,
    isPublished: true,
  },
  submissions: [
    {
      studentId: 'student-1',
      firstName: 'Ana',
      lastName: 'Cruz',
      email: 'ana@example.edu',
      status: 'turned_in',
      attempt: {
        id: 'attempt-1',
        attemptNumber: 1,
        isSubmitted: true,
        isReturned: false,
        score: 80,
      },
      attempts: [
        {
          id: 'attempt-1',
          attemptNumber: 1,
          isSubmitted: true,
          isReturned: false,
          score: 80,
        },
      ],
      totalAttempts: 1,
    },
  ],
  summary: {
    total: 1,
    notStarted: 0,
    inProgress: 0,
    turnedIn: 1,
    returned: 0,
  },
};

describe('ReviewTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: jest.fn(() => 'blob:preview-url'),
        revokeObjectURL: jest.fn(),
      },
      writable: true,
    });

    mockedAssessmentService.getAttemptResults.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        score: 100,
        assessment: {
          type: 'file_upload',
          totalPoints: 100,
          rubricCriteria: [],
        },
        responses: [],
        submittedFile: {
          id: 'file-2',
          originalName: 'submission-2.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024 * 1024,
          uploadedAt: '2026-03-19T00:00:00.000Z',
        },
        submittedFiles: [
          {
            id: 'file-1',
            originalName: 'submission-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 512 * 1024,
            uploadedAt: '2026-03-19T00:00:00.000Z',
          },
          {
            id: 'file-2',
            originalName: 'submission-2.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024 * 1024,
            uploadedAt: '2026-03-19T00:05:00.000Z',
          },
        ],
      },
    } as never);
    mockedAssessmentService.getAttemptSubmissionFileBlob.mockResolvedValue({
      blob: new Blob(['pdf-content'], { type: 'application/pdf' }),
      filename: 'submission-1.pdf',
    } as never);
  });

  it('renders every uploaded submission and previews the selected attachment', async () => {
    render(
      <ReviewTab
        assessmentId="assessment-1"
        onGradeReturned={jest.fn()}
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
                submittedAt: '2026-03-19T00:10:00.000Z',
                isSubmitted: true,
                attemptNumber: 1,
                score: 100,
                timeSpentSeconds: 600,
              },
              attempts: [
                {
                  id: 'attempt-1',
                  submittedAt: '2026-03-19T00:10:00.000Z',
                  isSubmitted: true,
                  attemptNumber: 1,
                  score: 100,
                  timeSpentSeconds: 600,
                },
              ],
              timeline: [
                {
                  id: 'timeline-1',
                  attemptId: 'attempt-1',
                  action: 'assessment.submission.file_uploaded',
                  createdAt: '2026-03-19T00:01:00.000Z',
                  actorName: 'Jane Doe',
                  metadata: {
                    originalName: 'submission-1.pdf',
                  },
                },
                {
                  id: 'timeline-2',
                  attemptId: 'attempt-1',
                  action: 'assessment.submission.submitted',
                  createdAt: '2026-03-19T00:10:00.000Z',
                  actorName: 'Jane Doe',
                  metadata: null,
                },
              ],
            },
          ],
          summary: {
            total: 1,
            notStarted: 0,
            inProgress: 0,
            turnedIn: 1,
            returned: 0,
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(mockedAssessmentService.getAttemptResults).toHaveBeenCalledWith('attempt-1');
    });

    expect(screen.getByText('Submitted Files')).toBeInTheDocument();
    expect(screen.getByText('submission-1.pdf')).toBeInTheDocument();
    expect(screen.getByText('submission-2.pdf')).toBeInTheDocument();
    expect(screen.queryByText('No answer data was recorded for this attempt.')).not.toBeInTheDocument();
    expect(screen.getByText('This attempt was submitted as an uploaded file. Use the preview or download actions above to review it.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview submission-1.pdf' }));

    await waitFor(() => {
      expect(mockedAssessmentService.getAttemptSubmissionFileBlob).toHaveBeenCalledWith(
        'attempt-1',
        'submission-1.pdf',
        'file-1',
      );
    });

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download submission-2.pdf' }));

    expect(mockedAssessmentService.downloadAttemptSubmissionAttachmentFile).toHaveBeenCalledWith(
      'attempt-1',
      'file-2',
      'submission-2.pdf',
    );
  });

  it('shows file upload history but keeps grading on the latest submission only', async () => {
    render(
      <ReviewTab
        assessmentId="assessment-1"
        onGradeReturned={jest.fn()}
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
              totalAttempts: 2,
              attempt: {
                id: 'attempt-2',
                submittedAt: '2026-03-20T00:10:00.000Z',
                isSubmitted: true,
                attemptNumber: 2,
                score: 92,
                timeSpentSeconds: 600,
                isLate: true,
                lateByMinutes: 15,
              },
              attempts: [
                {
                  id: 'attempt-2',
                  submittedAt: '2026-03-20T00:10:00.000Z',
                  isSubmitted: true,
                  attemptNumber: 2,
                  score: 92,
                  timeSpentSeconds: 600,
                  isLate: true,
                  lateByMinutes: 15,
                },
                {
                  id: 'attempt-1',
                  submittedAt: '2026-03-19T00:10:00.000Z',
                  isSubmitted: true,
                  attemptNumber: 1,
                  score: 88,
                  timeSpentSeconds: 500,
                  isLate: false,
                },
              ],
            },
          ],
          summary: {
            total: 1,
            notStarted: 0,
            inProgress: 0,
            turnedIn: 1,
            returned: 0,
          },
        }}
      />,
    );

    expect(await screen.findByText('Attempt 2')).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByText('Late (15 min)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /attempt 1/i }));

    expect(
      await screen.findByText(
        'Scores can only be released for the latest submission. Earlier uploads stay visible for history only.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /release score \(attempt 1\)/i })).toBeDisabled();
  });

  it('shows the full submission timeline and allows restoring a released score for corrections', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: {
        score: 92,
        isReturned: true,
        assessment: {
          type: 'file_upload',
          totalPoints: 100,
          rubricCriteria: [],
        },
        responses: [],
      },
    } as never);

    const onGradeReturned = jest.fn();

    render(
      <ReviewTab
        assessmentId="assessment-1"
        onGradeReturned={onGradeReturned}
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
              status: 'returned',
              totalAttempts: 1,
              attempt: {
                id: 'attempt-1',
                submittedAt: '2026-03-19T00:10:00.000Z',
                isSubmitted: true,
                isReturned: true,
                attemptNumber: 1,
                score: 92,
                timeSpentSeconds: 600,
              },
              attempts: [
                {
                  id: 'attempt-1',
                  submittedAt: '2026-03-19T00:10:00.000Z',
                  isSubmitted: true,
                  isReturned: true,
                  attemptNumber: 1,
                  score: 92,
                  timeSpentSeconds: 600,
                },
              ],
              timeline: [
                {
                  id: 'timeline-1',
                  attemptId: 'attempt-1',
                  action: 'assessment.submission.file_uploaded',
                  createdAt: '2026-03-19T00:01:00.000Z',
                  actorName: 'Jane Doe',
                  metadata: {
                    originalName: 'submission-1.pdf',
                  },
                },
                {
                  id: 'timeline-2',
                  attemptId: 'attempt-1',
                  action: 'assessment.grade.returned',
                  createdAt: '2026-03-19T00:20:00.000Z',
                  actorName: 'Teacher One',
                  metadata: null,
                },
              ],
            },
          ],
          summary: {
            total: 1,
            notStarted: 0,
            inProgress: 0,
            turnedIn: 0,
            returned: 1,
          },
        }}
      />,
    );

    expect(await screen.findByText('Submission Timeline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submission timeline/i }));
    expect(await screen.findByText('Attempt 1: attached submission-1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Attempt 1: score released')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /restore to review/i }));

    await waitFor(() => {
      expect(mockedAssessmentService.unreturnGrade).toHaveBeenCalledWith('attempt-1');
    });
    expect(onGradeReturned).toHaveBeenCalled();
  });

  it('sanitizes rubric score text inputs with max clamping and leading-zero cleanup', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: {
        score: 0,
        assessment: {
          type: 'file_upload',
          totalPoints: 100,
          rubricCriteria: [
            {
              id: 'criterion-1',
              title: 'Criteria 1',
              description: '',
              points: 25,
            },
          ],
        },
        rubricScores: [
          {
            criterionId: 'criterion-1',
            pointsEarned: 0,
            feedback: '',
          },
        ],
        responses: [],
      },
    } as never);

    render(
      <ReviewTab
        assessmentId="assessment-1"
        onGradeReturned={jest.fn()}
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
                submittedAt: '2026-03-19T00:10:00.000Z',
                isSubmitted: true,
                attemptNumber: 1,
                score: 0,
                timeSpentSeconds: 600,
              },
              attempts: [
                {
                  id: 'attempt-1',
                  submittedAt: '2026-03-19T00:10:00.000Z',
                  isSubmitted: true,
                  attemptNumber: 1,
                  score: 0,
                  timeSpentSeconds: 600,
                },
              ],
            },
          ],
          summary: {
            total: 1,
            notStarted: 0,
            inProgress: 0,
            turnedIn: 1,
            returned: 0,
          },
        }}
      />,
    );

    const rubricInput = await screen.findByLabelText('Criteria 1 points');

    fireEvent.change(rubricInput, { target: { value: '030' } });
    expect(rubricInput).toHaveValue('25');

    fireEvent.change(rubricInput, { target: { value: '007' } });
    expect(rubricInput).toHaveValue('7');

    fireEvent.change(rubricInput, { target: { value: '' } });
    expect(rubricInput).toHaveValue('0');

    fireEvent.blur(rubricInput);
    expect(rubricInput).toHaveValue('0');
  });

  it('sanitizes direct score input with max clamping and leading-zero cleanup', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: {
        score: 0,
        directScore: 0,
        assessment: {
          type: 'file_upload',
          totalPoints: 100,
          rubricCriteria: [],
        },
        responses: [],
      },
    } as never);

    render(
      <ReviewTab
        assessmentId="assessment-1"
        onGradeReturned={jest.fn()}
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
                submittedAt: '2026-03-19T00:10:00.000Z',
                isSubmitted: true,
                attemptNumber: 1,
                score: 0,
                timeSpentSeconds: 600,
              },
              attempts: [
                {
                  id: 'attempt-1',
                  submittedAt: '2026-03-19T00:10:00.000Z',
                  isSubmitted: true,
                  attemptNumber: 1,
                  score: 0,
                  timeSpentSeconds: 600,
                },
              ],
            },
          ],
          summary: {
            total: 1,
            notStarted: 0,
            inProgress: 0,
            turnedIn: 1,
            returned: 0,
          },
        }}
      />,
    );

    const directScoreInput = await screen.findByLabelText('Direct score');

    fireEvent.change(directScoreInput, { target: { value: '0199' } });
    expect(directScoreInput).toHaveValue('100');

    fireEvent.change(directScoreInput, { target: { value: '007' } });
    expect(directScoreInput).toHaveValue('7');

    fireEvent.change(directScoreInput, { target: { value: '' } });
    expect(directScoreInput).toHaveValue('');

    fireEvent.blur(directScoreInput);
    expect(directScoreInput).toHaveValue('0');
  });

  it('uses per-question manual scoring for objective assessments and hides direct score', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: {
        score: 0,
        assessment: {
          type: 'quiz',
          totalPoints: 5,
          rubricCriteria: [],
        },
        responses: [
          {
            id: 'response-1',
            questionId: 'question-1',
            isCorrect: false,
            pointsEarned: 0,
            question: {
              type: 'multiple_choice',
              content: '<p>What is 2 + 2?</p>',
              points: 5,
              options: [
                { id: 'option-a', text: '4', isCorrect: true },
                { id: 'option-b', text: '5', isCorrect: false },
              ],
            },
          },
        ],
      },
    } as never);
    mockedAssessmentService.returnGrade.mockResolvedValueOnce({
      success: true,
      message: 'ok',
    } as never);

    render(
      <ReviewTab
        assessmentId="assessment-1"
        onGradeReturned={jest.fn()}
        submissions={{
          assessment: {
            id: 'assessment-1',
            title: 'Assessment 1',
            type: 'quiz',
            totalPoints: 5,
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
                submittedAt: '2026-03-19T00:10:00.000Z',
                isSubmitted: true,
                attemptNumber: 1,
                score: 0,
                timeSpentSeconds: 600,
              },
              attempts: [
                {
                  id: 'attempt-1',
                  submittedAt: '2026-03-19T00:10:00.000Z',
                  isSubmitted: true,
                  attemptNumber: 1,
                  score: 0,
                  timeSpentSeconds: 600,
                },
              ],
            },
          ],
          summary: {
            total: 1,
            notStarted: 0,
            inProgress: 0,
            turnedIn: 1,
            returned: 0,
          },
        }}
      />,
    );

    expect(screen.queryByLabelText('Direct score')).not.toBeInTheDocument();

    const questionScoreInput = await screen.findByLabelText('Score for question 1');
    expect(screen.getByText('Auto-graded')).toBeInTheDocument();

    fireEvent.change(questionScoreInput, { target: { value: '009' } });
    expect(questionScoreInput).toHaveValue('5');

    fireEvent.change(questionScoreInput, { target: { value: '003' } });
    expect(questionScoreInput).toHaveValue('3');

    fireEvent.change(questionScoreInput, { target: { value: '' } });
    expect(questionScoreInput).toHaveValue('');

    fireEvent.blur(questionScoreInput);
    expect(questionScoreInput).toHaveValue('0');

    fireEvent.change(questionScoreInput, { target: { value: '004' } });
    fireEvent.click(screen.getByRole('button', { name: /Release score/i }));

    await waitFor(() => {
      expect(mockedAssessmentService.returnGrade).toHaveBeenCalledWith(
        'attempt-1',
        expect.objectContaining({
          teacherFeedback: undefined,
          directScore: undefined,
          rubricScores: undefined,
          manualResponseScores: [
            {
              questionId: 'question-1',
              pointsEarned: 4,
            },
          ],
        }),
      );
    });
  });

  it('provides a labeled learner search and clear release status', async () => {
    render(
      <ReviewTab
        assessmentId="assessment-1"
        submissions={oneReviewableSubmission}
        onGradeReturned={jest.fn()}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Search students' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cruz, Ana/i })).toBeInTheDocument();
    expect(screen.getByText('Awaiting release')).toBeInTheDocument();
    expect(screen.queryByText('Pending Score')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Release score/i })).toBeInTheDocument();
  });

  it('distinguishes unavailable activity from a real empty submission list', () => {
    const { rerender } = render(
      <ReviewTab assessmentId="assessment-1" submissions={null} onGradeReturned={jest.fn()} />,
    );

    expect(screen.getByText('Submissions are temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No submissions to review')).not.toBeInTheDocument();

    rerender(
      <ReviewTab
        assessmentId="assessment-1"
        submissions={{
          ...oneReviewableSubmission,
          submissions: [],
          summary: { ...oneReviewableSubmission.summary, turnedIn: 0 },
        }}
        onGradeReturned={jest.fn()}
      />,
    );

    expect(screen.getByText('No submissions to review')).toBeInTheDocument();
  });
});

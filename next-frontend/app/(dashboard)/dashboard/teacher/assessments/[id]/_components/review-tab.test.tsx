import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReviewTab } from './review-tab';
import { assessmentService } from '@/services/assessment-service';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: { children: ReactNode }) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getAttemptResults: jest.fn(),
    returnGrade: jest.fn(),
    getAttemptSubmissionFileBlob: jest.fn(),
    downloadAttemptSubmissionFile: jest.fn(),
    openAttemptSubmissionFile: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;

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
        responses: [],
        submittedFile: {
          id: 'file-1',
          originalName: 'submission.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024 * 1024,
          uploadedAt: '2026-03-19T00:00:00.000Z',
        },
      },
    } as never);
    mockedAssessmentService.getAttemptSubmissionFileBlob.mockResolvedValue({
      blob: new Blob(['pdf-content'], { type: 'application/pdf' }),
      filename: 'submission.pdf',
    } as never);
  });

  it('renders uploaded submissions instead of the empty-response warning and supports inline preview', async () => {
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

    expect(screen.getByText('Submitted File')).toBeInTheDocument();
    expect(screen.getByText('submission.pdf')).toBeInTheDocument();
    expect(screen.queryByText('No answer data was recorded for this attempt.')).not.toBeInTheDocument();
    expect(screen.getByText('This attempt was submitted as an uploaded file. Use the preview or download actions above to review it.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview in LMS' }));

    await waitFor(() => {
      expect(mockedAssessmentService.getAttemptSubmissionFileBlob).toHaveBeenCalledWith('attempt-1', 'submission.pdf');
    });

    expect(await screen.findByTitle('Preview of submission.pdf')).toBeInTheDocument();
  });
});

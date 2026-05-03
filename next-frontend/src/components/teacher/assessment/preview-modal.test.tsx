import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PreviewModal } from './preview-modal';
import { assessmentService } from '@/services/assessment-service';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getAttemptResults: jest.fn(),
    getAttemptSubmissionFileBlob: jest.fn(),
    downloadAttemptSubmissionAttachmentFile: jest.fn(),
    openAttemptSubmissionFile: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;

describe('PreviewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: jest.fn(() => 'blob:preview-url'),
        revokeObjectURL: jest.fn(),
      },
      writable: true,
    });
  });

  it('shows file upload attachments and rubric scoring in preview mode', async () => {
    mockedAssessmentService.getAttemptResults.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        score: 88,
        passed: true,
        rubricScores: [
          {
            criterionId: 'criterion-1',
            pointsEarned: 20,
            feedback: 'Strong support',
          },
        ],
        submittedFiles: [
          {
            id: 'file-1',
            originalName: 'submission-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024 * 1024,
            uploadedAt: '2026-03-19T00:00:00.000Z',
          },
        ],
        assessment: {
          id: 'assessment-1',
          title: 'Assessment 1',
          type: 'file_upload',
          totalPoints: 100,
          rubricCriteria: [
            {
              id: 'criterion-1',
              title: 'Criteria 1',
              description: 'Evidence quality',
              points: 25,
            },
          ],
        },
        student: {
          firstName: 'Jane',
          lastName: 'Doe',
        },
      },
    } as never);

    mockedAssessmentService.getAttemptSubmissionFileBlob.mockResolvedValue({
      blob: new Blob(['pdf-content'], { type: 'application/pdf' }),
      filename: 'submission-1.pdf',
    } as never);

    render(
      <PreviewModal
        attemptId="attempt-1"
        open
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText("Jane Doe's Submission")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedAssessmentService.getAttemptSubmissionFileBlob).toHaveBeenCalledWith(
        'attempt-1',
        'submission-1.pdf',
        'file-1',
      );
    });

    expect(screen.getByText('Submitted Files')).toBeInTheDocument();
    expect(screen.getByText('submission-1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Rubric Scoring')).toBeInTheDocument();
    expect(screen.getByText('Criteria 1')).toBeInTheDocument();
    expect(screen.getByText('20 / 25')).toBeInTheDocument();
    expect(screen.getByText('Strong support')).toBeInTheDocument();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});

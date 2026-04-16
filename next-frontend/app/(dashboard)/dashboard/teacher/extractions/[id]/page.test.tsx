'use client';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExtractionReviewPage from './page';
import { extractionService } from '@/services/extraction-service';
import { toast } from 'sonner';

const backMock = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'extraction-1' }),
  useRouter: () => ({ back: backMock }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/extraction-service', () => ({
  extractionService: {
    getById: jest.fn(),
    getStatus: jest.fn(),
    update: jest.fn(),
    apply: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/components/shared/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

function buildExtraction(status: 'pending' | 'completed' = 'completed') {
  return {
    id: 'extraction-1',
    fileId: 'file-1',
    classId: 'class-1',
    teacherId: 'teacher-1',
    extractionStatus: status,
    modelUsed: null,
    errorMessage: null,
    structuredContent:
      status === 'completed'
        ? {
            title: 'Module Title',
            description: 'Module Description',
            sections: [
              {
                title: 'Section 1',
                description: 'Section Description',
                order: 1,
                lessonBlocks: [
                  {
                    type: 'text',
                    content: { text: 'Lesson content' },
                    order: 0,
                  },
                  {
                    type: 'image',
                    content: {
                      url: 'data:image/png;base64,ZmFrZQ==',
                      caption: 'Figure from page 1',
                    },
                    order: 1,
                    metadata: {
                      pageNumber: 1,
                      assignmentConfidence: 0.88,
                    },
                  },
                ],
                assessmentDraft: {
                  title: 'Checkpoint',
                  description: 'Quick check',
                  type: 'quiz',
                  passingScore: 60,
                  feedbackLevel: 'standard',
                  questions: [{ content: 'What is photosynthesis?', type: 'short_answer', points: 1, order: 1 }],
                },
              },
            ],
          }
        : null,
    isApplied: false,
    progressPercent: status === 'pending' ? 10 : 100,
    totalChunks: 10,
    processedChunks: status === 'pending' ? 1 : 10,
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
    originalName: 'module.pdf',
  };
}

const mockedExtractionService = extractionService as jest.Mocked<typeof extractionService>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe('ExtractionReviewPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    backMock.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders section-first content with image preview and assessment draft', async () => {
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);

    render(<ExtractionReviewPage />);

    expect(await screen.findByText('Extraction Review')).toBeInTheDocument();
    expect(screen.getByText('Sections (1)')).toBeInTheDocument();
    expect(screen.getByText('Assessment Draft')).toBeInTheDocument();
    expect(screen.getByAltText('Extracted visual')).toBeInTheDocument();
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Confidence 88%')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/data:image\/png;base64/i)).not.toBeInTheDocument();
  });

  it('renders load error state and retries fetching extraction', async () => {
    mockedExtractionService.getById
      .mockRejectedValueOnce({
        response: {
          data: {
            message: 'AI extraction queue is temporarily unavailable. Please retry shortly.',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: buildExtraction('completed'),
      } as never);

    render(<ExtractionReviewPage />);

    expect(
      await screen.findByText('AI extraction queue is temporarily unavailable. Please retry shortly.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('Extraction Review')).toBeInTheDocument();
    });

    expect(mockedExtractionService.getById).toHaveBeenCalledTimes(2);
    expect(mockedToast.error).toHaveBeenCalledWith(
      'AI extraction queue is temporarily unavailable. Please retry shortly.',
    );
  });

  it('stops polling and surfaces warning after repeated status failures', async () => {
    const outageMessage = 'AI extraction queue is temporarily unavailable. Please retry shortly.';

    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('pending'),
    } as never);
    mockedExtractionService.getStatus.mockRejectedValue({
      response: { data: { message: outageMessage } },
    } as never);

    render(<ExtractionReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Extraction Review')).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(9000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText(outageMessage)).toBeInTheDocument();
    });
    expect(mockedExtractionService.getStatus).toHaveBeenCalledTimes(3);
    expect(mockedToast.error).toHaveBeenCalledWith(outageMessage);
  });

  it('surfaces backend apply error message when apply request fails', async () => {
    const backendMessage = 'AI extraction apply is temporarily unavailable. Please retry shortly.';

    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);
    mockedExtractionService.apply.mockRejectedValue({
      response: { data: { message: backendMessage } },
    } as never);

    render(<ExtractionReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Extraction Review')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply (1 section)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Apply' }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(backendMessage);
    });
  });
});

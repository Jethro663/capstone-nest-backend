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

jest.mock('@/features/lesson-blocks/LessonBlockTeacherEditor', () => ({
  LessonBlockTeacherPreview: ({ block }: { block: { content?: { html?: string } | string } }) => {
    const content =
      typeof block.content === 'string'
        ? block.content
        : block.content && typeof block.content === 'object' && 'html' in block.content
          ? block.content.html
          : '';
    return <div data-testid="lesson-block-preview">{content || 'Empty text block'}</div>;
  },
  LessonBlockTeacherEditor: ({
    block,
    onSave,
    onCancel,
  }: {
    block: { content?: { html?: string } | string };
    onSave: (patch: { content: { html: string } }) => void;
    onCancel: () => void;
  }) => {
    const value =
      typeof block.content === 'string'
        ? block.content
        : block.content && typeof block.content === 'object' && 'html' in block.content
          ? block.content.html || ''
          : '';
    return (
      <div>
        <textarea aria-label="Mock block editor" defaultValue={value} />
        <button
          type="button"
          onClick={(event) => {
            const textarea = event.currentTarget.parentElement?.querySelector('textarea');
            onSave({ content: { html: textarea?.value || '' } });
          }}
        >
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  },
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
            description: '<p>Module Description</p>',
            sections: [
              {
                title: 'Section 1',
                description: 'Section Description',
                order: 1,
                graphKeywords: ['photosynthesis'],
                figureReferences: ['figure:1'],
                lessonBlocks: [
                  {
                    type: 'text',
                    content: { html: '<p>Lesson content</p>' },
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
                      mediaAssetId: 'image-1',
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
            mediaAssets: [
              {
                id: 'image-1',
                url: 'data:image/png;base64,ZmFrZQ==',
                pageNumber: 1,
                caption: 'Figure from page 1',
                selectedSectionIndex: 0,
                teacherReviewed: true,
                candidateSections: [{ sectionIndex: 0, score: 0.88 }],
              },
            ],
            audit: {
              coherenceScore: 0.73,
              coherenceWarnings: ['A short fragment was merged into Section 1.'],
              repairNotes: ['Coherence cleanup merged a micro-fragment into the previous section.'],
              confidenceBreakdown: { overallConfidence: 0.8, warningCount: 1 },
              pipelineStages: ['ingest', 'classify', 'segment', 'structure', 'coherence_cleanup', 'validate', 'persist'],
              requestedSectionCount: 4,
              finalSectionCount: 3,
              sectionCountAdjustmentReason: 'Source content did not safely support the requested section count.',
            },
          }
        : null,
    isApplied: false,
    qualityGate: status === 'completed' ? 'warn' : null,
    reviewRequired: status === 'completed',
    progressPercent: status === 'pending' ? 10 : 100,
    totalChunks: 10,
    processedChunks: status === 'pending' ? 1 : 10,
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
    originalName: 'module.pdf',
    repairNotes: ['Coherence cleanup merged a micro-fragment into the previous section.'],
    confidenceBreakdown: { overallConfidence: 0.8, warningCount: 1 },
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

  it('renders a calmer lesson-editor-style workspace and hides legacy image review UI', async () => {
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);

    render(<ExtractionReviewPage />);

    expect(await screen.findByText('Extraction Workspace')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Content' })).toBeInTheDocument();
    expect(screen.getByText('Teacher review is still required before apply.')).toBeInTheDocument();
    expect(screen.getByText('Coherence cleanup merged a micro-fragment into the previous section.')).toBeInTheDocument();
    expect(screen.getByText('Requested sections')).toBeInTheDocument();
    expect(screen.getByText('Final sections')).toBeInTheDocument();
    expect(screen.getByText('Source content did not safely support the requested section count.')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned images')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Extracted visual')).not.toBeInTheDocument();
  });

  it('keeps extraction status summary inside the header without standalone stat cards', async () => {
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);

    render(<ExtractionReviewPage />);

    expect(await screen.findByText('Extraction Workspace')).toBeInTheDocument();

    const headerSummary = screen.getByTestId('extraction-header-summary');
    expect(headerSummary).toHaveTextContent('Status');
    expect(headerSummary).toHaveTextContent('completed');
    expect(headerSummary).toHaveTextContent('Sections');
    expect(headerSummary).toHaveTextContent('1');
    expect(headerSummary).toHaveTextContent('Questions');
    expect(headerSummary).toHaveTextContent('1');
    expect(document.querySelector('.teacher-figma-stat')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('text-[#12284a]');
  });

  it('keeps generated content blocks in a visible scroll region', async () => {
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);

    render(<ExtractionReviewPage />);

    const contentTab = await screen.findByRole('tab', { name: 'Content' });
    fireEvent.mouseDown(contentTab);
    fireEvent.click(contentTab);

    const generatedContentRegion = await screen.findByTestId('extraction-content-scroll-region');
    expect(generatedContentRegion).toHaveClass('max-h-[calc(100vh-18rem)]');
    expect(generatedContentRegion).toHaveClass('overflow-y-auto');
    expect(generatedContentRegion).toHaveClass('pr-2');
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
      expect(screen.getByText('Extraction Workspace')).toBeInTheDocument();
    });

    expect(mockedExtractionService.getById).toHaveBeenCalledTimes(2);
    expect(mockedToast.error).toHaveBeenCalledWith(
      'AI extraction queue is temporarily unavailable. Please retry shortly.',
    );
  });

  it('keeps a Back action visible when extraction loading fails', async () => {
    mockedExtractionService.getById.mockRejectedValue({
      response: {
        data: {
          message: 'AI service is unavailable. Start the AI service and try again.',
        },
      },
    } as never);

    render(<ExtractionReviewPage />);

    expect(
      await screen.findByText('AI service is unavailable. Start the AI service and try again.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(backMock).toHaveBeenCalledTimes(1);
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
      expect(screen.getByText('Extraction Workspace')).toBeInTheDocument();
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

  it('blocks apply until review is cleared and save state is clean', async () => {
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);

    render(<ExtractionReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Extraction Workspace')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Apply Extraction' })).toBeDisabled();
    expect(mockedExtractionService.apply).not.toHaveBeenCalled();
  });

  it('lets the teacher edit a block and save the extraction draft', async () => {
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);
    mockedExtractionService.update.mockImplementation(async (_id, payload) => ({
      success: true,
      message: 'saved',
      data: {
        ...buildExtraction('completed'),
        structuredContent: {
          ...buildExtraction('completed').structuredContent,
          title: payload.title,
          description: payload.description,
          sections: payload.sections,
          mediaAssets: payload.mediaAssets,
        },
      },
    }) as never);

    render(<ExtractionReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Extraction Workspace')).toBeInTheDocument();
    });

    const contentTab = screen.getByRole('tab', { name: 'Content' });
    fireEvent.mouseDown(contentTab);
    fireEvent.click(contentTab);
    await waitFor(() => {
      expect(contentTab).toHaveAttribute('data-state', 'active');
    });
    const editButton = await screen.findByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);

    const editor = screen.getByLabelText('Mock block editor');
    fireEvent.change(editor, { target: { value: '<p>Teacher revised content</p>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const saveChangesButton = screen.getByRole('button', { name: 'Save Changes' });
    expect(saveChangesButton).toBeEnabled();

    fireEvent.click(saveChangesButton);

    await waitFor(() => {
      expect(mockedExtractionService.update).toHaveBeenCalledWith(
        'extraction-1',
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              lessonBlocks: expect.arrayContaining([
                expect.objectContaining({
                  content: expect.objectContaining({
                    html: '<p>Teacher revised content</p>',
                  }),
                }),
              ]),
            }),
          ]),
        }),
      );
    });
  });
});

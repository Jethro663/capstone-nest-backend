'use client';

import type { Extraction } from '@/types/extraction';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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
    previewApply: jest.fn(),
    apply: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/components/shared/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/features/lesson-blocks/LessonBlockTeacherEditor', () => ({
  LessonBlockTeacherPreview: ({
    block,
  }: {
    block: { content?: { html?: string } | string };
  }) => {
    const content =
      typeof block.content === 'string'
        ? block.content
        : block.content &&
            typeof block.content === 'object' &&
            'html' in block.content
          ? block.content.html
          : '';
    return (
      <div data-testid="lesson-block-preview">
        {content || 'Empty text block'}
      </div>
    );
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
        : block.content &&
            typeof block.content === 'object' &&
            'html' in block.content
          ? block.content.html || ''
          : '';
    return (
      <div>
        <textarea aria-label="Mock block editor" defaultValue={value} />
        <button
          type="button"
          onClick={(event) => {
            const textarea =
              event.currentTarget.parentElement?.querySelector('textarea');
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

function buildExtraction(
  status: 'pending' | 'completed' = 'completed',
): Extraction {
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
                reviewState: 'needs_review',
                lessonBlocks: [
                  {
                    type: 'text',
                    content: { html: '<p>Lesson content</p>' },
                    order: 0,
                    metadata: {
                      instructionalRole: 'explanation',
                      reviewIssueIds: ['issue-1'],
                      provenance: {
                        pageStart: 1,
                        pageEnd: 1,
                        sourceMethod: 'text',
                        confidence: 0.68,
                        sourceSnippet: 'Lesson content',
                        chunkIndex: 1,
                      },
                    },
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
                  questions: [
                    {
                      content: 'What is photosynthesis?',
                      type: 'short_answer',
                      points: 1,
                      order: 1,
                    },
                  ],
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
              coherenceWarnings: [
                'A short fragment was merged into Section 1.',
              ],
              repairNotes: [
                'Coherence cleanup merged a micro-fragment into the previous section.',
              ],
              confidenceBreakdown: { overallConfidence: 0.8, warningCount: 1 },
              reviewState: 'needs_review',
              reviewIssues: [
                {
                  id: 'issue-1',
                  code: 'low-section-confidence',
                  severity: 'blocking',
                  scope: 'section',
                  message: 'Review Section 1 before applying.',
                  sectionIndex: 0,
                  blockIndex: 0,
                  resolved: false,
                  resolution: null,
                },
              ],
              pipelineStages: [
                'ingest',
                'classify',
                'segment',
                'structure',
                'coherence_cleanup',
                'validate',
                'persist',
              ],
              requestedSectionCount: 4,
              finalSectionCount: 3,
              sectionCountAdjustmentReason:
                'Source content did not safely support the requested section count.',
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
    repairNotes: [
      'Coherence cleanup merged a micro-fragment into the previous section.',
    ],
    confidenceBreakdown: { overallConfidence: 0.8, warningCount: 1 },
  };
}

const mockedExtractionService = extractionService as jest.Mocked<
  typeof extractionService
>;
const mockedToast = toast as jest.Mocked<typeof toast>;

function hasConsoleMessage(mock: jest.SpyInstance, fragment: string) {
  return mock.mock.calls.some((call) =>
    call.some(
      (argument: unknown) =>
        typeof argument === 'string' && argument.includes(fragment),
    ),
  );
}

describe('ExtractionReviewPage', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    backMock.mockReset();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
    expect(
      screen.getByText('Teacher review is still required before apply.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Coherence cleanup merged a micro-fragment into the previous section.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Requested sections')).toBeInTheDocument();
    expect(screen.getByText('Final sections')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Source content did not safely support the requested section count.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Unassigned images')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Extracted visual')).not.toBeInTheDocument();
    expect(
      hasConsoleMessage(
        consoleWarnSpy,
        "Duplicate extension names found: ['underline']",
      ),
    ).toBe(false);
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
    expect(
      document.querySelector('.teacher-figma-stat'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass(
      'text-[#12284a]',
    );
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

    const generatedContentRegion = await screen.findByTestId(
      'extraction-content-scroll-region',
    );
    expect(generatedContentRegion).toHaveClass('max-h-[calc(100vh-18rem)]');
    expect(generatedContentRegion).toHaveClass('overflow-y-auto');
    expect(generatedContentRegion).toHaveClass('pr-2');
  });

  it('renders load error state and retries fetching extraction', async () => {
    const outageMessage =
      'Live extraction updates are temporarily unavailable.';

    mockedExtractionService.getById
      .mockRejectedValueOnce({
        response: {
          data: {
            message: outageMessage,
          },
        },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: buildExtraction('completed'),
      } as never);

    render(<ExtractionReviewPage />);

    expect(await screen.findByText(outageMessage)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('Extraction Workspace')).toBeInTheDocument();
    });

    expect(mockedExtractionService.getById).toHaveBeenCalledTimes(2);
    expect(mockedToast.error).toHaveBeenCalledWith(outageMessage);
  });

  it('keeps a Back action visible when extraction loading fails', async () => {
    mockedExtractionService.getById.mockRejectedValue({
      response: {
        data: {
          message:
            'AI service is unavailable. Start the AI service and try again.',
        },
      },
    } as never);

    render(<ExtractionReviewPage />);

    expect(
      await screen.findByText(
        'AI service is unavailable. Start the AI service and try again.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('stops polling and surfaces warning after repeated status failures', async () => {
    const outageMessage =
      'Live extraction updates are temporarily unavailable.';

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
      jest.advanceTimersByTime(24000);
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

    expect(
      screen.getByRole('button', { name: 'Apply Extraction' }),
    ).toBeDisabled();
    expect(mockedExtractionService.apply).not.toHaveBeenCalled();
  });

  it('shows a problem-first review queue with source provenance and resolves issues', async () => {
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);

    render(<ExtractionReviewPage />);

    expect(await screen.findByText('Extraction Workspace')).toBeInTheDocument();
    expect(screen.getByText('Review queue')).toBeInTheDocument();
    expect(
      screen.getByText('Review Section 1 before applying.'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /View source for issue-1/i }),
    );
    expect(screen.getByText(/Lesson content/i)).toBeInTheDocument();
    expect(screen.getByText(/Page 1/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Mark issue-1 reviewed/i }),
    );
    expect(screen.getByText(/Resolved/i)).toBeInTheDocument();
  });

  it('supports section and block repair actions from the review workspace', async () => {
    const extraction = buildExtraction('completed');
    extraction.structuredContent?.sections.push({
      title: 'Section 2',
      description: 'Follow-up',
      order: 2,
      lessonBlocks: [
        {
          type: 'text',
          content: { html: '<p>Second section</p>' },
          order: 0,
        },
      ],
      assessmentDraft: null,
    });
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: extraction,
    } as never);

    render(<ExtractionReviewPage />);

    const contentTab = await screen.findByRole('tab', { name: 'Content' });
    fireEvent.mouseDown(contentTab);
    fireEvent.click(contentTab);

    fireEvent.click(
      await screen.findByRole('button', { name: /Convert block 1 to list/i }),
    );
    expect(screen.getByText(/list/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Split section 1 at block 1/i }),
    );
    expect(screen.getByText(/Section 1 split/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Remove block 1/i }));
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
  });

  it('loads apply preview before confirming apply', async () => {
    const extraction = buildExtraction('completed');
    if (extraction.structuredContent?.audit) {
      extraction.structuredContent.audit.reviewIssues = [
        {
          id: 'issue-1',
          code: 'low-section-confidence',
          severity: 'blocking',
          scope: 'section',
          message: 'Review Section 1 before applying.',
          sectionIndex: 0,
          blockIndex: 0,
          resolved: true,
          resolution: 'teacher-reviewed',
        },
      ];
      extraction.structuredContent.audit.reviewState = 'ready';
    }
    extraction.reviewRequired = false;
    extraction.qualityGate = 'pass';
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: extraction,
    } as never);
    mockedExtractionService.previewApply.mockResolvedValue({
      success: true,
      message: 'preview',
      data: {
        moduleTitle: 'Module Title',
        sectionsCreated: 1,
        lessonsCreated: 1,
        assessmentsCreated: 1,
        blockedReasons: [],
        sections: [
          { title: 'Section 1', lessonBlocks: 2, assessmentQuestions: 1 },
        ],
      },
    } as never);
    mockedExtractionService.apply.mockResolvedValue({
      success: true,
      message: 'applied',
      data: { lessonsCreated: 1 },
    } as never);

    render(<ExtractionReviewPage />);

    expect(await screen.findByText('Extraction Workspace')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Extraction' }));

    await waitFor(() => {
      expect(mockedExtractionService.previewApply).toHaveBeenCalledWith(
        'extraction-1',
        {
          sectionIndices: [0],
        },
      );
    });
    expect(screen.getByText(/Module Title/i)).toBeInTheDocument();
    expect(screen.getByText(/1 lesson/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm & Apply' }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockedExtractionService.apply).toHaveBeenCalledWith(
        'extraction-1',
        {
          sectionIndices: [0],
        },
      );
    });
    await waitFor(() => {
      expect(mockedExtractionService.getById).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Extraction applied successfully',
      );
    });
    expect(hasConsoleMessage(consoleErrorSpy, 'not wrapped in act')).toBe(
      false,
    );
  });

  it('lets the teacher edit a block and save the extraction draft', async () => {
    mockedExtractionService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildExtraction('completed'),
    } as never);
    mockedExtractionService.update.mockImplementation(
      async (_id, payload) =>
        ({
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
        }) as never,
    );

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
    fireEvent.change(editor, {
      target: { value: '<p>Teacher revised content</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const saveChangesButton = screen.getByRole('button', {
      name: 'Save Changes',
    });
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

'use client';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TeacherAiDraftQuizPage from './page';
import { aiService } from '@/services/ai-service';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { extractionService } from '@/services/extraction-service';
import { lessonService } from '@/services/lesson-service';
import { toast } from 'sonner';

const pushMock = jest.fn();
let mockSearchJobId: string | null = null;

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'class-1' }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'jobId' ? mockSearchJobId : null),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/shared/rich-text/RichTextRenderer', () => ({
  RichTextRenderer: ({ html }: { html: string }) => (
    <div data-testid="rich-text">{html}</div>
  ),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getById: jest.fn(),
  },
}));

jest.mock('@/services/lesson-service', () => ({
  lessonService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/extraction-service', () => ({
  extractionService: {
    listByClass: jest.fn(),
  },
}));

jest.mock('@/services/ai-service', () => ({
  aiService: {
    getClassIndexStatus: jest.fn(),
    reindexClass: jest.fn(),
    createQuizDraftJob: jest.fn(),
    getTeacherJobStatus: jest.fn(),
    getQuizDraftJobResult: jest.fn(),
    updateQuizDraft: jest.fn(),
    deleteTeacherJob: jest.fn(),
    previewQuizDraftApply: jest.fn(),
    applyQuizDraft: jest.fn(),
    retryQuizDraftJob: jest.fn(),
    cancelQuizDraftJob: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    delete: jest.fn(),
  },
}));

const mockedAiService = aiService as jest.Mocked<typeof aiService>;
const mockedAssessmentService = assessmentService as jest.Mocked<
  typeof assessmentService
>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedExtractionService = extractionService as jest.Mocked<
  typeof extractionService
>;
const mockedLessonService = lessonService as jest.Mocked<typeof lessonService>;
const mockedToast = toast as jest.Mocked<typeof toast>;

function buildIndexStatus(
  overrides: Record<string, unknown> = {},
) {
  return {
    classId: 'class-1',
    chunksIndexed: 0,
    lessonChunks: 0,
    extractionChunks: 0,
    questionChunks: 0,
    lastIndexedAt: null,
    latestSourceUpdateAt: '2026-04-24T08:00:00.000Z',
    isStale: true,
    needsReindex: true,
    reason: 'No indexed class source content found. Reindex the class sources before generating.',
    readyLessons: [],
    lessonBlockers: [],
    readyExtractions: [],
    extractionBlockers: [],
    sourceSummary: {
      lessons: { total: 2, ready: 0, blocked: 2 },
      extractions: { total: 1, ready: 0, blocked: 1 },
      questions: {
        assessments: 0,
        assessmentsWithQuestions: 0,
        questionCount: 0,
        needsIndex: 0,
      },
    },
    ...overrides,
  };
}

function buildJob(overrides: Record<string, unknown> = {}) {
  return {
    jobId: 'job-1',
    jobType: 'quiz_generation',
    status: 'completed',
    progressPercent: 100,
    statusMessage: 'Draft ready',
    errorMessage: null,
    outputId: 'output-1',
    assessmentId: 'assessment-1',
    updatedAt: '2026-04-24T08:10:00.000Z',
    ...overrides,
  };
}

function buildResult() {
  return {
    title: 'Fractions AI Draft',
    description: '<p>Teacher-facing summary</p>',
    assessmentId: 'assessment-1',
    questions: [
      {
        type: 'multiple_choice',
        content: '<p>What is one half of 10?</p>',
        options: [
          { text: '5', isCorrect: true, order: 1 },
          { text: '10', isCorrect: false, order: 2 },
        ],
      },
      {
        type: 'true_false',
        content: '<p>Fractions can represent equal parts of a whole.</p>',
        options: [
          { text: 'True', isCorrect: true, order: 1 },
          { text: 'False', isCorrect: false, order: 2 },
        ],
      },
    ],
  };
}

function seedTrackedJobs(entries: Array<Record<string, unknown>>) {
  window.localStorage.setItem(
    'teacher-ai-draft-jobs:class-1',
    JSON.stringify(entries),
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('TeacherAiDraftQuizPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-25T12:00:00.000Z'));
    window.localStorage.clear();
    mockSearchJobId = null;

    mockedClassService.getById.mockResolvedValue({
      data: {
        id: 'class-1',
        subjectName: 'Mathematics',
        subjectCode: 'MATH-07A',
        sectionId: 'section-1',
        teacherId: 'teacher-1',
        schoolYear: '2025-2026',
        isActive: true,
        section: { id: 'section-1', name: '7-A', gradeLevel: '7' },
      },
    } as any);

    mockedLessonService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'lesson-ready',
          title: 'Fractions',
          classId: 'class-1',
          order: 1,
          isDraft: false,
        },
        {
          id: 'lesson-blocked',
          title: 'Decimals',
          classId: 'class-1',
          order: 2,
          isDraft: true,
        },
      ],
      count: 2,
      total: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    } as any);

    mockedExtractionService.listByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'extraction-1',
          fileId: 'file-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          extractionStatus: 'processing',
          structuredContent: null,
          isApplied: false,
          progressPercent: 0,
          totalChunks: null,
          processedChunks: 0,
          createdAt: '2026-04-24T08:00:00.000Z',
          updatedAt: '2026-04-24T08:00:00.000Z',
          originalName: 'module.pdf',
        },
      ],
    } as any);

    mockedAiService.getClassIndexStatus.mockResolvedValue({
      data: buildIndexStatus(),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders zero-index readiness, ready-to-index lessons, and blocked sources', async () => {
    mockedAiService.getClassIndexStatus.mockResolvedValue({
      data: buildIndexStatus({
        readyLessons: [
          {
            lessonId: 'lesson-ready',
            title: 'Fractions',
            chunkCount: 0,
            status: 'ready_to_index',
          },
        ],
        lessonBlockers: [
          {
            lessonId: 'lesson-blocked',
            title: 'Decimals',
            reason: 'Lesson is still in draft status.',
          },
        ],
        extractionBlockers: [
          {
            extractionId: 'extraction-1',
            title: 'module.pdf',
            status: 'processing',
            reason: 'Extraction is still processing.',
          },
        ],
        sourceSummary: {
          lessons: { total: 2, ready: 1, blocked: 1 },
          extractions: { total: 1, ready: 0, blocked: 1 },
          questions: {
            assessments: 0,
            assessmentsWithQuestions: 0,
            questionCount: 0,
            needsIndex: 0,
          },
        },
      }),
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Choose the class sources');
    expect(screen.getByText('Index required')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'No indexed class source content found. Reindex the class sources before generating.',
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Ready to index')).toBeInTheDocument();
    expect(screen.getByText('Lesson is still in draft status.')).toBeInTheDocument();
    expect(screen.getByText('Extraction is still processing.')).toBeInTheDocument();
  });

  it('shows draft lessons as blocked and never acknowledges draft sources', async () => {
    mockedAiService.getClassIndexStatus.mockResolvedValue({
      data: buildIndexStatus({
        readyLessons: [],
        lessonBlockers: [
          {
            lessonId: 'lesson-blocked',
            title: 'Decimals',
            reason: 'Lesson is still in draft status.',
          },
        ],
      }),
    } as any);

    render(<TeacherAiDraftQuizPage />);

    const draftCheckbox = await screen.findByRole('checkbox', { name: /decimals/i });
    expect(draftCheckbox).toBeDisabled();
    expect(screen.queryByText(/selected draft source/i)).not.toBeInTheDocument();
  });

  it('disables draft generation when AI source readiness is unavailable', async () => {
    mockedAiService.getClassIndexStatus.mockRejectedValue({
      response: {
        data: {
          message: 'AI service is unavailable. Start the AI service and try again.',
        },
      },
    });

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Choose the class sources');
    await screen.findAllByText(
      'AI source readiness is temporarily unavailable. Refresh the page or run reindex when the AI service is ready.',
    );
    fireEvent.click(screen.getByRole('button', { name: /continue to quiz setup/i }));

    const generateButton = screen.getByRole('button', { name: /^generate draft$/i });
    expect(generateButton).toBeDisabled();
    expect(
      screen.getAllByText(
        'AI source readiness is temporarily unavailable. Refresh the page or run reindex when the AI service is ready.',
      ).length,
    ).toBeGreaterThan(0);
    expect(mockedToast.error).not.toHaveBeenCalledWith(
      'AI service is unavailable. Start the AI service and try again.',
    );
  });

  it('shows the reindexing state and refreshes readiness after reindex completes', async () => {
    const deferred = createDeferred<any>();
    mockedAiService.reindexClass.mockReturnValue(deferred.promise);
    mockedAiService.getClassIndexStatus
      .mockResolvedValueOnce({
        data: buildIndexStatus(),
      } as any)
      .mockResolvedValueOnce({
        data: buildIndexStatus({
          chunksIndexed: 6,
          lessonChunks: 4,
          extractionChunks: 2,
          isStale: false,
          needsReindex: false,
          reason: null,
          readyLessons: [
            {
              lessonId: 'lesson-ready',
              title: 'Fractions',
              chunkCount: 4,
              status: 'indexed',
            },
          ],
          sourceSummary: {
            lessons: { total: 2, ready: 1, blocked: 1 },
            extractions: { total: 1, ready: 0, blocked: 1 },
            questions: {
              assessments: 0,
              assessmentsWithQuestions: 0,
              questionCount: 0,
              needsIndex: 0,
            },
          },
        }),
      } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Reindex Sources');
    fireEvent.click(screen.getByText('Reindex Sources'));

    await waitFor(() => {
      expect(mockedAiService.reindexClass).toHaveBeenCalledWith('class-1');
    });

    const reindexButton = screen.getByRole('button', { name: /reindex sources/i });
    expect(reindexButton).toBeDisabled();

    deferred.resolve({
      data: {
        classId: 'class-1',
        chunksIndexed: 6,
        lessonChunks: 4,
        extractionChunks: 2,
        questionChunks: 0,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Sources indexed')).toBeInTheDocument();
    });
  });

  it('shows degraded retrieval success when reindex falls back to degraded embeddings', async () => {
    mockedAiService.reindexClass.mockResolvedValue({
      data: {
        classId: 'class-1',
        chunksIndexed: 6,
        lessonChunks: 4,
        extractionChunks: 2,
        questionChunks: 0,
        degraded: true,
        warnings: ['Embedding provider failed; using degraded deterministic vectors.'],
        embeddingProvider: 'degraded',
        embeddingModel: 'degraded:hash-embedding-v1',
      },
    } as any);
    mockedAiService.getClassIndexStatus
      .mockResolvedValueOnce({ data: buildIndexStatus() } as any)
      .mockResolvedValueOnce({
        data: buildIndexStatus({
          chunksIndexed: 6,
          lessonChunks: 4,
          extractionChunks: 2,
          isStale: false,
          needsReindex: false,
          reason: null,
        }),
      } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Reindex Sources');
    fireEvent.click(screen.getByText('Reindex Sources'));

    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Indexed with degraded retrieval (6 class chunk(s)).',
      );
    });
  });

  it('moves through sources, setup, and generation tabs while allowing back navigation', async () => {
    mockedAiService.getClassIndexStatus.mockResolvedValue({
      data: buildIndexStatus({
        chunksIndexed: 6,
        lessonChunks: 4,
        extractionChunks: 2,
        isStale: false,
        needsReindex: false,
        reason: null,
        readyLessons: [
          {
            lessonId: 'lesson-ready',
            title: 'Fractions',
            chunkCount: 4,
            status: 'indexed',
          },
        ],
        sourceSummary: {
          lessons: { total: 2, ready: 1, blocked: 1 },
          extractions: { total: 1, ready: 0, blocked: 1 },
          questions: {
            assessments: 0,
            assessmentsWithQuestions: 0,
            questionCount: 0,
            needsIndex: 0,
          },
        },
      }),
    } as any);
    mockedAiService.createQuizDraftJob.mockResolvedValue({
      data: buildJob({
        status: 'pending',
        progressPercent: 20,
        statusMessage: 'Checking sources',
        assessmentId: null,
      }),
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Choose the class sources');
    fireEvent.click(screen.getByRole('button', { name: /continue to quiz setup/i }));

    expect(screen.getByText('Set up the quiz draft')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to sources/i }));
    expect(screen.getByText('Choose the class sources')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continue to quiz setup/i }));
    fireEvent.click(screen.getByRole('button', { name: /^generate draft$/i }));

    await waitFor(() => {
      expect(mockedAiService.createQuizDraftJob).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: 'class-1',
          questionCount: 5,
          questionType: 'multiple_choice',
        }),
      );
    });
    expect(screen.getByText('Track generation progress')).toBeInTheDocument();
  });

  it('loads a completed job result and exposes the assessment editor action', async () => {
    seedTrackedJobs([
      {
        jobId: 'job-1',
        jobType: 'quiz_generation',
        createdAt: '2026-04-24T08:00:00.000Z',
        lastKnownStatus: 'completed',
        lastKnownProgress: 100,
        assessmentId: 'assessment-1',
        updatedAt: '2026-04-24T08:10:00.000Z',
      },
    ]);
    mockedAiService.getTeacherJobStatus.mockResolvedValue({
      data: buildJob(),
    } as any);
    mockedAiService.getQuizDraftJobResult.mockResolvedValue({
      data: {
        job: {
          jobId: 'job-1',
          jobType: 'quiz_generation',
          status: 'completed',
          outputId: 'output-1',
          assessmentId: 'assessment-1',
        },
        result: {
          outputId: 'output-1',
          outputType: 'assessment_draft',
          structuredOutput: buildResult(),
        },
      },
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Fractions AI Draft');
    const editorButton = screen.getByRole('button', {
      name: /open assessment editor/i,
    });
    expect(editorButton).toBeInTheDocument();

    fireEvent.click(editorButton);

    expect(pushMock).toHaveBeenCalledWith(
      '/dashboard/teacher/assessments/assessment-1/edit',
    );
  });

  it('loads the job selected by the URL even when another cached job is newer', async () => {
    mockSearchJobId = 'job-from-link';
    seedTrackedJobs([
      {
        jobId: 'job-cached',
        jobType: 'quiz_generation',
        createdAt: '2026-04-27T08:00:00.000Z',
        lastKnownStatus: 'processing',
        lastKnownProgress: 60,
      },
    ]);
    mockedAiService.getTeacherJobStatus.mockResolvedValue({
      data: buildJob({ jobId: 'job-from-link' }),
    } as any);
    mockedAiService.getQuizDraftJobResult.mockResolvedValue({
      data: {
        job: {
          jobId: 'job-from-link',
          jobType: 'quiz_generation',
          status: 'completed',
          outputId: 'output-linked',
          assessmentId: 'assessment-1',
        },
        result: {
          outputId: 'output-linked',
          outputType: 'assessment_draft',
          structuredOutput: buildResult(),
        },
      },
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Fractions AI Draft');
    expect(mockedAiService.getTeacherJobStatus).toHaveBeenCalledWith(
      'job-from-link',
    );
    expect(mockedAiService.getTeacherJobStatus).not.toHaveBeenCalledWith(
      'job-cached',
    );
  });

  it('removes a generated question and persists the revised quiz draft', async () => {
    seedTrackedJobs([
      {
        jobId: 'job-1',
        jobType: 'quiz_generation',
        createdAt: '2026-04-24T08:00:00.000Z',
        lastKnownStatus: 'completed',
        lastKnownProgress: 100,
        assessmentId: 'assessment-1',
        updatedAt: '2026-04-24T08:10:00.000Z',
      },
    ]);
    mockedAiService.getTeacherJobStatus.mockResolvedValue({
      data: buildJob(),
    } as any);
    mockedAiService.getQuizDraftJobResult.mockResolvedValue({
      data: {
        job: {
          jobId: 'job-1',
          jobType: 'quiz_generation',
          status: 'completed',
          outputId: 'output-1',
          assessmentId: 'assessment-1',
        },
        result: {
          outputId: 'output-1',
          outputType: 'assessment_draft',
          structuredOutput: buildResult(),
        },
      },
    } as any);
    mockedAiService.updateQuizDraft.mockResolvedValue({
      data: buildJob({ statusMessage: 'Draft saved' }),
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Fractions AI Draft');
    expect(screen.getByText('2 question(s)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove question 1/i }));

    await waitFor(() => {
      expect(mockedAiService.updateQuizDraft).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          structuredOutput: expect.objectContaining({
            questions: [
              expect.objectContaining({
                content:
                  '<p>Fractions can represent equal parts of a whole.</p>',
              }),
            ],
          }),
        }),
      );
    });
    expect(screen.getByText('1 question(s)')).toBeInTheDocument();
    expect(
      screen.queryByText('What is one half of 10?', { exact: false }),
    ).not.toBeInTheDocument();
  });

  it('moves generated questions down and persists the reordered quiz draft', async () => {
    seedTrackedJobs([
      {
        jobId: 'job-1',
        jobType: 'quiz_generation',
        createdAt: '2026-04-24T08:00:00.000Z',
        lastKnownStatus: 'completed',
        lastKnownProgress: 100,
        assessmentId: 'assessment-1',
        updatedAt: '2026-04-24T08:10:00.000Z',
      },
    ]);
    mockedAiService.getTeacherJobStatus.mockResolvedValue({
      data: buildJob(),
    } as any);
    mockedAiService.getQuizDraftJobResult.mockResolvedValue({
      data: {
        job: {
          jobId: 'job-1',
          jobType: 'quiz_generation',
          status: 'completed',
          outputId: 'output-1',
          assessmentId: 'assessment-1',
        },
        result: {
          outputId: 'output-1',
          outputType: 'assessment_draft',
          structuredOutput: buildResult(),
        },
      },
    } as any);
    mockedAiService.updateQuizDraft.mockResolvedValue({
      data: buildJob({ statusMessage: 'Draft saved' }),
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Fractions AI Draft');

    fireEvent.click(screen.getByRole('button', { name: /move question 1 down/i }));

    await waitFor(() => {
      expect(mockedAiService.updateQuizDraft).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          structuredOutput: expect.objectContaining({
            questions: [
              expect.objectContaining({
                content:
                  '<p>Fractions can represent equal parts of a whole.</p>',
              }),
              expect.objectContaining({
                content: '<p>What is one half of 10?</p>',
              }),
            ],
          }),
        }),
      );
    });

    const questionLabels = screen.getAllByText(/Question \d/).map((node) => node.textContent);
    expect(questionLabels).toContain('Question 1');
    expect(questionLabels).toContain('Question 2');
  });

  it('accepts warning issues, saves review state, and applies only after preview', async () => {
    seedTrackedJobs([
      {
        jobId: 'job-1',
        jobType: 'quiz_generation',
        createdAt: '2026-04-24T08:00:00.000Z',
        lastKnownStatus: 'completed',
        lastKnownProgress: 100,
        updatedAt: '2026-04-24T08:10:00.000Z',
      },
    ]);
    const reviewResult = {
      ...buildResult(),
      assessmentId: undefined,
      qualityGate: 'warn',
      reviewRequired: true,
      reviewState: 'needs_review',
      reviewIssues: [
        {
          id: 'issue-1',
          code: 'underfilled_repaired',
          severity: 'warning',
          scope: 'question',
          message: 'Fallback question added.',
          questionIndex: 0,
          optionIndex: null,
          resolved: false,
          resolution: null,
        },
      ],
      questions: buildResult().questions.map((question, index) => ({
        ...question,
        id: `q-${index}`,
        provenance: {
          chunkId: 'chunk-1',
          sourceTitle: 'Fractions',
          sourceSnippet: 'Fractions represent equal parts of a whole.',
        },
        issueIds: index === 0 ? ['issue-1'] : [],
      })),
    };
    mockedAiService.getTeacherJobStatus.mockResolvedValue({
      data: buildJob({ assessmentId: null }),
    } as any);
    mockedAiService.getQuizDraftJobResult.mockResolvedValue({
      data: {
        job: {
          jobId: 'job-1',
          jobType: 'quiz_generation',
          status: 'completed',
          outputId: 'output-1',
          assessmentId: null,
        },
        result: {
          outputId: 'output-1',
          outputType: 'assessment_draft',
          structuredOutput: reviewResult,
        },
      },
    } as any);
    mockedAiService.updateQuizDraft.mockResolvedValue({
      data: buildJob({ statusMessage: 'Draft saved' }),
    } as any);
    mockedAiService.previewQuizDraftApply.mockResolvedValue({
      data: {
        canApply: true,
        alreadyApplied: false,
        blockedReasons: [],
        assessment: {
          title: 'Fractions AI Draft',
          totalPoints: 2,
          questionCount: 2,
        },
      },
    } as any);
    mockedAiService.applyQuizDraft.mockResolvedValue({
      data: {
        jobId: 'job-1',
        outputId: 'output-1',
        alreadyApplied: false,
        applyResult: {
          assessmentId: 'assessment-1',
          questionsCreated: 2,
        },
      },
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Review queue');
    expect(screen.getByRole('button', { name: /apply reviewed draft/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /accept warning/i }));

    await waitFor(() => {
      expect(mockedAiService.updateQuizDraft).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          structuredOutput: expect.objectContaining({
            reviewRequired: false,
            reviewState: 'ready',
          }),
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /apply reviewed draft/i }));
    await screen.findByText('Apply quiz draft?');
    fireEvent.click(screen.getByRole('button', { name: /^apply draft$/i }));

    await waitFor(() => {
      expect(mockedAiService.previewQuizDraftApply).toHaveBeenCalledWith('job-1');
      expect(mockedAiService.applyQuizDraft).toHaveBeenCalledWith('job-1');
    });
    expect(await screen.findByRole('button', { name: /open assessment editor/i })).toBeInTheDocument();
  });

  it('clamps question count to 15 before queueing generation', async () => {
    mockedAiService.getClassIndexStatus.mockResolvedValue({
      data: buildIndexStatus({
        chunksIndexed: 6,
        lessonChunks: 6,
        isStale: false,
        needsReindex: false,
        reason: null,
        readyLessons: [
          {
            lessonId: 'lesson-ready',
            title: 'Fractions',
            chunkCount: 6,
            status: 'indexed',
          },
        ],
        sourceSummary: {
          lessons: { total: 2, ready: 1, blocked: 1 },
          extractions: { total: 1, ready: 0, blocked: 1 },
          questions: {
            assessments: 0,
            assessmentsWithQuestions: 0,
            questionCount: 0,
            needsIndex: 0,
          },
        },
      }),
    } as any);
    mockedAiService.createQuizDraftJob.mockResolvedValue({
      data: buildJob({ status: 'pending', assessmentId: null }),
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Choose the class sources');
    fireEvent.click(screen.getByRole('button', { name: /continue to quiz setup/i }));
    const countInput = screen.getByLabelText(/question count/i);
    fireEvent.change(countInput, { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: /^generate draft$/i }));

    await waitFor(() => {
      expect(mockedAiService.createQuizDraftJob).toHaveBeenCalledWith(
        expect.objectContaining({
          questionCount: 15,
        }),
      );
    });
  });

  it('deletes the current assessment draft and cancels the linked AI job', async () => {
    seedTrackedJobs([
      {
        jobId: 'job-1',
        jobType: 'quiz_generation',
        createdAt: '2026-04-24T08:00:00.000Z',
        lastKnownStatus: 'completed',
        lastKnownProgress: 100,
        assessmentId: 'assessment-1',
        updatedAt: '2026-04-24T08:10:00.000Z',
      },
    ]);
    mockedAiService.getTeacherJobStatus.mockResolvedValue({
      data: buildJob(),
    } as any);
    mockedAiService.getQuizDraftJobResult.mockResolvedValue({
      data: {
        job: {
          jobId: 'job-1',
          jobType: 'quiz_generation',
          status: 'completed',
          outputId: 'output-1',
          assessmentId: 'assessment-1',
        },
        result: {
          outputId: 'output-1',
          outputType: 'assessment_draft',
          structuredOutput: buildResult(),
        },
      },
    } as any);
    mockedAssessmentService.delete.mockResolvedValue({
      success: true,
      message: 'deleted',
    } as any);
    mockedAiService.deleteTeacherJob.mockResolvedValue({
      data: buildJob({ status: 'cancelled', statusMessage: 'Draft removed' }),
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Fractions AI Draft');
    fireEvent.click(screen.getByRole('button', { name: /delete draft/i }));
    await screen.findByText('Delete AI draft assessment?');
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /delete draft/i }));

    await waitFor(() => {
      expect(mockedAssessmentService.delete).toHaveBeenCalledWith('assessment-1');
      expect(mockedAiService.deleteTeacherJob).toHaveBeenCalledWith('job-1');
    });

    expect(screen.getByText('No draft preview yet')).toBeInTheDocument();
  });

  it('shows failed and cancelled tracked states without crashing the page', async () => {
    seedTrackedJobs([
      {
        jobId: 'job-cancelled',
        jobType: 'quiz_generation',
        createdAt: '2026-04-24T08:00:00.000Z',
        lastKnownStatus: 'cancelled',
        lastKnownProgress: 100,
        updatedAt: '2026-04-24T08:05:00.000Z',
      },
      {
        jobId: 'job-failed',
        jobType: 'quiz_generation',
        createdAt: '2026-04-24T08:00:00.000Z',
        lastKnownStatus: 'failed',
        lastKnownProgress: 100,
        updatedAt: '2026-04-24T08:03:00.000Z',
      },
    ]);
    mockedAiService.getTeacherJobStatus.mockResolvedValue({
      data: buildJob({
        jobId: 'job-cancelled',
        status: 'cancelled',
        statusMessage: 'Draft removed',
        assessmentId: null,
      }),
    } as any);

    render(<TeacherAiDraftQuizPage />);

    await screen.findByText('Recent runs');
    expect(screen.getAllByText('cancelled').length).toBeGreaterThan(0);
    expect(screen.getAllByText('failed').length).toBeGreaterThan(0);
    expect(screen.getByText('Draft removed')).toBeInTheDocument();
  });
});

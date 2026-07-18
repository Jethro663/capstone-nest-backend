'use client';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AssessmentEditorPage from './page';
import { assessmentService } from '@/services/assessment-service';
import { academicStateService } from '@/services/academic-state-service';
import { classRecordService } from '@/services/class-record-service';
import { toast } from 'sonner';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'assessment-1' }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/components/shared/rich-text/RichTextEditor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder || 'rich text editor'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

jest.mock('@/components/shared/rich-text/RichTextRenderer', () => ({
  RichTextRenderer: ({ html }: { html: string }) => <div dangerouslySetInnerHTML={{ __html: html }} />,
}));

jest.mock('@/features/assessment-composer/AssessmentQuestionEditor', () => ({
  AssessmentQuestionEditor: ({ question }: { question: { id: string; content: string } }) => (
    <div data-testid={`question-editor-${question.id}`}>{question.content || 'Untitled question'}</div>
  ),
}));

jest.mock('@/components/shared/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getById: jest.fn(),
    update: jest.fn(),
    releaseCore: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
    getQuestionAnalytics: jest.fn(),
    reviewRubric: jest.fn(),
    uploadTeacherAttachment: jest.fn(),
    downloadTeacherAttachment: jest.fn(),
  },
}));

jest.mock('@/services/class-record-service', () => ({
  classRecordService: {
    getByClass: jest.fn(),
    getSlotOverview: jest.fn(),
  },
}));

jest.mock('@/services/academic-state-service', () => ({
  academicStateService: {
    getCurrent: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedAcademicStateService = academicStateService as jest.Mocked<typeof academicStateService>;
const mockedClassRecordService = classRecordService as jest.Mocked<typeof classRecordService>;
const mockedToast = toast as jest.Mocked<typeof toast>;
const LOCAL_DRAFT_KEY = 'teacher-assessment-editor-draft:assessment-1';

function buildAssessment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assessment-1',
    title: 'Fractions Checkpoint',
    description: '',
    classId: 'class-1',
    type: 'quiz',
    passingScore: 74,
    maxAttempts: 1,
    timeLimitMinutes: 30,
    dueDate: '',
    closeWhenDue: false,
    randomizeQuestions: false,
    timedQuestionsEnabled: false,
    questionTimeLimitSeconds: null,
    strictMode: false,
    fileUploadInstructions: '',
    allowedUploadExtensions: ['pdf'],
    allowedUploadMimeTypes: ['application/pdf'],
    maxUploadSizeBytes: 10485760,
    teacherAttachmentFile: null,
    rubricCriteria: [],
    feedbackLevel: 'immediate',
    feedbackDelayHours: 0,
    classRecordCategory: 'written_work',
    quarter: '',
    classRecordPlacement: null,
    isPublished: false,
    questions: [
      {
        id: 'question-1',
        assessmentId: 'assessment-1',
        type: 'multiple_choice',
        content: '<p>What is 1/2 + 1/2?</p>',
        points: 5,
        order: 1,
        isRequired: true,
        options: [
          { id: 'option-1', text: '1', isCorrect: true, order: 1 },
          { id: 'option-2', text: '2', isCorrect: false, order: 2 },
        ],
      },
    ],
    ...overrides,
  };
}

function buildAcademicStateResponse() {
  return {
    success: true,
    message: 'ok',
    data: {
      schoolYear: '2025-2026',
      quarter: 'Q1' as const,
      updatedAt: '2026-05-05T00:00:00.000Z',
      transitionConfirmationText: 'Advance quarter',
    },
  } as Awaited<ReturnType<typeof academicStateService.getCurrent>>;
}

function getQuarterSelect() {
  const select = screen.getAllByRole('combobox').find((element) =>
    element.querySelector('option[value="Q1"]'),
  );

  if (!select) throw new Error('Quarter select was not rendered');
  return select as HTMLSelectElement;
}

describe('AssessmentEditorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();

    mockedAssessmentService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildAssessment(),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);
    mockedAssessmentService.update.mockResolvedValue({
      success: true,
      message: 'saved',
      data: buildAssessment(),
    } as Awaited<ReturnType<typeof assessmentService.update>>);
    mockedAssessmentService.releaseCore.mockResolvedValue({
      success: true,
      message: 'saved',
      data: buildAssessment({ isPublished: true }),
    } as Awaited<ReturnType<typeof assessmentService.releaseCore>>);
    mockedAssessmentService.updateQuestion.mockResolvedValue({
      success: true,
      message: 'saved',
      data: buildAssessment().questions[0],
    } as Awaited<ReturnType<typeof assessmentService.updateQuestion>>);
    mockedAssessmentService.getQuestionAnalytics.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        totalResponses: 0,
        totalAttempts: 0,
        questions: [],
      },
    } as Awaited<ReturnType<typeof assessmentService.getQuestionAnalytics>>);
    mockedAssessmentService.reviewRubric.mockResolvedValue({
      success: true,
      message: 'saved',
      data: buildAssessment({ rubricCriteria: [] }),
    } as Awaited<ReturnType<typeof assessmentService.reviewRubric>>);
    mockedAcademicStateService.getCurrent.mockResolvedValue(buildAcademicStateResponse());
    mockedClassRecordService.getByClass.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'class-record-1',
          classId: 'class-1',
          gradingPeriod: 'Q1',
          status: 'draft',
          categories: [],
        },
      ],
    } as Awaited<ReturnType<typeof classRecordService.getByClass>>);
    mockedClassRecordService.getSlotOverview.mockResolvedValue({
      success: true,
      data: {
        classRecordId: 'class-record-1',
        gradingPeriod: 'Q1',
        status: 'draft',
        categories: [
          {
            id: 'category-1',
            key: 'written_work',
            label: 'Written Work',
            slots: [
              {
                itemId: 'slot-1',
                title: 'Written Work 1',
                order: 1,
                maxScore: 20,
                assessmentId: null,
                assessmentTitle: null,
                scoreCount: 0,
                status: 'empty',
                isSelectable: true,
              },
            ],
          },
        ],
      },
    } as Awaited<ReturnType<typeof classRecordService.getSlotOverview>>);

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      writable: true,
      value: jest.fn(),
    });
  });

  it('renders a direct, compact workbar before question content and advanced panels', async () => {
    render(<AssessmentEditorPage />);

    expect(await screen.findByDisplayValue('Fractions Checkpoint')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Assessment title')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Back to assessments' })).toBeInTheDocument();
    expect(screen.queryByText('Assessment name')).not.toBeInTheDocument();
    expect(screen.queryByText('Editable')).not.toBeInTheDocument();

    const publishControls = screen.getByRole('group', {
      name: 'Assessment publishing controls',
    });
    expect(within(publishControls).getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    expect(within(publishControls).getByRole('button', { name: 'Draft' })).toBeInTheDocument();
    expect(
      within(publishControls).getByRole('button', { name: 'Ready to give' }),
    ).toBeInTheDocument();
    expect(within(publishControls).getByRole('button', { name: 'Save now' })).toBeInTheDocument();

    const workbarMeta = screen.getByLabelText('Assessment status');
    expect(workbarMeta).toHaveTextContent(/saved|unsaved|saving|retry needed/i);
    expect(workbarMeta).not.toHaveClass('rounded-full');
    expect(screen.getByLabelText('Assessment context')).toHaveTextContent('Quarter Q1');

    const warningButton = screen.getByRole('button', { name: /view .* setup issues?/i });
    expect(within(warningButton).getByText(/setup issues?/i)).toBeVisible();

    const firstQuestion = screen.getByTestId('question-editor-question-1');
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    const advancedField = (await screen.findAllByText('Time Limit (minutes)'))[0];
    expect(
      firstQuestion.compareDocumentPosition(advancedField) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('opens the helper guide from the question mark button', async () => {
    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /assessment help/i }));

    expect(await screen.findByText('Teacher guide: Assessment Setup Workspace')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Start with the top-right controls')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Build the learner activity')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));

    await waitFor(() => {
      expect(
        screen.queryByText('Teacher guide: Assessment Setup Workspace'),
      ).not.toBeInTheDocument();
    });
  });

  it('shows the setup warning checklist and focuses the selected section', async () => {
    mockedAssessmentService.getById.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: buildAssessment({
        title: '',
        questions: [],
      }),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByPlaceholderText('Untitled assessment')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /view .* setup issues/i }));

    expect(await screen.findByText('Assessment setup checklist')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Add an assessment title')).toBeInTheDocument();
    expect(within(dialog).getByText('Add at least one question')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /open build content/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: /build content/i }),
      ).toHaveFocus();
    });
  });

  it('blocks publishing until class record setup is complete', async () => {
    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /manual slot/i })[0]);

    fireEvent.click(screen.getAllByRole('button', { name: /ready to give/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /save now/i }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Complete class record setup before publishing this assessment',
      );
    });
    expect(mockedAssessmentService.update).not.toHaveBeenCalled();
  });

  it('publishes core assessments through the dedicated release endpoint after saving settings', async () => {
    mockedAssessmentService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: buildAssessment({
        isCoreTemplateAsset: true,
        quarter: 'Q1',
        classRecordItemId: 'slot-1',
        classRecordPlacement: {
          category: 'written_work',
          gradingPeriod: 'Q1',
          itemId: 'slot-1',
          placementMode: 'manual',
        },
      }),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /ready to give/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /save now/i }));

    await waitFor(() => {
      expect(mockedAssessmentService.releaseCore).toHaveBeenCalledWith('assessment-1', {
        isPublished: true,
      });
    });

    expect(mockedAssessmentService.update).toHaveBeenCalled();
    const updatePayload = mockedAssessmentService.update.mock.calls[0]?.[1] as
      | Record<string, unknown>
      | undefined;
    expect(updatePayload).toBeDefined();
    expect(updatePayload).not.toHaveProperty('isPublished');
    expect(mockedAssessmentService.updateQuestion).not.toHaveBeenCalled();
  });

  it('sanitizes advanced numeric inputs and constrains passing score choices', async () => {
    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);

    const timeLimitField = screen.getAllByText('Time Limit (minutes)')[0].parentElement as HTMLElement;
    const passingScoreField = screen.getAllByText('Passing Score (%)')[0].parentElement as HTMLElement;
    const maxAttemptsField = screen.getAllByText('Max Attempts')[0].parentElement as HTMLElement;

    const timeLimitInput = within(timeLimitField).getByRole('textbox');
    const passingScoreSelect = within(passingScoreField).getByRole('combobox');
    const maxAttemptsInput = within(maxAttemptsField).getByRole('textbox');

    fireEvent.change(timeLimitInput, { target: { value: '0012' } });
    expect(timeLimitInput).toHaveValue('12');

    fireEvent.change(timeLimitInput, { target: { value: '1000' } });
    expect(timeLimitInput).toHaveValue('999');

    fireEvent.change(timeLimitInput, { target: { value: '000' } });
    expect(timeLimitInput).toHaveValue('');
    fireEvent.blur(timeLimitInput);
    expect(timeLimitInput).toHaveValue('30');

    const passingScoreOptions = within(passingScoreSelect).getAllByRole('option');
    expect(passingScoreOptions).toHaveLength(51);
    expect(passingScoreOptions[0]).toHaveValue('50');
    expect(passingScoreOptions[50]).toHaveValue('100');

    fireEvent.change(passingScoreSelect, { target: { value: '88' } });
    expect(passingScoreSelect).toHaveValue('88');

    fireEvent.change(maxAttemptsInput, { target: { value: '009' } });
    expect(maxAttemptsInput).toHaveValue('9');

    fireEvent.change(maxAttemptsInput, { target: { value: '100' } });
    expect(maxAttemptsInput).toHaveValue('99');

    fireEvent.change(maxAttemptsInput, { target: { value: '0' } });
    expect(maxAttemptsInput).toHaveValue('');
    fireEvent.blur(maxAttemptsInput);
    expect(maxAttemptsInput).toHaveValue('1');
  });

  it('locks the class record quarter to the current academic quarter', async () => {
    mockedAssessmentService.getById.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: buildAssessment({
        quarter: 'Q3',
      }),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);

    const quarterSelect = getQuarterSelect();
    expect(quarterSelect).toHaveValue('Q1');
    expect(quarterSelect).toBeDisabled();
  });

  it('treats a missing quarter workbook as setup guidance without requesting its slot resource', async () => {
    mockedClassRecordService.getByClass.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);

    expect(
      await screen.findByText('Create the Q1 class record workbook before choosing a slot.'),
    ).toBeInTheDocument();
    expect(mockedClassRecordService.getSlotOverview).not.toHaveBeenCalled();
  });

  it('keeps quarter and publish controls unavailable until the system quarter is verified', async () => {
    let resolveQuarter!: (
      value: Awaited<ReturnType<typeof academicStateService.getCurrent>>,
    ) => void;
    mockedAcademicStateService.getCurrent.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveQuarter = resolve;
      }),
    );

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);

    expect(getQuarterSelect()).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /ready to give/i })[0]).toBeDisabled();

    resolveQuarter(buildAcademicStateResponse());

    await waitFor(() => {
      expect(getQuarterSelect()).toHaveValue('Q1');
    });
    expect(screen.getAllByRole('button', { name: /ready to give/i })[0]).toBeEnabled();
  });

  it('shows safe retryable quarter verification failure without exposing the error', async () => {
    mockedAcademicStateService.getCurrent.mockRejectedValueOnce(
      new Error('forbidden quarter detail'),
    );

    render(<AssessmentEditorPage />);

    expect(
      await screen.findByText('Current quarter could not be verified'),
    ).toBeInTheDocument();
    expect(screen.queryByText('forbidden quarter detail')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /ready to give/i })[0]).toBeDisabled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);
    expect(getQuarterSelect()).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /retry quarter check/i }));

    await waitFor(() => {
      expect(mockedAcademicStateService.getCurrent).toHaveBeenCalledTimes(2);
      expect(getQuarterSelect()).toHaveValue('Q1');
    });
    expect(
      screen.queryByText('Current quarter could not be verified'),
    ).not.toBeInTheDocument();
  });

  it('allows a persisted draft to save when quarter verification is unavailable', async () => {
    mockedAcademicStateService.getCurrent.mockRejectedValueOnce(new Error('network detail'));
    mockedAssessmentService.getById.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: buildAssessment({ quarter: 'Q3' }),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);

    render(<AssessmentEditorPage />);

    expect(
      await screen.findByText('Current quarter could not be verified'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save now/i }));

    await waitFor(() => {
      expect(mockedAssessmentService.update).toHaveBeenCalledTimes(1);
    });
    expect(mockedAssessmentService.update.mock.calls[0]?.[1]).toMatchObject({
      quarter: 'Q3',
      isPublished: false,
    });
  });

  it('blocks release requests when quarter verification is unavailable', async () => {
    mockedAcademicStateService.getCurrent.mockRejectedValueOnce(new Error('network detail'));
    mockedAssessmentService.getById.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: buildAssessment({
        isPublished: true,
        quarter: 'Q3',
      }),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);

    render(<AssessmentEditorPage />);

    expect(
      await screen.findByText('Current quarter could not be verified'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save now/i })).toBeDisabled();
    expect(mockedAssessmentService.update).not.toHaveBeenCalled();
    expect(mockedAssessmentService.releaseCore).not.toHaveBeenCalled();
  });

  it('swaps the setup rules for file upload mode', async () => {
    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /file upload assessment/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /view .* setup issues/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Add upload instructions')).toBeInTheDocument();
    expect(within(dialog).queryByText('Add at least one question')).not.toBeInTheDocument();
  });

  it('simplifies advanced settings for file upload mode and fixes scoring to 100 points', async () => {
    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /file upload assessment/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);

    expect(screen.getByText('Score is always 100 for file upload assessments.')).toBeInTheDocument();
    expect(screen.getByText('No rubric yet. Teachers will grade the latest submission out of 100.')).toBeInTheDocument();
    expect(screen.queryByText('Time Limit (minutes)')).not.toBeInTheDocument();
    expect(screen.queryByText('Passing Score (%)')).not.toBeInTheDocument();
    expect(screen.queryByText('Max Attempts')).not.toBeInTheDocument();
    expect(screen.queryByText('Randomize questions and options per student')).not.toBeInTheDocument();
    expect(screen.queryByText('Enable per-question timer')).not.toBeInTheDocument();
    expect(screen.queryByText('Strict no-return policy for previous questions')).not.toBeInTheDocument();

    const classRecordHeading = screen.getByText('Class record setup');
    const feedbackLabel = screen.getByText('Result Release');
    expect(
      Boolean(
        classRecordHeading.compareDocumentPosition(feedbackLabel)
        & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);

    expect(screen.getByLabelText(/total score 100 points/i)).toBeInTheDocument();
    expect(screen.getByText('Close assessment when due date passes')).toBeInTheDocument();
  });

  it('treats answer choices with attached images as filled', async () => {
    mockedAssessmentService.getById.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: buildAssessment({
        questions: [
          {
            id: 'question-1',
            assessmentId: 'assessment-1',
            type: 'multiple_choice',
            content: '<p>What is 1/2 + 1/2?</p>',
            points: 5,
            order: 1,
            isRequired: true,
            options: [
              {
                id: 'option-1',
                text: '',
                imageUrl: '/api/assessments/questions/images/choice.png',
                isCorrect: true,
                order: 1,
              },
              { id: 'option-2', text: '2', isCorrect: false, order: 2 },
            ],
          },
        ],
      }),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /view .* setup issues/i }));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByText('Question 1 has empty answer choices'),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText('Assessment setup checklist')).toBeInTheDocument();
  });

  it('flags invalid question setup in question mode', async () => {
    mockedAssessmentService.getById.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: buildAssessment({
        questions: [
          {
            id: 'question-1',
            assessmentId: 'assessment-1',
            type: 'multiple_choice',
            content: '',
            points: 5,
            order: 1,
            isRequired: true,
            options: [{ id: 'option-1', text: '', isCorrect: true, order: 1 }],
          },
        ],
      }),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /view .* setup issues/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Question 1 is empty')).toBeInTheDocument();
  });

  it('keeps rubric points within 100 and requires an exact total before saving', async () => {
    mockedAssessmentService.reviewRubric.mockResolvedValueOnce({
      success: true,
      message: 'saved',
      data: {
        rubricCriteria: [
          { id: 'criterion-1', title: 'Accuracy', description: 'Correctness', points: 51 },
          { id: 'criterion-2', title: 'Clarity', description: 'Readable work', points: 49 },
        ],
      },
    } as Awaited<ReturnType<typeof assessmentService.reviewRubric>>);

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /file upload assessment/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /rubric/i }));
    fireEvent.click(screen.getByRole('button', { name: /add row/i }));
    fireEvent.click(screen.getByRole('button', { name: /add row/i }));

    const titleInputs = screen.getAllByPlaceholderText('Criterion title');
    const pointsInputs = screen.getAllByPlaceholderText('Points');

    fireEvent.change(titleInputs[0], { target: { value: 'Accuracy' } });
    fireEvent.change(titleInputs[1], { target: { value: 'Clarity' } });
    const rubricMeter = screen.getByText('Rubric total').closest('div')?.parentElement as HTMLElement;

    fireEvent.change(pointsInputs[0], { target: { value: '051' } });
    expect(pointsInputs[0]).toHaveValue('51');
    expect(rubricMeter.textContent).toContain('51/100');
    expect(screen.getByText('49 points left to assign.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save rubric/i })).toBeDisabled();

    fireEvent.change(pointsInputs[1], { target: { value: '99' } });
    expect(pointsInputs[1]).toHaveValue('49');
    expect(rubricMeter.textContent).toContain('100/100');
    expect(screen.getByText('Ready for file upload scoring.')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /save rubric/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockedAssessmentService.reviewRubric).toHaveBeenCalledWith('assessment-1', [
        { id: expect.any(String), title: 'Accuracy', description: undefined, points: 51 },
        { id: expect.any(String), title: 'Clarity', description: undefined, points: 49 },
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: /add row/i }));
    const updatedTitleInputs = screen.getAllByPlaceholderText('Criterion title');
    const updatedPointsInputs = screen.getAllByPlaceholderText('Points');
    fireEvent.change(updatedTitleInputs[2], { target: { value: 'Presentation' } });
    fireEvent.change(updatedPointsInputs[2], { target: { value: '1' } });
    expect(updatedPointsInputs[2]).toHaveValue('0');
  });

  it('reorders question cards with the move up and move down buttons', async () => {
    mockedAssessmentService.getById.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: buildAssessment({
        questions: [
          {
            id: 'question-1',
            assessmentId: 'assessment-1',
            type: 'multiple_choice',
            content: '<p>First question</p>',
            points: 5,
            order: 1,
            isRequired: true,
            options: [{ id: 'option-1', text: 'A', isCorrect: true, order: 1 }],
          },
          {
            id: 'question-2',
            assessmentId: 'assessment-1',
            type: 'multiple_choice',
            content: '<p>Second question</p>',
            points: 5,
            order: 2,
            isRequired: true,
            options: [{ id: 'option-2', text: 'B', isCorrect: true, order: 1 }],
          },
        ],
      }),
    } as Awaited<ReturnType<typeof assessmentService.getById>>);

    const { container } = render(<AssessmentEditorPage />);

    await screen.findByText('Second question');

    expect(screen.getByRole('button', { name: /move question 1 up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move question 2 down/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /move question 1 down/i }));

    const articlesAfterMoveDown = Array.from(container.querySelectorAll('article'));
    expect(articlesAfterMoveDown[0]).toHaveTextContent('Second question');
    expect(articlesAfterMoveDown[1]).toHaveTextContent('First question');

    fireEvent.click(screen.getByRole('button', { name: /move question 2 up/i }));

    const articlesAfterMoveUp = Array.from(container.querySelectorAll('article'));
    expect(articlesAfterMoveUp[0]).toHaveTextContent('First question');
    expect(articlesAfterMoveUp[1]).toHaveTextContent('Second question');
  });

  it('writes a local draft snapshot while the teacher edits', async () => {
    render(<AssessmentEditorPage />);

    const titleInput = (await screen.findAllByDisplayValue('Fractions Checkpoint'))[0];
    fireEvent.change(titleInput, { target: { value: 'Fractions Checkpoint Updated' } });

    await waitFor(() => {
      const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw as string)).toMatchObject({
        title: 'Fractions Checkpoint Updated',
      });
    });
  });

  it('restores an unsaved local draft after reload instead of dropping question work', async () => {
    window.localStorage.setItem(
      LOCAL_DRAFT_KEY,
      JSON.stringify({
        title: 'Recovered checkpoint',
        description: '',
        questions: [
          {
            id: 'temp-question-1',
            type: 'multiple_choice',
            content: 'Recovered unsaved question',
            points: 5,
            isRequired: true,
            explanation: '',
            imageUrl: '',
            imageDisplayMode: 'default',
            imageZoom: 100,
            imagePositionX: 50,
            imagePositionY: 50,
            conceptTags: [],
            fillBlankSmartCaseInsensitive: true,
            fillBlankExperimentalSmartMatch: false,
            options: [
              { id: 'temp-option-1', text: 'Recovered option', isCorrect: true, order: 1 },
              { id: 'temp-option-2', text: 'Other option', isCorrect: false, order: 2 },
            ],
          },
        ],
        selectedQuestionId: 'temp-question-1',
        deletedQuestionIds: ['question-1'],
        availability: 'draft',
        resultReleaseMode: 'score_immediately',
        assessmentType: 'quiz',
        passingScore: 74,
        maxAttempts: '1',
        timeLimitMinutes: '30',
        dueDate: '',
        feedbackDelayHours: 0,
        category: 'written_work',
        quarter: '',
        placementMode: 'automatic',
        selectedSlotId: null,
        closeWhenDue: false,
        randomizeQuestions: false,
        timedQuestionsEnabled: false,
        questionTimeLimitSeconds: '',
        strictMode: false,
        fileUploadInstructions: '',
        allowedUploadExtensions: ['pdf'],
        allowedUploadMimeTypes: ['application/pdf'],
        maxUploadSizeBytes: 10485760,
        teacherAttachmentFile: null,
        rubricCriteria: [],
      }),
    );

    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Recovered checkpoint')).length).toBeGreaterThan(0);
    expect(screen.getByText('Recovered unsaved question')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Recovered unsaved assessment draft from this device',
      );
    });
  });
});

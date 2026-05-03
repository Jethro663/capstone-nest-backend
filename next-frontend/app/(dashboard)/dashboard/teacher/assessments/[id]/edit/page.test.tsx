'use client';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AssessmentEditorPage from './page';
import { assessmentService } from '@/services/assessment-service';
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
    getSlotOverview: jest.fn(),
  },
}));

const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedClassRecordService = classRecordService as jest.Mocked<typeof classRecordService>;
const mockedToast = toast as jest.Mocked<typeof toast>;

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

describe('AssessmentEditorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
      data: {
        rubricCriteria: [],
      },
    } as Awaited<ReturnType<typeof assessmentService.reviewRubric>>);
    mockedClassRecordService.getSlotOverview.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        categories: [
          {
            key: 'written_work',
            label: 'Written Work',
            slots: [
              {
                itemId: 'slot-1',
                title: 'Written Work 1',
                maxScore: 20,
                status: 'available',
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

  it('opens the helper guide from the question mark button', async () => {
    render(<AssessmentEditorPage />);

    expect((await screen.findAllByDisplayValue('Fractions Checkpoint')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /module help/i }));

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

    fireEvent.click(screen.getAllByRole('button', { name: /ready to give/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /save now/i }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Complete class record setup before publishing this assessment',
      );
    });
    expect(mockedAssessmentService.update).not.toHaveBeenCalled();
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

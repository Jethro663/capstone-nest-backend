'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AssessmentQuestionEditor } from './AssessmentQuestionEditor';
import type { AssessmentComposerQuestionDraft } from './types';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('@/components/shared/rich-text/RichTextEditor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
    className,
    maxLength,
    toolbarActions,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    maxLength?: number;
    toolbarActions?: React.ReactNode;
  }) => (
    <div>
      {toolbarActions}
      <textarea
        aria-label={placeholder || 'rich text editor'}
        className={className}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  ),
}));

const baseQuestion: AssessmentComposerQuestionDraft = {
  id: 'question-1',
  type: 'multiple_choice',
  content: 'Question',
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
    {
      id: 'option-1',
      text: 'Option 1',
      isCorrect: true,
      order: 1,
      imageUrl: '',
      imageDisplayMode: 'default',
      imageZoom: 100,
      imagePositionX: 50,
      imagePositionY: 50,
    },
    {
      id: 'option-2',
      text: 'Option 2',
      isCorrect: false,
      order: 2,
      imageUrl: '',
      imageDisplayMode: 'default',
      imageZoom: 100,
      imagePositionX: 50,
      imagePositionY: 50,
    },
  ],
};

function Harness({
  onUploadQuestionImage = jest.fn(),
  onUploadOptionImage = jest.fn(),
  initialQuestion = baseQuestion,
}: {
  onUploadQuestionImage?: (questionId: string, file: File) => void | Promise<void>;
  onUploadOptionImage?: (questionId: string, optionId: string, file: File) => void | Promise<void>;
  initialQuestion?: AssessmentComposerQuestionDraft;
}) {
  const [questions, setQuestions] = useState<AssessmentComposerQuestionDraft[]>([initialQuestion]);

  return (
    <AssessmentQuestionEditor
      question={questions[0]}
      questions={questions}
      onQuestionsChange={setQuestions}
      onUploadQuestionImage={onUploadQuestionImage}
      onUploadOptionImage={onUploadOptionImage}
    />
  );
}

describe('AssessmentQuestionEditor', () => {
  const mockedToast = toast as jest.Mocked<typeof toast>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the flatter choice layout and keeps core interactions working', () => {
    render(<Harness />);

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /question/i })).toHaveAttribute('maxLength', '1500');
    expect(screen.queryByRole('checkbox', { name: /required/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more options/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add image to question/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add image to option 1/i })).toBeInTheDocument();
    expect(screen.queryByText(/^Image$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Add image')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Option 1')).toHaveAttribute('maxLength', '400');

    fireEvent.change(screen.getByPlaceholderText('Option 2'), {
      target: { value: 'Updated option 2' },
    });
    expect(screen.getByDisplayValue('Updated option 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add option/i }));
    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '8' } });
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('8'), { target: { value: '120' } });
    expect(screen.getByDisplayValue('99')).toBeInTheDocument();

    const pointsInput = screen.getByDisplayValue('99');
    fireEvent.change(pointsInput, { target: { value: '' } });
    expect(pointsInput).toHaveValue('');

    fireEvent.blur(pointsInput);
    expect(screen.getByDisplayValue('99')).toBeInTheDocument();
  });

  it('routes question and option image uploads through the provided callbacks', async () => {
    const onUploadQuestionImage = jest.fn();
    const onUploadOptionImage = jest.fn();
    render(
      <Harness
        onUploadQuestionImage={onUploadQuestionImage}
        onUploadOptionImage={onUploadOptionImage}
      />,
    );

    const questionFile = new File(['question'], 'question.png', { type: 'image/png' });
    const optionFile = new File(['option'], 'option.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('Upload question image'), {
      target: { files: [questionFile] },
    });
    fireEvent.change(screen.getByLabelText('Upload image for option 1'), {
      target: { files: [optionFile] },
    });

    await waitFor(() => {
      expect(onUploadQuestionImage).toHaveBeenCalledWith('question-1', questionFile);
      expect(onUploadOptionImage).toHaveBeenCalledWith('question-1', 'option-1', optionFile);
    });
  });

  it('rejects non-image uploads before calling the upload callbacks', async () => {
    const onUploadQuestionImage = jest.fn();
    const onUploadOptionImage = jest.fn();
    render(
      <Harness
        onUploadQuestionImage={onUploadQuestionImage}
        onUploadOptionImage={onUploadOptionImage}
      />,
    );

    const invalidFile = new File(['print("nope")'], 'script.py', {
      type: 'text/x-python',
    });

    fireEvent.change(screen.getByLabelText('Upload question image'), {
      target: { files: [invalidFile] },
    });
    fireEvent.change(screen.getByLabelText('Upload image for option 1'), {
      target: { files: [invalidFile] },
    });

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Upload a JPG, PNG, GIF, or WEBP image.',
      );
    });
    expect(onUploadQuestionImage).not.toHaveBeenCalled();
    expect(onUploadOptionImage).not.toHaveBeenCalled();
  });

  it('shows image controls and updates image display state inside the editor', () => {
    function ImageHarness() {
      const [questions, setQuestions] = useState<AssessmentComposerQuestionDraft[]>([
        {
          ...baseQuestion,
          imageUrl: '/api/assessments/questions/images/question.png',
          imagePositionX: 30,
          imagePositionY: 75,
          options: [
            {
              ...baseQuestion.options[0],
              imageUrl: '/api/assessments/questions/images/option.png',
              imagePositionX: 15,
              imagePositionY: 60,
            },
            baseQuestion.options[1],
          ],
        },
      ]);

      return (
        <AssessmentQuestionEditor
          question={questions[0]}
          questions={questions}
          onQuestionsChange={setQuestions}
        />
      );
    }

    render(<ImageHarness />);

    fireEvent.click(screen.getAllByRole('button', { name: /expand image/i })[0]);
    expect(screen.getAllByText(/expanded/i)[0]).toBeInTheDocument();
    expect(screen.getByAltText('Question image')).toHaveStyle({
      objectPosition: '30% 75%',
    });

    fireEvent.click(screen.getAllByRole('button', { name: /zoom in image/i })[0]);
    expect(screen.getAllByText(/110%/i)[0]).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /delete image/i })[1]);
    expect(screen.queryByAltText('Option 1 image')).not.toBeInTheDocument();
  });

  it('locks true or false questions to fixed true and false options', async () => {
    render(<Harness />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'true_false' },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('True')).toBeInTheDocument();
      expect(screen.getByDisplayValue('False')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /add option/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete option 1/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete option 2/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add image to option 1/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add image to option 2/i })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('True')).toHaveAttribute('readOnly');
    expect(screen.getByDisplayValue('False')).toHaveAttribute('readOnly');
  });

  it('resets true or false options when switching into another option-based question type', async () => {
    render(<Harness />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'true_false' },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('True')).toBeInTheDocument();
      expect(screen.getByDisplayValue('False')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'multiple_choice' },
    });

    await waitFor(() => {
      expect(screen.queryByDisplayValue('True')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('False')).not.toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Option 1')).toHaveValue('');
    expect(screen.getByPlaceholderText('Option 2')).toHaveValue('');

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'multiple_select' },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Option 1')).toHaveValue('');
      expect(screen.getByPlaceholderText('Option 2')).toHaveValue('');
    });
  });

  it('normalizes malformed existing true or false questions back to fixed options', async () => {
    render(
      <Harness
        initialQuestion={{
          ...baseQuestion,
          type: 'true_false',
          options: [
            { ...baseQuestion.options[0], text: 'Yes', isCorrect: true, order: 3 },
            { ...baseQuestion.options[1], text: 'No', isCorrect: false, order: 4 },
            {
              id: 'option-3',
              text: 'Maybe',
              isCorrect: false,
              order: 5,
              imageUrl: '',
              imageDisplayMode: 'default',
              imageZoom: 100,
              imagePositionX: 50,
              imagePositionY: 50,
            },
          ],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('True')).toBeInTheDocument();
      expect(screen.getByDisplayValue('False')).toBeInTheDocument();
    });

    expect(screen.queryByDisplayValue('Yes')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('No')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Maybe')).not.toBeInTheDocument();
  });
});

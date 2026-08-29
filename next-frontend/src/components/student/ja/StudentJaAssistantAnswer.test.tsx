import { fireEvent, render, screen } from '@testing-library/react';
import { StudentJaAssistantAnswer } from './StudentJaAssistantAnswer';

describe('StudentJaAssistantAnswer', () => {
  it('renders a structured reading surface with evidence and fixed follow-ups', () => {
    const onAction = jest.fn();

    render(
      <StudentJaAssistantAnswer
        message={{
          id: 'assistant-1',
          role: 'assistant',
          content: '## Main idea\nFractions name equal parts.\n\n## Try this now\n- Show one half.',
          blocked: false,
          citations: [
            {
              lessonTitle: 'Equivalent Fractions',
              sourceType: 'lesson_block',
              chunkText: 'Equivalent fractions represent the same value.',
            },
          ],
        }}
        actions={[{ id: 'explain-simpler', label: 'Explain simpler' }]}
        disabled={false}
        onAction={onAction}
      />,
    );

    expect(screen.getByText('Main idea').closest('.ja-answer-surface')).toBeInTheDocument();
    expect(screen.getByText('Grounded')).toBeInTheDocument();
    expect(screen.getByText('From your class')).toBeInTheDocument();
    expect(screen.getByText('Equivalent fractions represent the same value.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Explain simpler' }));
    expect(onAction).toHaveBeenCalledWith({ id: 'explain-simpler', label: 'Explain simpler' });
  });

  it('uses warning treatment for guarded replies and disables follow-ups', () => {
    render(
      <StudentJaAssistantAnswer
        message={{
          id: 'assistant-guarded',
          role: 'assistant',
          content: '## Watch out\nI cannot provide an answer key.',
          blocked: true,
          citations: [],
        }}
        actions={[{ id: 'quiz-me', label: 'Quiz me' }]}
        disabled
        onAction={jest.fn()}
      />,
    );

    expect(screen.getByText('Guarded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quiz me' })).toBeDisabled();
  });
});

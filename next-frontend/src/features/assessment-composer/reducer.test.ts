import {
  createAssessmentComposerQuestion,
  duplicateAssessmentComposerQuestion,
  reorderAssessmentComposerQuestions,
  updateAssessmentComposerQuestion,
  deleteAssessmentComposerQuestion,
  getAssessmentComposerQuestionPreview,
} from './reducer';
import type { AssessmentComposerQuestionDraft } from './types';

function makeQuestion(overrides: Partial<AssessmentComposerQuestionDraft> = {}): AssessmentComposerQuestionDraft {
  return {
    id: overrides.id ?? 'question-1',
    type: overrides.type ?? 'multiple_choice',
    content: overrides.content ?? 'What is 2 + 2?',
    points: overrides.points ?? 5,
    isRequired: overrides.isRequired ?? true,
    explanation: overrides.explanation ?? '',
    imageUrl: overrides.imageUrl ?? '',
    conceptTags: overrides.conceptTags ?? [],
    fillBlankSmartCaseInsensitive: overrides.fillBlankSmartCaseInsensitive ?? true,
    fillBlankExperimentalSmartMatch: overrides.fillBlankExperimentalSmartMatch ?? false,
    options: overrides.options ?? [
      { id: 'option-1', text: '3', isCorrect: false, order: 1 },
      { id: 'option-2', text: '4', isCorrect: true, order: 2 },
    ],
    isNew: overrides.isNew ?? false,
  };
}

describe('assessment composer reducer helpers', () => {
  it('creates a new choice question with default options and required state', () => {
    const question = createAssessmentComposerQuestion('multiple_choice');

    expect(question.type).toBe('multiple_choice');
    expect(question.points).toBe(5);
    expect(question.isRequired).toBe(true);
    expect(question.options).toHaveLength(2);
    expect(question.options[0]?.order).toBe(1);
  });

  it('duplicates a question with fresh ids and sequential option order', () => {
    const duplicate = duplicateAssessmentComposerQuestion(makeQuestion());

    expect(duplicate.id).not.toBe('question-1');
    expect(duplicate.isNew).toBe(true);
    expect(duplicate.options).toHaveLength(2);
    expect(duplicate.options[0]?.id).not.toBe('option-1');
    expect(duplicate.options[0]?.order).toBe(1);
    expect(duplicate.options[1]?.order).toBe(2);
  });

  it('reorders questions by source and destination index', () => {
    const reordered = reorderAssessmentComposerQuestions(
      [makeQuestion({ id: 'question-1' }), makeQuestion({ id: 'question-2' }), makeQuestion({ id: 'question-3' })],
      0,
      2,
    );

    expect(reordered.map((question) => question.id)).toEqual(['question-2', 'question-3', 'question-1']);
  });

  it('updates a question in place with the provided updater', () => {
    const questions = [makeQuestion(), makeQuestion({ id: 'question-2', content: 'Original' })];

    const updated = updateAssessmentComposerQuestion(questions, 'question-2', (question) => ({
      ...question,
      content: 'Updated',
      points: 10,
    }));

    expect(updated[1]?.content).toBe('Updated');
    expect(updated[1]?.points).toBe(10);
    expect(updated[0]?.content).toBe('What is 2 + 2?');
  });

  it('deletes a question and returns the next selected id', () => {
    const result = deleteAssessmentComposerQuestion(
      [makeQuestion({ id: 'question-1' }), makeQuestion({ id: 'question-2' })],
      'question-1',
      'question-1',
    );

    expect(result.questions.map((question) => question.id)).toEqual(['question-2']);
    expect(result.nextSelectedQuestionId).toBe('question-2');
  });

  it('builds a human-readable preview for empty and filled questions', () => {
    expect(getAssessmentComposerQuestionPreview(makeQuestion({ content: '  ' }))).toBe('Untitled question');
    expect(getAssessmentComposerQuestionPreview(makeQuestion({ content: 'Explain the water cycle in brief.' }))).toBe(
      'Explain the water cycle in brief.',
    );
  });
});

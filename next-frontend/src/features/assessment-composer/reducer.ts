import type { QuestionType } from '@/utils/constants';
import type { AssessmentComposerOptionDraft, AssessmentComposerQuestionDraft } from './types';

function createTempId() {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

export function supportsAssessmentComposerOptions(type: QuestionType) {
  return (
    type === 'multiple_choice' ||
    type === 'multiple_select' ||
    type === 'true_false' ||
    type === 'dropdown'
  );
}

function createDefaultOptionsForType(type: QuestionType): AssessmentComposerOptionDraft[] {
  if (type === 'true_false') {
    return [
      { id: createTempId(), text: 'True', isCorrect: false, order: 1 },
      { id: createTempId(), text: 'False', isCorrect: false, order: 2 },
    ];
  }

  return [
    { id: createTempId(), text: '', isCorrect: false, order: 1 },
    { id: createTempId(), text: '', isCorrect: false, order: 2 },
  ];
}

export function createAssessmentComposerQuestion(
  type: QuestionType,
  points = 5,
): AssessmentComposerQuestionDraft {
  return {
    id: createTempId(),
    type,
    content: '',
    points,
    isRequired: true,
    explanation: '',
    imageUrl: '',
    options: supportsAssessmentComposerOptions(type) ? createDefaultOptionsForType(type) : [],
    isNew: true,
  };
}

export function duplicateAssessmentComposerQuestion(
  question: AssessmentComposerQuestionDraft,
): AssessmentComposerQuestionDraft {
  return {
    ...question,
    id: createTempId(),
    isNew: true,
    options: question.options.map((option, index) => ({
      ...option,
      id: createTempId(),
      order: index + 1,
    })),
  };
}

export function reorderAssessmentComposerQuestions(
  questions: AssessmentComposerQuestionDraft[],
  fromIndex: number,
  toIndex: number,
) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= questions.length ||
    toIndex >= questions.length ||
    fromIndex === toIndex
  ) {
    return questions;
  }

  const next = [...questions];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return questions;
  next.splice(toIndex, 0, moved);
  return next;
}

export function updateAssessmentComposerQuestion(
  questions: AssessmentComposerQuestionDraft[],
  questionId: string,
  updater: (question: AssessmentComposerQuestionDraft) => AssessmentComposerQuestionDraft,
) {
  return questions.map((question) => (question.id === questionId ? updater(question) : question));
}

export function deleteAssessmentComposerQuestion(
  questions: AssessmentComposerQuestionDraft[],
  questionId: string,
  selectedQuestionId: string | null,
) {
  const nextQuestions = questions.filter((question) => question.id !== questionId);
  return {
    questions: nextQuestions,
    nextSelectedQuestionId:
      selectedQuestionId === questionId ? (nextQuestions[0]?.id ?? null) : selectedQuestionId,
  };
}

export function getAssessmentComposerQuestionPreview(question: AssessmentComposerQuestionDraft) {
  const preview = question.content.trim();
  return preview || 'Untitled question';
}

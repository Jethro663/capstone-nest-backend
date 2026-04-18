import type { QuestionType } from '@/utils/constants';

export interface AssessmentComposerOptionDraft {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface AssessmentComposerQuestionDraft {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  isRequired: boolean;
  explanation: string;
  imageUrl: string;
  options: AssessmentComposerOptionDraft[];
  isNew?: boolean;
}

import type { QuestionType } from '@/utils/constants';

export interface AssessmentComposerOptionDraft {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
  imageUrl?: string;
  imageDisplayMode?: 'default' | 'expanded';
  imageZoom?: number;
  imagePositionX?: number;
  imagePositionY?: number;
}

export interface AssessmentComposerQuestionDraft {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  isRequired: boolean;
  explanation: string;
  imageUrl: string;
  imageDisplayMode?: 'default' | 'expanded';
  imageZoom?: number;
  imagePositionX?: number;
  imagePositionY?: number;
  conceptTags: string[];
  fillBlankSmartCaseInsensitive: boolean;
  fillBlankExperimentalSmartMatch: boolean;
  options: AssessmentComposerOptionDraft[];
  isNew?: boolean;
}

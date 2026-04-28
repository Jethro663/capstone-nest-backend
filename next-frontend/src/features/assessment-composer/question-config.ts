import {
  AlignLeft,
  CheckCheck,
  ChevronDownSquare,
  CircleCheckBig,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import type { QuestionType } from '@/utils/constants';

export const ASSESSMENT_COMPOSER_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Choice',
  multiple_select: 'Multi-select',
  true_false: 'True / False',
  short_answer: 'Text',
  fill_blank: 'Fill in the blank',
  dropdown: 'Dropdown',
};

export const ASSESSMENT_COMPOSER_QUESTION_TYPES: Array<{
  type: QuestionType;
  label: string;
  icon: LucideIcon;
}> = [
  { type: 'multiple_choice', label: 'Choice', icon: CircleCheckBig },
  { type: 'multiple_select', label: 'Multi-select', icon: CheckCheck },
  { type: 'true_false', label: 'True / False', icon: ListChecks },
  { type: 'short_answer', label: 'Text', icon: AlignLeft },
  { type: 'fill_blank', label: 'Fill in the blank', icon: AlignLeft },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDownSquare },
];

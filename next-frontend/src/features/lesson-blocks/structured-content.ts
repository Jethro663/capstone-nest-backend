import type { ContentBlock } from '@/types/lesson';

export type StructuredLessonTextVariant =
  | 'body'
  | 'objectives'
  | 'key_points'
  | 'example'
  | 'recap'
  | 'reflection';

export type StructuredLessonQuestionAnswerType =
  | 'single_select'
  | 'multi_select'
  | 'short_answer';

export interface StructuredLessonTextContent extends Record<string, unknown> {
  heading?: string;
  html: string;
}

export interface StructuredLessonQuestionContent extends Record<string, unknown> {
  prompt: string;
  choices: string[];
  answerType: StructuredLessonQuestionAnswerType;
}

export interface StructuredLessonQuestionModel extends StructuredLessonQuestionContent {
  correctAnswers: string[];
  explanation: string;
  points: number;
}

type StructuredLessonBlockContent = StructuredLessonTextContent | StructuredLessonQuestionContent;

const DEFAULT_TEXT_BLOCKS: Record<Exclude<StructuredLessonTextVariant, 'body'>, StructuredLessonTextContent> = {
  objectives: {
    heading: 'Learning objectives',
    html: '<ul><li>State the goal learners should reach in this lesson.</li></ul>',
  },
  key_points: {
    heading: 'Key points',
    html: '<ul><li>Highlight the most important concept from this lesson.</li></ul>',
  },
  example: {
    heading: 'Worked example',
    html: '<p>Show one concrete example that makes the lesson easier to understand.</p>',
  },
  recap: {
    heading: 'Recap',
    html: '<p>Summarize the main idea learners should remember before moving on.</p>',
  },
  reflection: {
    heading: 'Reflection',
    html: '<p>Ask learners to connect the lesson to what they already know.</p>',
  },
};

export function createStructuredLessonBlockContent(
  type: ContentBlock['type'],
  variant: StructuredLessonTextVariant = 'body',
): StructuredLessonBlockContent | string {
  if (type === 'question') {
    return {
      prompt: 'Write a quick checkpoint question for learners.',
      choices: ['Option 1', 'Option 2'],
      answerType: 'single_select',
    };
  }

  if (type !== 'text') {
    return '';
  }

  if (variant === 'body') {
    return {
      heading: '',
      html: '<p>Start writing the core explanation for this lesson section.</p>',
    };
  }

  return DEFAULT_TEXT_BLOCKS[variant];
}

function normalizeTextContent(content: ContentBlock['content']): StructuredLessonTextContent {
  if (typeof content === 'string') {
    return { heading: '', html: content };
  }

  if (content && typeof content === 'object') {
    const html = typeof content.html === 'string'
      ? content.html
      : typeof content.text === 'string'
        ? content.text
        : '';
    const heading = typeof content.heading === 'string' ? content.heading : '';
    return { heading, html };
  }

  return { heading: '', html: '' };
}

function normalizeQuestionContent(content: ContentBlock['content']): StructuredLessonQuestionContent {
  if (content && typeof content === 'object') {
    const prompt = typeof content.prompt === 'string'
      ? content.prompt
      : typeof content.text === 'string'
        ? content.text
        : '';
    const answerType =
      content.answerType === 'multi_select' || content.answerType === 'short_answer'
        ? content.answerType
        : 'single_select';
    const choices = Array.isArray(content.choices)
      ? content.choices.filter((entry): entry is string => typeof entry === 'string')
      : [];
    return { prompt, choices, answerType };
  }

  if (typeof content === 'string') {
    return { prompt: content, choices: [], answerType: 'short_answer' };
  }

  return { prompt: '', choices: [], answerType: 'short_answer' };
}

export function normalizeStructuredLessonBlock(block: ContentBlock): ContentBlock {
  if (block.type === 'text') {
    const variant =
      block.metadata && typeof block.metadata.variant === 'string'
        ? (block.metadata.variant as StructuredLessonTextVariant)
        : 'body';
    return {
      ...block,
      content: normalizeTextContent(block.content),
      metadata: {
        ...(block.metadata ?? {}),
        variant,
      },
    };
  }

  if (block.type === 'question') {
    return {
      ...block,
      content: normalizeQuestionContent(block.content),
      metadata: {
        ...(block.metadata ?? {}),
        correctAnswers: Array.isArray(block.metadata?.correctAnswers)
          ? block.metadata?.correctAnswers
          : [],
        explanation:
          typeof block.metadata?.explanation === 'string' ? block.metadata.explanation : '',
        points: typeof block.metadata?.points === 'number' ? block.metadata.points : 0,
      },
    };
  }

  return block;
}

export function getStructuredLessonBlockHtml(block: ContentBlock) {
  const normalized = normalizeStructuredLessonBlock(block);
  if (normalized.type !== 'text') return '';
  return normalizeTextContent(normalized.content).html;
}

export function getStructuredLessonBlockHeading(block: ContentBlock) {
  const normalized = normalizeStructuredLessonBlock(block);
  if (normalized.type !== 'text') return '';
  return normalizeTextContent(normalized.content).heading ?? '';
}

export function serializeStructuredLessonQuestionPrompt(block: ContentBlock) {
  const normalized = normalizeStructuredLessonBlock(block);
  if (normalized.type !== 'question') return '';
  return normalizeQuestionContent(normalized.content).prompt;
}

export function getStructuredLessonQuestionModel(
  block: ContentBlock,
): StructuredLessonQuestionModel {
  const normalized = normalizeStructuredLessonBlock(block);
  const content = normalizeQuestionContent(normalized.content);
  return {
    ...content,
    correctAnswers: Array.isArray(normalized.metadata?.correctAnswers)
      ? (normalized.metadata.correctAnswers as string[])
      : [],
    explanation:
      typeof normalized.metadata?.explanation === 'string'
        ? normalized.metadata.explanation
        : '',
    points:
      typeof normalized.metadata?.points === 'number' ? normalized.metadata.points : 0,
  };
}

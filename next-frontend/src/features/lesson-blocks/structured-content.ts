import type { ContentBlock } from '@/types/lesson';

export type StructuredLessonTextVariant =
  | 'body'
  | 'objectives'
  | 'key_points'
  | 'example'
  | 'recap'
  | 'reflection';

export type StructuredLessonQuestionAnswerType = 'single_select' | 'multi_select';

export interface StructuredLessonTextItem extends Record<string, unknown> {
  id: string;
  html: string;
}

export interface StructuredLessonExampleStep extends Record<string, unknown> {
  id: string;
  title: string;
  html: string;
}

export interface StructuredLessonTextContent extends Record<string, unknown> {
  heading?: string;
  html?: string;
  items?: StructuredLessonTextItem[];
  scenarioHtml?: string;
  steps?: StructuredLessonExampleStep[];
  answerHtml?: string;
  takeawayHtml?: string;
  promptHtml?: string;
}

export interface StructuredLessonQuestionChoice extends Record<string, unknown> {
  id: string;
  html: string;
}

export interface StructuredLessonQuestionContent extends Record<string, unknown> {
  prompt: string;
  choices: StructuredLessonQuestionChoice[];
  answerType: StructuredLessonQuestionAnswerType;
}

export interface StructuredLessonQuestionModel extends StructuredLessonQuestionContent {
  correctAnswers: string[];
  explanation: string;
  points: number;
}

export interface LessonMediaBlockModel extends Record<string, unknown> {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  caption?: string;
  displayScale?: number;
  legacyUrl?: string;
}

export interface LessonFileBlockModel extends Record<string, unknown> {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  legacyUrl?: string;
}

type StructuredLessonBlockContent =
  | StructuredLessonTextContent
  | StructuredLessonQuestionContent
  | LessonMediaBlockModel
  | LessonFileBlockModel;

const DEFAULT_TEXT_BLOCKS: Record<Exclude<StructuredLessonTextVariant, 'body'>, StructuredLessonTextContent> = {
  objectives: {
    heading: 'Learning objectives',
    items: [
      {
        id: 'objective-1',
        html: '<p>State the goal learners should reach in this lesson.</p>',
      },
    ],
  },
  key_points: {
    heading: 'Key points',
    items: [
      {
        id: 'key-point-1',
        html: '<p>Highlight the most important concept from this lesson.</p>',
      },
    ],
  },
  example: {
    heading: 'Worked example',
    scenarioHtml: '<p>Introduce the problem or situation learners should follow.</p>',
    steps: [
      {
        id: 'step-1',
        title: 'Step 1',
        html: '<p>Show the first move in the solution.</p>',
      },
    ],
    answerHtml: '<p>Explain why this example works.</p>',
  },
  recap: {
    heading: 'Recap',
    takeawayHtml: '<p>Summarize the main idea learners should remember before moving on.</p>',
  },
  reflection: {
    heading: 'Reflection',
    promptHtml: '<p>Ask learners to connect the lesson to what they already know.</p>',
  },
};

function stableId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeVariant(value: unknown): StructuredLessonTextVariant {
  if (
    value === 'objectives' ||
    value === 'key_points' ||
    value === 'example' ||
    value === 'recap' ||
    value === 'reflection'
  ) {
    return value;
  }
  return 'body';
}

function extractListItemsFromHtml(html: string, prefix: string): StructuredLessonTextItem[] {
  const matches = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
  if (matches.length === 0) {
    return html.trim()
      ? [{ id: stableId(prefix, 0), html }]
      : [];
  }
  return matches.map((match, index) => ({
    id: stableId(prefix, index),
    html: `<p>${match[1].trim()}</p>`,
  }));
}

function normalizeTextItems(value: unknown, fallbackHtml: string, prefix: string) {
  if (Array.isArray(value)) {
    const items = value
      .map((entry, index) => {
        if (typeof entry === 'string') {
          return { id: stableId(prefix, index), html: entry };
        }
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const record = entry as Record<string, unknown>;
        return {
          id: readString(record.id, stableId(prefix, index)),
          html: readString(record.html, readString(record.text)),
        };
      })
      .filter((entry): entry is StructuredLessonTextItem => Boolean(entry?.html?.trim()));
    if (items.length > 0) return items;
  }
  return extractListItemsFromHtml(fallbackHtml, prefix);
}

function normalizeExampleSteps(value: unknown, fallbackHtml: string) {
  if (Array.isArray(value)) {
    const steps = value
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const record = entry as Record<string, unknown>;
        return {
          id: readString(record.id, stableId('step', index)),
          title: readString(record.title, `Step ${index + 1}`),
          html: readString(record.html, readString(record.text)),
        };
      })
      .filter((entry): entry is StructuredLessonExampleStep => Boolean(entry?.html?.trim()));
    if (steps.length > 0) return steps;
  }
  return fallbackHtml.trim()
    ? [{ id: 'step-1', title: 'Step 1', html: fallbackHtml }]
    : [];
}

export function createStructuredLessonBlockContent(
  type: ContentBlock['type'],
  variant: StructuredLessonTextVariant = 'body',
): StructuredLessonBlockContent | string {
  if (type === 'question') {
    return {
      prompt: '<p>Write a quick checkpoint question for learners.</p>',
      choices: [
        { id: 'choice-1', html: '<p>Option 1</p>' },
        { id: 'choice-2', html: '<p>Option 2</p>' },
      ],
      answerType: 'single_select',
    };
  }

  if (type === 'image') {
    return { fileId: '', fileName: '', mimeType: '', caption: '', displayScale: 100 };
  }

  if (type === 'file') {
    return { fileId: '', fileName: '', mimeType: '' };
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

function normalizeTextContent(
  content: ContentBlock['content'],
  variant: StructuredLessonTextVariant,
): StructuredLessonTextContent {
  if (typeof content === 'string') {
    if (variant === 'objectives' || variant === 'key_points') {
      return {
        heading: DEFAULT_TEXT_BLOCKS[variant].heading,
        items: extractListItemsFromHtml(content, variant === 'objectives' ? 'objective' : 'key-point'),
      };
    }
    if (variant === 'example') {
      return {
        heading: DEFAULT_TEXT_BLOCKS.example.heading,
        scenarioHtml: '',
        steps: normalizeExampleSteps(undefined, content),
        answerHtml: '',
      };
    }
    if (variant === 'recap') {
      return { heading: DEFAULT_TEXT_BLOCKS.recap.heading, takeawayHtml: content };
    }
    if (variant === 'reflection') {
      return { heading: DEFAULT_TEXT_BLOCKS.reflection.heading, promptHtml: content };
    }
    return { heading: '', html: content };
  }

  if (content && typeof content === 'object') {
    const html = readString(content.html, readString(content.text));
    const heading = readString(content.heading, DEFAULT_TEXT_BLOCKS[variant as Exclude<StructuredLessonTextVariant, 'body'>]?.heading ?? '');

    if (variant === 'objectives' || variant === 'key_points') {
      return {
        heading,
        items: normalizeTextItems(
          content.items,
          html,
          variant === 'objectives' ? 'objective' : 'key-point',
        ),
      };
    }

    if (variant === 'example') {
      return {
        heading,
        scenarioHtml: readString(content.scenarioHtml),
        steps: normalizeExampleSteps(content.steps, html),
        answerHtml: readString(content.answerHtml),
      };
    }

    if (variant === 'recap') {
      return {
        heading,
        takeawayHtml: readString(content.takeawayHtml, html),
      };
    }

    if (variant === 'reflection') {
      return {
        heading,
        promptHtml: readString(content.promptHtml, html),
      };
    }

    return { heading, html };
  }

  return { heading: '', html: '' };
}

function normalizeAnswerType(value: unknown): StructuredLessonQuestionAnswerType {
  return value === 'multi_select' ? 'multi_select' : 'single_select';
}

function normalizeChoices(value: unknown): StructuredLessonQuestionChoice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (typeof entry === 'string') {
        return {
          id: stableId('choice', index),
          html: entry,
        };
      }
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      return {
        id: readString(record.id, stableId('choice', index)),
        html: readString(record.html, readString(record.text)),
      };
    })
    .filter((entry): entry is StructuredLessonQuestionChoice => Boolean(entry?.html?.trim()));
}

function normalizeQuestionContent(content: ContentBlock['content']): StructuredLessonQuestionContent {
  if (content && typeof content === 'object') {
    const prompt = readString(content.prompt, readString(content.text));
    return {
      prompt,
      choices: normalizeChoices(content.choices),
      answerType: normalizeAnswerType(content.answerType),
    };
  }

  if (typeof content === 'string') {
    return { prompt: content, choices: [], answerType: 'single_select' };
  }

  return { prompt: '', choices: [], answerType: 'single_select' };
}

function normalizeCorrectAnswers(rawValue: unknown, choices: StructuredLessonQuestionChoice[]) {
  if (!Array.isArray(rawValue)) return [];
  return rawValue
    .map((entry) => {
      if (typeof entry !== 'string') return null;
      if (choices.some((choice) => choice.id === entry)) return entry;
      const byText = choices.find((choice) => stripHtml(choice.html) === stripHtml(entry));
      return byText?.id ?? null;
    })
    .filter((entry): entry is string => Boolean(entry));
}

export function normalizeStructuredLessonBlock(block: ContentBlock): ContentBlock {
  if (block.type === 'text') {
    const variant = normalizeVariant(block.metadata?.variant);
    return {
      ...block,
      content: normalizeTextContent(block.content, variant),
      metadata: {
        ...(block.metadata ?? {}),
        variant,
      },
    };
  }

  if (block.type === 'question') {
    const content = normalizeQuestionContent(block.content);
    return {
      ...block,
      content,
      metadata: {
        ...(block.metadata ?? {}),
        correctAnswers: normalizeCorrectAnswers(block.metadata?.correctAnswers, content.choices),
        explanation:
          typeof block.metadata?.explanation === 'string' ? block.metadata.explanation : '',
        points: typeof block.metadata?.points === 'number' ? block.metadata.points : 0,
      },
    };
  }

  return block;
}

export function getStructuredLessonTextVariant(block: ContentBlock) {
  return normalizeVariant(block.metadata?.variant);
}

export function getStructuredLessonTextContent(block: ContentBlock) {
  const variant = getStructuredLessonTextVariant(block);
  return normalizeTextContent(block.content, variant);
}

export function getStructuredLessonBlockHtml(block: ContentBlock) {
  const normalized = normalizeStructuredLessonBlock(block);
  if (normalized.type !== 'text') return '';
  const variant = getStructuredLessonTextVariant(normalized);
  const content = getStructuredLessonTextContent(normalized);
  if (variant === 'objectives' || variant === 'key_points') {
    return (content.items ?? []).map((item) => item.html).join('');
  }
  if (variant === 'example') {
    return [
      content.scenarioHtml,
      ...(content.steps ?? []).map((step) => step.html),
      content.answerHtml,
    ].filter(Boolean).join('');
  }
  if (variant === 'recap') return content.takeawayHtml ?? '';
  if (variant === 'reflection') return content.promptHtml ?? '';
  return content.html ?? '';
}

export function getStructuredLessonBlockHeading(block: ContentBlock) {
  const normalized = normalizeStructuredLessonBlock(block);
  if (normalized.type !== 'text') return '';
  return getStructuredLessonTextContent(normalized).heading ?? '';
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
    correctAnswers: normalizeCorrectAnswers(normalized.metadata?.correctAnswers, content.choices),
    explanation:
      typeof normalized.metadata?.explanation === 'string'
        ? normalized.metadata.explanation
        : '',
    points:
      typeof normalized.metadata?.points === 'number' ? normalized.metadata.points : 0,
  };
}

export function isGradableCheckpoint(block: ContentBlock) {
  if (block.type !== 'question') return false;
  const model = getStructuredLessonQuestionModel(block);
  return model.choices.length > 0 && model.correctAnswers.length > 0;
}

export function evaluateCheckpointAnswer(
  model: StructuredLessonQuestionModel,
  selectedChoiceIds: string[],
) {
  const selected = new Set(selectedChoiceIds);
  const correct = new Set(model.correctAnswers);
  if (selected.size !== correct.size) return false;
  return Array.from(correct).every((id) => selected.has(id));
}

export function getLessonCheckpointGate(
  blocks: ContentBlock[],
  checkpointResults: Record<string, boolean>,
) {
  const gradableIds = blocks
    .filter((block) => block.type === 'question' && isGradableCheckpoint(block))
    .map((block) => block.id);
  const incompleteSetupCount = blocks.filter(
    (block) => block.type === 'question' && !isGradableCheckpoint(block),
  ).length;

  return {
    total: gradableIds.length,
    correct: gradableIds.filter((id) => checkpointResults[id]).length,
    incompleteSetupCount,
    ready: gradableIds.every((id) => checkpointResults[id]),
  };
}

export function getYouTubeEmbedUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
  } catch {
    return '';
  }

  return '';
}

export function getBlockUrlValue(content: ContentBlock['content']): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    return readString(content.url, readString(content.text, readString(content.legacyUrl)));
  }
  return '';
}

export function getLessonMediaBlockModel(block: ContentBlock): LessonMediaBlockModel {
  const content = block.content;
  const metadata = block.metadata ?? {};
  const record = content && typeof content === 'object'
    ? content as Record<string, unknown>
    : {};
  return {
    fileId: readString(record.fileId, readString(metadata.fileId)),
    fileName: readString(record.fileName, readString(metadata.fileName, 'Lesson image')),
    mimeType: readString(record.mimeType, readString(metadata.mimeType, 'image/*')),
    sizeBytes: typeof record.sizeBytes === 'number' ? record.sizeBytes : undefined,
    caption: readString(record.caption, readString(metadata.caption)),
    displayScale:
      typeof record.displayScale === 'number'
        ? Math.max(50, Math.min(100, record.displayScale))
        : 100,
    legacyUrl: getBlockUrlValue(content),
  };
}

export function getLessonFileBlockModel(block: ContentBlock): LessonFileBlockModel {
  const content = block.content;
  const metadata = block.metadata ?? {};
  const record = content && typeof content === 'object'
    ? content as Record<string, unknown>
    : {};
  return {
    fileId: readString(record.fileId, readString(metadata.fileId)),
    fileName: readString(record.fileName, readString(metadata.fileName, 'Attachment')),
    mimeType: readString(record.mimeType, readString(metadata.mimeType, 'File')),
    sizeBytes: typeof record.sizeBytes === 'number' ? record.sizeBytes : undefined,
    legacyUrl: getBlockUrlValue(content),
  };
}

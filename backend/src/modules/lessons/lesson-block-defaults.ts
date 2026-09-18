import type { ContentBlockType } from './DTO/lesson.dto';

export type LessonTextVariant =
  | 'body'
  | 'objectives'
  | 'key_points'
  | 'example'
  | 'recap'
  | 'reflection';

const textDefaults: Record<LessonTextVariant, unknown> = {
  body: {
    heading: '',
    html: '<p>Start writing the core explanation for this lesson section.</p>',
  },
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
    scenarioHtml:
      '<p>Introduce the problem or situation learners should follow.</p>',
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
    takeawayHtml:
      '<p>Summarize the main idea learners should remember before moving on.</p>',
  },
  reflection: {
    heading: 'Reflection',
    promptHtml:
      '<p>Ask learners to connect the lesson to what they already know.</p>',
  },
};

export function createCanonicalLessonBlock(
  type: ContentBlockType,
  variant: LessonTextVariant = 'body',
): { content: unknown; metadata: Record<string, unknown> } {
  switch (type) {
    case 'text':
      return {
        content: structuredClone(textDefaults[variant]),
        metadata: { variant },
      };
    case 'image':
      return {
        content: {
          fileId: '',
          fileName: '',
          mimeType: '',
          caption: '',
          displayScale: 100,
        },
        metadata: {},
      };
    case 'video':
      return { content: { url: '', caption: '' }, metadata: {} };
    case 'question':
      return {
        content: {
          prompt: '<p>Write a quick checkpoint question for learners.</p>',
          choices: [
            { id: 'choice-1', html: '<p>Option 1</p>' },
            { id: 'choice-2', html: '<p>Option 2</p>' },
          ],
          answerType: 'single_select',
        },
        metadata: { correctAnswers: [], explanation: '', points: 1 },
      };
    case 'file':
      return {
        content: { fileId: '', fileName: '', mimeType: '' },
        metadata: {},
      };
    case 'divider':
      return { content: { style: 'line' }, metadata: {} };
  }
}

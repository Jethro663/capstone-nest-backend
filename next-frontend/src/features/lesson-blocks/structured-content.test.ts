import {
  createStructuredLessonBlockContent,
  getStructuredLessonBlockHeading,
  getStructuredLessonBlockHtml,
  normalizeStructuredLessonBlock,
  serializeStructuredLessonQuestionPrompt,
  getStructuredLessonQuestionModel,
} from './structured-content';
import type { ContentBlock } from '@/types/lesson';

describe('structured lesson block helpers', () => {
  it('creates default structured text block content for semantic variants', () => {
    const content = createStructuredLessonBlockContent('text', 'objectives');

    expect(content).toEqual({
      heading: 'Learning objectives',
      html: '<ul><li>State the goal learners should reach in this lesson.</li></ul>',
    });
  });

  it('normalizes legacy string text blocks into structured content with a body variant', () => {
    const block = normalizeStructuredLessonBlock({
      id: 'block-1',
      lessonId: 'lesson-1',
      type: 'text',
      order: 1,
      content: '<p>Hello world</p>',
    } as ContentBlock);

    expect(block.metadata).toMatchObject({ variant: 'body' });
    expect(getStructuredLessonBlockHtml(block)).toBe('<p>Hello world</p>');
    expect(getStructuredLessonBlockHeading(block)).toBe('');
  });

  it('normalizes question blocks into prompt metadata that the reader can render', () => {
    const block = normalizeStructuredLessonBlock({
      id: 'block-2',
      lessonId: 'lesson-1',
      type: 'question',
      order: 2,
      content: {
        prompt: 'Which option is correct?',
        choices: ['A', 'B'],
        answerType: 'single_select',
      },
      metadata: {
        correctAnswers: ['B'],
        explanation: 'B matches the lesson.',
        points: 3,
      },
    } as ContentBlock);

    expect(serializeStructuredLessonQuestionPrompt(block)).toBe('Which option is correct?');
    expect(getStructuredLessonQuestionModel(block)).toEqual({
      prompt: 'Which option is correct?',
      choices: ['A', 'B'],
      answerType: 'single_select',
      correctAnswers: ['B'],
      explanation: 'B matches the lesson.',
      points: 3,
    });
  });
});

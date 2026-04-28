import {
  createStructuredLessonBlockContent,
  getStructuredLessonBlockHeading,
  getStructuredLessonBlockHtml,
  getLessonCheckpointGate,
  getLessonFileBlockModel,
  getLessonMediaBlockModel,
  normalizeStructuredLessonBlock,
  serializeStructuredLessonQuestionPrompt,
  getStructuredLessonQuestionModel,
  evaluateCheckpointAnswer,
  getYouTubeEmbedUrl,
} from './structured-content';
import type { ContentBlock } from '@/types/lesson';

describe('structured lesson block helpers', () => {
  it('creates default structured text block content for semantic variants', () => {
    const content = createStructuredLessonBlockContent('text', 'objectives');

    expect(content).toEqual({
      heading: 'Learning objectives',
      items: [
        {
          id: 'objective-1',
          html: '<p>State the goal learners should reach in this lesson.</p>',
        },
      ],
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
    const model = getStructuredLessonQuestionModel(block);
    expect(model).toEqual({
      prompt: 'Which option is correct?',
      choices: [
        { id: 'choice-1', html: 'A' },
        { id: 'choice-2', html: 'B' },
      ],
      answerType: 'single_select',
      correctAnswers: ['choice-2'],
      explanation: 'B matches the lesson.',
      points: 3,
    });
    expect(evaluateCheckpointAnswer(model, ['choice-2'])).toBe(true);
    expect(evaluateCheckpointAnswer(model, ['choice-1'])).toBe(false);
  });

  it('gates completion on only configured checkpoint answers', () => {
    const blocks = [
      {
        id: 'configured',
        lessonId: 'lesson-1',
        type: 'question',
        order: 1,
        content: {
          prompt: '<p>Pick two.</p>',
          answerType: 'multi_select',
          choices: [
            { id: 'a', html: '<p>A</p>' },
            { id: 'b', html: '<p>B</p>' },
          ],
        },
        metadata: { correctAnswers: ['a', 'b'] },
      },
      {
        id: 'legacy',
        lessonId: 'lesson-1',
        type: 'question',
        order: 2,
        content: { prompt: '<p>Legacy prompt.</p>', choices: ['A'] },
        metadata: {},
      },
    ] as ContentBlock[];

    expect(getLessonCheckpointGate(blocks, {})).toEqual({
      total: 1,
      correct: 0,
      incompleteSetupCount: 1,
      ready: false,
    });
    expect(getLessonCheckpointGate(blocks, { configured: true })).toMatchObject({
      correct: 1,
      ready: true,
    });
  });

  it('normalizes YouTube links and secure file/image block models', () => {
    expect(getYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(getYouTubeEmbedUrl('https://vimeo.com/123')).toBe('');

    expect(
      getLessonMediaBlockModel({
        id: 'image-1',
        lessonId: 'lesson-1',
        type: 'image',
        order: 1,
        content: {
          fileId: 'file-1',
          fileName: 'diagram.png',
          mimeType: 'image/png',
          sizeBytes: 12_000,
          caption: 'Ratio diagram',
          displayScale: 80,
        },
      } as ContentBlock),
    ).toMatchObject({
      fileId: 'file-1',
      fileName: 'diagram.png',
      displayScale: 80,
    });

    expect(
      getLessonFileBlockModel({
        id: 'file-1',
        lessonId: 'lesson-1',
        type: 'file',
        order: 1,
        content: 'https://legacy.example/file.pdf',
      } as ContentBlock),
    ).toMatchObject({
      fileId: '',
      legacyUrl: 'https://legacy.example/file.pdf',
    });
  });
});

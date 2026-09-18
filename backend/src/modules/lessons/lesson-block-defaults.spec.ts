import { createCanonicalLessonBlock } from './lesson-block-defaults';

describe('createCanonicalLessonBlock', () => {
  it('creates storage-safe defaults for every non-text block type', () => {
    expect(createCanonicalLessonBlock('video')).toEqual({
      content: { url: '', caption: '' },
      metadata: {},
    });
    expect(createCanonicalLessonBlock('divider')).toEqual({
      content: { style: 'line' },
      metadata: {},
    });
    expect(createCanonicalLessonBlock('image').content).toEqual({
      fileId: '',
      fileName: '',
      mimeType: '',
      caption: '',
      displayScale: 100,
    });
    expect(createCanonicalLessonBlock('file').content).toEqual({
      fileId: '',
      fileName: '',
      mimeType: '',
    });
  });

  it('creates a checkpoint that can be edited without changing shape', () => {
    expect(createCanonicalLessonBlock('question')).toEqual({
      content: {
        prompt: '<p>Write a quick checkpoint question for learners.</p>',
        choices: [
          { id: 'choice-1', html: '<p>Option 1</p>' },
          { id: 'choice-2', html: '<p>Option 2</p>' },
        ],
        answerType: 'single_select',
      },
      metadata: { correctAnswers: [], explanation: '', points: 1 },
    });
  });
});

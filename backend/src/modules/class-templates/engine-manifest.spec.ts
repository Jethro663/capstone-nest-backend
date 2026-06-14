import {
  deriveEngineChunks,
  ENGINE_SCHEMA_VERSION,
  ENGINE_VERSION,
  parseEngineManifest,
  stringifyEngineManifest,
  type EngineTemplateManifest,
  validateEngineManifest,
} from './engine-manifest';

function buildManifest(): EngineTemplateManifest {
  const base: EngineTemplateManifest = {
    schemaVersion: ENGINE_SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    exportedAt: '2026-04-19T00:00:00.000Z',
    template: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Quarter 1 Algebra Template',
      subjectCode: 'MATH-7',
      subjectGradeLevel: '7',
      status: 'draft',
      notes: null,
    },
    modules: [
      {
        id: '22222222-2222-2222-2222-222222222221',
        title: 'Module 1',
        description: '<p>Intro</p>',
        order: 1,
        sections: [
          {
            id: '33333333-3333-3333-3333-333333333331',
            title: 'Section 1',
            description: '<p>Warm-up</p>',
            order: 1,
            items: [
              {
                id: '44444444-4444-4444-4444-444444444441',
                itemType: 'lesson',
                order: 1,
                lessonId: '55555555-5555-5555-5555-555555555551',
              },
              {
                id: '44444444-4444-4444-4444-444444444442',
                itemType: 'assessment',
                order: 2,
                assessmentId: '66666666-6666-6666-6666-666666666661',
              },
            ],
          },
        ],
      },
    ],
    lessons: [
      {
        id: '55555555-5555-5555-5555-555555555551',
        title: 'Integers Basics',
        summary: '<p>Understand positive and negative numbers.</p>',
        order: 1,
        blocks: [
          {
            id: '77777777-7777-7777-7777-777777777771',
            blockType: 'text',
            blockVersion: 1,
            order: 1,
            payload: {
              content: '<p>Integers are whole numbers and their opposites.</p>',
              metadata: {},
            },
          },
        ],
      },
    ],
    assessments: [
      {
        id: '66666666-6666-6666-6666-666666666661',
        title: 'Quiz 1',
        description: '<p>Check understanding</p>',
        type: 'quiz',
        dueDateOffsetDays: 3,
        settings: {
          randomizeQuestions: false,
        },
        totalPoints: 10,
        order: 1,
        questions: [
          {
            id: '88888888-8888-8888-8888-888888888881',
            type: 'multiple_choice',
            content: '<p>What is -2 + 5?</p>',
            points: 1,
            order: 1,
            isRequired: true,
            explanation: null,
            imageUrl: null,
            options: [
              {
                id: '99999999-9999-9999-9999-999999999991',
                text: '3',
                isCorrect: true,
                order: 1,
              },
              {
                id: '99999999-9999-9999-9999-999999999992',
                text: '7',
                isCorrect: false,
                order: 2,
              },
            ],
          },
        ],
      },
    ],
    announcements: [],
    chunks: [],
  };

  return {
    ...base,
    chunks: deriveEngineChunks(base.lessons, base.assessments),
  };
}

describe('engine-manifest', () => {
  it('stringifies, parses, and validates a canonical manifest', () => {
    const manifest = buildManifest();
    const yaml = stringifyEngineManifest(manifest);
    const parsed = parseEngineManifest(yaml);
    const result = validateEngineManifest(parsed);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.summary.lessons).toBe(1);
    expect(result.summary.questions).toBe(1);
    expect(result.summary.chunks).toBe(2);
  });

  it('rejects duplicate ids and dangling references', () => {
    const manifest = buildManifest();
    manifest.lessons[0].id = manifest.assessments[0].id;
    manifest.modules[0].sections[0].items[0].lessonId =
      '00000000-0000-0000-0000-000000000000';

    const result = validateEngineManifest(manifest);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((issue) =>
        issue.message.includes('Unknown lesson reference'),
      ),
    ).toBe(true);
  });

  it('warns on unsupported block type and chunk drift', () => {
    const manifest = buildManifest();
    manifest.lessons[0].blocks[0].blockType = 'table';
    manifest.chunks[0].content = 'drifted-content';

    const result = validateEngineManifest(manifest);

    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((issue) =>
        issue.message.includes('Unsupported blockType'),
      ),
    ).toBe(true);
    expect(
      result.warnings.some((issue) =>
        issue.message.includes('Chunk content drift detected'),
      ),
    ).toBe(true);
  });
});

import { classTemplateService } from '@/services/class-template-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('classTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends canonical lesson linkage fields when saving content', async () => {
    mockedApi.put.mockResolvedValue({
      data: {
        success: true,
        data: {
          modules: [],
          assessments: [],
          announcements: [],
        },
      },
    });

    await classTemplateService.updateContent('template-1', {
      modules: [
        {
          title: 'Module 1',
          sections: [
            {
              title: 'Section 1',
              items: [
                {
                  itemType: 'lesson',
                  templateLessonId: 'lesson-asset-1',
                  metadata: { lessonTitle: 'Lesson A' },
                },
              ],
            },
          ],
        },
      ],
      lessons: [
        {
          id: 'lesson-asset-1',
          title: 'Lesson A',
          blocks: [
            {
              blockType: 'text',
              payload: { content: '<p>Hello</p>' },
            },
          ],
        },
      ],
    } as never);

    expect(mockedApi.put).toHaveBeenCalledWith(
      '/class-templates/template-1/content',
      expect.objectContaining({
        modules: expect.arrayContaining([
          expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({
                items: expect.arrayContaining([
                  expect.objectContaining({
                    templateLessonId: 'lesson-asset-1',
                  }),
                ]),
              }),
            ]),
          }),
        ]),
        lessons: expect.arrayContaining([
          expect.objectContaining({
            id: 'lesson-asset-1',
          }),
        ]),
      }),
    );
  });

  it('calls engine export endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { fileName: 'sample.yaml', yaml: 'x: 1' } },
    });

    await classTemplateService.exportEngine('template-1');

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/class-templates/template-1/engine-export',
    );
  });

  it('calls template get-by-id endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { id: 'template-1', name: 'Template 1' } },
    });

    await classTemplateService.getById('template-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/class-templates/template-1');
  });

  it('calls engine validate and import endpoints', async () => {
    mockedApi.post.mockResolvedValue({ data: { success: true, data: {} } });

    await classTemplateService.validateEngineImport('schemaVersion: 1.0');
    await classTemplateService.importEngine('schemaVersion: 1.0', {
      publish: true,
    });

    expect(mockedApi.post).toHaveBeenNthCalledWith(
      1,
      '/class-templates/engine-import/validate',
      { manifest: 'schemaVersion: 1.0' },
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      '/class-templates/engine-import',
      { manifest: 'schemaVersion: 1.0', publish: true },
    );
  });

  it('posts publish status updates for publish and unpublish actions', async () => {
    mockedApi.post.mockResolvedValue({
      data: { success: true, data: { id: 'template-1' } },
    });

    await classTemplateService.publish('template-1', 'published');
    await classTemplateService.publish('template-1', 'draft');

    expect(mockedApi.post).toHaveBeenNthCalledWith(
      1,
      '/class-templates/template-1/publish',
      { status: 'published' },
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      '/class-templates/template-1/publish',
      { status: 'draft' },
    );
  });
});

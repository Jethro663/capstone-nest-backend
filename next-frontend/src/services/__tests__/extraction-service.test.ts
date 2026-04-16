import { extractionService } from '@/services/extraction-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('extractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes list payloads with snake_case keys and numeric-string progress fields', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: [
          {
            id: 'extraction-1',
            file_id: 'file-1',
            class_id: 'class-1',
            teacher_id: 'teacher-1',
            extraction_status: 'completed',
            model_used: 'vision-extractor',
            is_applied: false,
            progress_percent: '67.5',
            total_chunks: '20',
            processed_chunks: '13',
            created_at: '2026-04-04T00:00:00.000Z',
            updated_at: '2026-04-04T00:01:00.000Z',
            original_name: 'module.pdf',
          },
        ],
      },
    });

    const result = await extractionService.listByClass('class-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/ai/extractions', {
      params: { classId: 'class-1' },
    });
    expect(result.data[0]).toMatchObject({
      id: 'extraction-1',
      fileId: 'file-1',
      classId: 'class-1',
      teacherId: 'teacher-1',
      extractionStatus: 'completed',
      progressPercent: 67.5,
      totalChunks: 20,
      processedChunks: 13,
      originalName: 'module.pdf',
    });
  });

  it('normalizes get-by-id payload numeric strings into numeric fields', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: {
          id: 'extraction-2',
          fileId: 'file-2',
          classId: 'class-2',
          teacherId: 'teacher-2',
          extractionStatus: 'processing',
          isApplied: false,
          progressPercent: '12',
          totalChunks: '40',
          processedChunks: '5',
          createdAt: '2026-04-04T00:00:00.000Z',
          updatedAt: '2026-04-04T00:01:00.000Z',
        },
      },
    });

    const result = await extractionService.getById('extraction-2');

    expect(result.data.progressPercent).toBe(12);
    expect(result.data.totalChunks).toBe(40);
    expect(result.data.processedChunks).toBe(5);
  });

  it('normalizes extraction status polling payload with snake_case and numeric-string fields', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: {
          id: 'extraction-3',
          status: 'PROCESSING',
          progress_percent: '37.25',
          total_chunks: '16',
          processed_chunks: '6',
          model_used: 'llama3.1',
          error_message: null,
        },
      },
    });

    const result = await extractionService.getStatus('extraction-3');

    expect(mockedApi.get).toHaveBeenCalledWith('/ai/extractions/extraction-3/status');
    expect(result.data).toEqual({
      id: 'extraction-3',
      status: 'processing',
      progressPercent: 37.25,
      totalChunks: 16,
      processedChunks: 6,
      modelUsed: 'llama3.1',
      errorMessage: null,
    });
  });

  it('falls back to processing status when extraction payload has unknown status values', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: {
          id: 'extraction-4',
          extractionStatus: 'queued',
        },
      },
    });

    const result = await extractionService.getById('extraction-4');

    expect(result.data.extractionStatus).toBe('processing');
  });

  it('normalizes legacy structured_content.lessons into canonical sections', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: {
          id: 'extraction-legacy',
          fileId: 'file-legacy',
          classId: 'class-legacy',
          teacherId: 'teacher-legacy',
          extractionStatus: 'completed',
          isApplied: false,
          progressPercent: 100,
          totalChunks: 1,
          processedChunks: 1,
          createdAt: '2026-04-04T00:00:00.000Z',
          updatedAt: '2026-04-04T00:00:00.000Z',
          structured_content: {
            title: 'Legacy Module',
            description: 'Legacy description',
            lessons: [
              {
                title: 'Legacy Lesson',
                description: 'Legacy lesson description',
                blocks: [
                  {
                    type: 'text',
                    order: 0,
                    content: { text: 'Legacy body' },
                  },
                ],
              },
            ],
          },
        },
      },
    });

    const result = await extractionService.getById('extraction-legacy');

    expect(result.data.structuredContent?.sections).toHaveLength(1);
    expect(result.data.structuredContent?.sections[0]).toMatchObject({
      title: 'Legacy Lesson',
      description: 'Legacy lesson description',
    });
    expect(result.data.structuredContent?.sections[0].lessonBlocks).toHaveLength(1);
  });
});

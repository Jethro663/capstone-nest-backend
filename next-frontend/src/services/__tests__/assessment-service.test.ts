import { assessmentService } from '@/services/assessment-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('assessmentService', () => {
  const createObjectURL = jest.fn(() => 'blob:url');
  const revokeObjectURL = jest.fn();
  const click = jest.fn();
  const open = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL,
        revokeObjectURL,
      },
      writable: true,
    });
    Object.defineProperty(window, 'open', {
      value: open,
      writable: true,
    });
    jest.spyOn(document, 'createElement').mockReturnValue({
      click,
      remove: jest.fn(),
      set href(_value: string) {},
      set download(_value: string) {},
      set rel(_value: string) {},
    } as unknown as HTMLAnchorElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('restores file upload submissions to draft state', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'attempt-1',
          isSubmitted: false,
        },
      },
    });

    const result = await assessmentService.unsubmitFileUpload('assessment-1');

    expect(mockedApi.post).toHaveBeenCalledWith('/assessments/assessment-1/unsubmit-file-upload');
    expect(result.data.id).toBe('attempt-1');
    expect(result.data.isSubmitted).toBe(false);
  });

  it('retries draft creation with its durable mutation ID after a lost response', async () => {
    mockedApi.post.mockRejectedValueOnce({ code: 'ERR_NETWORK' }).mockResolvedValueOnce({ data: { success: true, data: { assessment: { id: 'created' } } } });
    await expect(assessmentService.createDraft({ classId: 'class-1', quarter: 'Q2' })).rejects.toMatchObject({ code: 'ERR_NETWORK' });
    expect(window.localStorage.getItem('assessment-create-pending:class-1')).not.toBeNull();
    await expect(assessmentService.createDraft({ classId: 'class-1', quarter: 'Q2' })).resolves.toMatchObject({ data: { id: 'created' } });
    expect(mockedApi.post.mock.calls[1]).toEqual(mockedApi.post.mock.calls[0]);
    expect(mockedApi.post.mock.calls[0][0]).toBe('/assessments/editor');
    expect(mockedApi.post.mock.calls[0][1]).toMatchObject({ action: 'save', settings: { title: '', quarter: 'Q2' }, questions: [] });
    expect(window.localStorage.getItem('assessment-create-pending:class-1')).toBeNull();
  });

  it('uploads assessment question and option images through multipart form requests', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          imageUrl: '/api/assessments/questions/images/uploaded.png',
        },
      },
    });

    const file = new File(['img'], 'uploaded.png', { type: 'image/png' });

    await assessmentService.uploadQuestionImage('question-1', file);
    await assessmentService.uploadOptionImage('option-1', file);

    expect(mockedApi.post).toHaveBeenNthCalledWith(
      1,
      '/assessments/questions/question-1/image',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      '/assessments/options/option-1/image',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  });

  it('downloads teacher attachments through the authenticated api client', async () => {
    mockedApi.get.mockResolvedValue({
      data: new Blob(['content']),
      headers: {
        'content-disposition': 'attachment; filename="reference.pdf"',
      },
    });

    await assessmentService.downloadTeacherAttachment('assessment-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/assessments/assessment-1/teacher-attachment/download', {
      responseType: 'blob',
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });

  it('opens uploaded submission files with the authenticated api client', async () => {
    open.mockReturnValue({});
    mockedApi.get.mockResolvedValue({
      data: new Blob(['content']),
      headers: {
        'content-disposition': 'inline; filename="submission.pdf"',
      },
    });

    await assessmentService.openAttemptSubmissionFile('attempt-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/assessments/attempts/attempt-1/submission-file/download', {
      responseType: 'blob',
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith('blob:url', '_blank', 'noopener,noreferrer');
  });

  it('opens a specific submission attachment file when a file id is provided', async () => {
    open.mockReturnValue({});
    mockedApi.get.mockResolvedValue({
      data: new Blob(['content']),
      headers: {
        'content-disposition': 'inline; filename="submission-2.pdf"',
      },
    });

    await assessmentService.openAttemptSubmissionFile('attempt-1', 'submission-2.pdf', 'file-2');

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/assessments/attempts/attempt-1/submission-files/file-2/download',
      {
        responseType: 'blob',
      },
    );
    expect(createObjectURL).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith('blob:url', '_blank', 'noopener,noreferrer');
  });
});

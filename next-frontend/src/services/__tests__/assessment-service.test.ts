import { assessmentService } from '@/services/assessment-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
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
});

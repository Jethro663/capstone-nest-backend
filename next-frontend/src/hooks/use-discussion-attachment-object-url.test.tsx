import { act, renderHook, waitFor } from '@testing-library/react';
import { discussionBoardService } from '@/services/discussion-board-service';
import { useDiscussionAttachmentObjectUrl } from './use-discussion-attachment-object-url';

jest.mock('@/services/discussion-board-service', () => ({
  discussionBoardService: {
    loadAttachment: jest.fn(),
  },
}));

const mockedDiscussionBoardService = discussionBoardService as jest.Mocked<
  typeof discussionBoardService
>;

describe('useDiscussionAttachmentObjectUrl', () => {
  const createObjectUrl = jest.fn<string, [Blob]>();
  const revokeObjectUrl = jest.fn<void, [string]>();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });
  });

  it('turns an authenticated attachment blob into an object URL and revokes it on cleanup', async () => {
    const blob = new Blob(['image-bytes'], { type: 'image/png' });
    mockedDiscussionBoardService.loadAttachment.mockResolvedValue(blob);
    createObjectUrl.mockReturnValue('blob:discussion-image');

    const { result, unmount } = renderHook(() =>
      useDiscussionAttachmentObjectUrl('/api/classes/class-1/discussion-threads/thread-1/attachments/file-1/inline'),
    );

    expect(result.current).toEqual({ objectUrl: null, loading: true, failed: false });
    await waitFor(() => {
      expect(result.current).toEqual({
        objectUrl: 'blob:discussion-image',
        loading: false,
        failed: false,
      });
    });

    expect(mockedDiscussionBoardService.loadAttachment).toHaveBeenCalledWith(
      '/api/classes/class-1/discussion-threads/thread-1/attachments/file-1/inline',
    );
    unmount();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:discussion-image');
  });

  it('reports an explicit failed state when authenticated loading fails', async () => {
    mockedDiscussionBoardService.loadAttachment.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() =>
      useDiscussionAttachmentObjectUrl('/api/classes/class-1/discussion-threads/thread-1/attachments/file-1/inline'),
    );

    await waitFor(() => {
      expect(result.current).toEqual({ objectUrl: null, loading: false, failed: true });
    });
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('does not let a stale request replace the current image', async () => {
    const firstBlob = new Blob(['first'], { type: 'image/png' });
    const secondBlob = new Blob(['second'], { type: 'image/png' });
    let resolveFirst!: (blob: Blob) => void;

    mockedDiscussionBoardService.loadAttachment
      .mockImplementationOnce(
        () => new Promise<Blob>((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce(secondBlob);
    createObjectUrl.mockImplementation((blob) =>
      blob === firstBlob ? 'blob:first-image' : 'blob:second-image',
    );

    const { result, rerender } = renderHook(
      ({ sourceUrl }) => useDiscussionAttachmentObjectUrl(sourceUrl),
      {
        initialProps: {
          sourceUrl:
            '/api/classes/class-1/discussion-threads/thread-1/attachments/first/inline',
        },
      },
    );

    rerender({
      sourceUrl:
        '/api/classes/class-1/discussion-threads/thread-1/attachments/second/inline',
    });
    await waitFor(() => {
      expect(result.current.objectUrl).toBe('blob:second-image');
    });

    await act(async () => {
      resolveFirst(firstBlob);
      await Promise.resolve();
    });

    expect(result.current.objectUrl).toBe('blob:second-image');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:first-image');
  });
});

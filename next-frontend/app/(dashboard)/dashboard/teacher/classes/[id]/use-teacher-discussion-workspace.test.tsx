import { act, renderHook, waitFor } from '@testing-library/react';
import { discussionBoardService } from '@/services/discussion-board-service';
import { useTeacherDiscussionWorkspace } from './use-teacher-discussion-workspace';

jest.mock('@/hooks/use-discussion-realtime-refresh', () => ({
  useDiscussionRealtimeRefresh: jest.fn(),
}));

jest.mock('@/services/discussion-board-service', () => ({
  discussionBoardService: {
    listThreads: jest.fn(),
    getThread: jest.fn(),
  },
}));

describe('useTeacherDiscussionWorkspace', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('loads and sorts pinned discussion threads when the tab is active', async () => {
    jest.mocked(discussionBoardService.listThreads).mockResolvedValue({
      data: {
        items: [
          {
            id: 'newer',
            title: 'Newer',
            isPinned: false,
            createdAt: '2026-07-13T10:00:00Z',
          },
          {
            id: 'pinned',
            title: 'Pinned',
            isPinned: true,
            createdAt: '2026-07-12T10:00:00Z',
          },
        ],
      },
    } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);

    const { result } = renderHook(() =>
      useTeacherDiscussionWorkspace({
        classId: 'class-1',
        classIdValid: true,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(
        result.current.discussionThreads.map((thread) => thread.id),
      ).toEqual(['pinned', 'newer']);
    });
  });

  it('clears stale thread detail when the selection is cleared', async () => {
    jest
      .mocked(discussionBoardService.listThreads)
      .mockResolvedValue({
        success: true,
        message: 'Fixture response',
        data: { items: [], page: 1, limit: 20, total: 0 },
      } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);
    jest.mocked(discussionBoardService.getThread).mockResolvedValue({
      data: { id: 'thread-1', title: 'Selected thread' },
    } as Awaited<ReturnType<typeof discussionBoardService.getThread>>);

    const { result } = renderHook(() =>
      useTeacherDiscussionWorkspace({
        classId: 'class-1',
        classIdValid: true,
        enabled: true,
      }),
    );

    act(() => result.current.setSelectedDiscussionThreadId('thread-1'));
    await waitFor(() => {
      expect(result.current.selectedDiscussionThread?.id).toBe('thread-1');
    });

    act(() => result.current.setSelectedDiscussionThreadId(null));
    expect(result.current.selectedDiscussionThread).toBeNull();
  });

  it('does not request threads for an invalid class id', () => {
    renderHook(() =>
      useTeacherDiscussionWorkspace({
        classId: 'invalid',
        classIdValid: false,
        enabled: true,
      }),
    );

    expect(discussionBoardService.listThreads).not.toHaveBeenCalled();
  });
});

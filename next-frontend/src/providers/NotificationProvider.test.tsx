import { act, render, screen, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotifications } from './NotificationProvider';
import { getTrackedExtractionNotificationStorageKey } from '@/lib/extraction-notification-tracker';
import { getNotificationSurfaceStorageKey } from '@/lib/notification-surface-policy';
import { NOTIFICATION_TOAST_LANE_ID } from '@/components/notifications/LiveNotificationToast';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import type { Notification } from '@/types/notification';

const useAuthMock = jest.fn();
const pushMock = jest.fn();
const getAccessTokenMock = jest.fn();
const getAllMock = jest.fn();
const getUnreadCountMock = jest.fn();
const markReadMock = jest.fn();
const readAllMock = jest.fn();
const getExtractionStatusMock = jest.fn();
const ioMock = jest.fn();
const socketOnMock = jest.fn();
const socketDisconnectMock = jest.fn();
const socketListeners = new Map<string, (...args: any[]) => void>();

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: 'announcement_posted',
    title: 'New announcement',
    message: 'A class announcement was posted.',
    body: 'A class announcement was posted.',
    isRead: false,
    createdAt: '2026-09-02T08:00:00.000Z',
    ...overrides,
  };
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('@/lib/api-client', () => ({
  getAccessToken: () => getAccessTokenMock(),
}));

jest.mock('@/services/notification-service', () => ({
  normalizeNotification: (value: unknown) => value,
  notificationService: {
    getAll: (...args: unknown[]) => getAllMock(...args),
    getUnreadCount: (...args: unknown[]) => getUnreadCountMock(...args),
    markRead: (...args: unknown[]) => markReadMock(...args),
    readAll: (...args: unknown[]) => readAllMock(...args),
  },
}));

jest.mock('@/services/extraction-service', () => ({
  extractionService: {
    getStatus: (...args: unknown[]) => getExtractionStatusMock(...args),
  },
}));

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    custom: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

function NotificationProbe() {
  const { unreadCount } = useNotifications();
  return <div data-testid="unread-count">{unreadCount}</div>;
}

function NotificationRefreshProbe() {
  const { fetchNotifications, notifications, unreadCount } = useNotifications();
  return (
    <div>
      <button type="button" onClick={() => void fetchNotifications()}>
        Refresh
      </button>
      <span data-testid="notification-titles">
        {notifications.map((notification) => notification.title).join('|')}
      </span>
      <span data-testid="refresh-unread-count">{unreadCount}</span>
    </div>
  );
}

function NotificationSubscriberProbe() {
  const { subscribe } = useNotifications();
  const [titles, setTitles] = useState<string[]>([]);

  useEffect(() => {
    return subscribe((notification) => {
      setTitles((current) => [...current, notification.title]);
    });
  }, [subscribe]);

  return <div data-testid="subscription-events">{titles.join('|')}</div>;
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T09:00:00.000Z'));
    jest.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    socketOnMock.mockReturnValue(undefined);
    socketDisconnectMock.mockReturnValue(undefined);
    socketListeners.clear();
    socketOnMock.mockImplementation((eventName: string, handler: (...args: any[]) => void) => {
      socketListeners.set(eventName, handler);
    });
    ioMock.mockReturnValue({
      on: socketOnMock,
      disconnect: socketDisconnectMock,
    });
    getAccessTokenMock.mockReturnValue('access-token');
    getAllMock.mockResolvedValue({ data: [] });
    getUnreadCountMock.mockResolvedValue({ data: { count: 0 } });
    markReadMock.mockResolvedValue({ success: true });
    readAllMock.mockResolvedValue({ success: true });
    getExtractionStatusMock.mockResolvedValue({
      data: {
        id: 'extraction-1',
        status: 'processing',
        progressPercent: 40,
        totalChunks: 4,
        processedChunks: 2,
        modelUsed: 'mock-model',
      },
    });
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      role: 'teacher',
      user: {
        id: 'user-1',
        firstName: 'System',
        lastName: 'Admin',
      },
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('does not refetch or reconnect when the authenticated user id is unchanged', async () => {
    const { rerender } = render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getAllMock).toHaveBeenCalledTimes(1);
      expect(getUnreadCountMock).toHaveBeenCalledTimes(1);
      expect(ioMock).toHaveBeenCalledTimes(1);
    });

    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      role: 'teacher',
      user: {
        id: 'user-1',
        firstName: 'System',
        lastName: 'Admin',
      },
    });

    rerender(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getAllMock).toHaveBeenCalledTimes(1);
      expect(getUnreadCountMock).toHaveBeenCalledTimes(1);
      expect(ioMock).toHaveBeenCalledTimes(1);
    });
  });

  it('treats a direct account switch as a new initial socket connection', async () => {
    const view = render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));
    act(() => socketListeners.get('connect')?.());

    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      role: 'teacher',
      user: { id: 'user-2', firstName: 'Teacher', lastName: 'Two' },
    });
    view.rerender(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));
    act(() => socketListeners.get('connect')?.());

    expect(getAllMock).toHaveBeenCalledTimes(2);
  });

  it('starts account B hydration and ignores account A responses that finish after a switch', async () => {
    let resolveUserOneList: (value: { data: Notification[] }) => void = () => undefined;
    let resolveUserOneCount: (value: { data: { count: number } }) => void = () => undefined;
    getAllMock
      .mockReturnValueOnce(
        new Promise<{ data: Notification[] }>((resolve) => {
          resolveUserOneList = resolve;
        }),
      )
      .mockResolvedValueOnce({
        data: [notification({ id: 'user-2-notification', userId: 'user-2', title: 'User two update' })],
      });
    getUnreadCountMock
      .mockReturnValueOnce(
        new Promise<{ data: { count: number } }>((resolve) => {
          resolveUserOneCount = resolve;
        }),
      )
      .mockResolvedValueOnce({ data: { count: 1 } });

    const view = render(
      <NotificationProvider>
        <NotificationRefreshProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      role: 'teacher',
      user: { id: 'user-2', firstName: 'Teacher', lastName: 'Two' },
    });
    view.rerender(
      <NotificationProvider>
        <NotificationRefreshProbe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId('notification-titles')).toHaveTextContent('User two update'),
    );

    await act(async () => {
      resolveUserOneList({
        data: [notification({ id: 'user-1-late', title: 'User one late response' })],
      });
      resolveUserOneCount({ data: { count: 9 } });
    });

    expect(screen.getByTestId('notification-titles')).toHaveTextContent('User two update');
    expect(screen.getByTestId('notification-titles')).not.toHaveTextContent('User one late response');
    expect(screen.getByTestId('refresh-unread-count')).toHaveTextContent('1');
  });

  it('shows one persisted digest instead of replaying three unread login notifications', async () => {
    getAllMock.mockResolvedValue({
      data: [
        notification({ id: 'notification-1' }),
        notification({ id: 'notification-2' }),
        notification({ id: 'notification-3' }),
      ],
    });
    getUnreadCountMock.mockResolvedValue({ data: { count: 3 } });

    const firstMount = render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(toast.custom).toHaveBeenCalledTimes(1));
    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [() => React.ReactNode];
    render(renderToast());
    expect(screen.getByText('3 unread updates')).toBeInTheDocument();
    expect(window.localStorage.getItem(getNotificationSurfaceStorageKey('user-1'))).not.toBeNull();

    firstMount.unmount();
    (toast.custom as jest.Mock).mockClear();

    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));
    expect(toast.custom).not.toHaveBeenCalled();
  });

  it('keeps the cooldown in memory when browser storage rejects writes', async () => {
    const storageWrite = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('storage disabled');
      });
    getAllMock.mockResolvedValue({ data: [notification()] });
    getUnreadCountMock.mockResolvedValue({ data: { count: 1 } });
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(toast.custom).toHaveBeenCalledTimes(1));

    act(() => jest.advanceTimersByTime(31_000));
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));

    expect(toast.custom).toHaveBeenCalledTimes(1);
    storageWrite.mockRestore();
  });

  it('uses a five-minute safety reconciliation while the socket is connected', async () => {
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    act(() => socketListeners.get('connect')?.());
    act(() => jest.advanceTimersByTime(5 * 60_000 - 1));
    expect(getAllMock).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(1));
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));
  });

  it('uses a sixty-second disconnected fallback and pauses it while hidden', async () => {
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    act(() => jest.advanceTimersByTime(60_000));
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => jest.advanceTimersByTime(2 * 60_000));
    expect(getAllMock).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(3));
  });

  it('reconciles after reconnect but not on the initial socket connection', async () => {
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    act(() => socketListeners.get('connect')?.());
    expect(getAllMock).toHaveBeenCalledTimes(1);
    act(() => socketListeners.get('disconnect')?.('transport close'));
    act(() => socketListeners.get('connect')?.());

    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));
  });

  it('preserves unread state when count refresh fails while accepting a successful list', async () => {
    getAllMock
      .mockResolvedValueOnce({ data: [notification({ title: 'Initial update' })] })
      .mockResolvedValueOnce({ data: [notification({ id: 'notification-2', title: 'Fresh list' })] });
    getUnreadCountMock
      .mockResolvedValueOnce({ data: { count: 4 } })
      .mockRejectedValueOnce(new Error('count unavailable'));

    render(
      <NotificationProvider>
        <NotificationRefreshProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('refresh-unread-count')).toHaveTextContent('4'));
    (toast.custom as jest.Mock).mockClear();

    act(() => screen.getByRole('button', { name: 'Refresh' }).click());

    await waitFor(() => expect(screen.getByTestId('notification-titles')).toHaveTextContent('Fresh list'));
    expect(screen.getByTestId('refresh-unread-count')).toHaveTextContent('4');
    expect(toast.custom).not.toHaveBeenCalled();
  });

  it('buffers ordinary live events and combines a burst into one toast lane', async () => {
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'live-1',
        type: 'announcement_posted',
        title: 'First update',
        body: 'First body',
        createdAt: '2026-09-02T09:01:00.000Z',
      });
      socketListeners.get('notification.new')?.({
        id: 'live-2',
        type: 'discussion_comment_posted',
        title: 'Second update',
        body: 'Second body',
        createdAt: '2026-09-02T09:01:00.100Z',
      });
    });
    expect(toast.custom).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(750));
    await waitFor(() => expect(toast.custom).toHaveBeenCalledTimes(1));
    expect(toast.custom).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ id: NOTIFICATION_TOAST_LANE_ID }),
    );
    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [() => React.ReactNode];
    render(renderToast());
    expect(screen.getByText('2 new updates')).toBeInTheDocument();
  });

  it('cancels a queued live presentation when the provider unmounts', async () => {
    const view = render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'queued-before-unmount',
        type: 'announcement_posted',
        title: 'Queued update',
        body: 'Queued body',
        createdAt: '2026-09-02T09:01:00.000Z',
      });
    });
    view.unmount();
    act(() => jest.advanceTimersByTime(750));

    expect(toast.custom).not.toHaveBeenCalled();
  });

  it('dismisses the visible notification lane when the provider unmounts', async () => {
    const view = render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));
    (toast.dismiss as jest.Mock).mockClear();

    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'visible-before-unmount',
        type: 'student_at_risk',
        title: 'Private intervention alert',
        body: 'Private body',
        createdAt: '2026-09-02T09:01:00.000Z',
      });
    });
    expect(toast.custom).toHaveBeenCalledTimes(1);

    view.unmount();

    expect(toast.dismiss).toHaveBeenCalledWith(NOTIFICATION_TOAST_LANE_ID);
  });

  it('marks an individual live notification read when its Open action is used', async () => {
    markReadMock.mockReturnValue(new Promise(() => undefined));
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'live-open-1',
        type: 'announcement_posted',
        title: 'Open this update',
        body: 'Open body',
        createdAt: '2026-09-02T09:01:00.000Z',
      });
      jest.advanceTimersByTime(750);
    });
    await waitFor(() => expect(toast.custom).toHaveBeenCalledTimes(1));
    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [
      () => { props: { onOpen: () => void } },
    ];

    act(() => renderToast().props.onOpen());

    expect(markReadMock).toHaveBeenCalledWith('live-open-1');
  });

  it('does not show top live-notification cards for students', async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      role: 'student',
      user: { id: 'student-1', firstName: 'Student', lastName: 'One' },
    });
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'student-live-1',
        type: 'announcement_posted',
        title: 'Student update',
        body: 'Student body',
        createdAt: '2026-09-02T09:01:00.000Z',
      });
      jest.advanceTimersByTime(750);
    });

    expect(toast.custom).not.toHaveBeenCalled();
  });

  it('surfaces an urgent live event immediately without waiting for the burst timer', async () => {
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'urgent-live-1',
        type: 'student_at_risk',
        title: 'Learner at risk',
        body: 'A learner needs intervention.',
        createdAt: '2026-09-02T09:01:00.000Z',
      });
    });

    expect(toast.custom).toHaveBeenCalledTimes(1);
    expect(toast.custom).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ id: NOTIFICATION_TOAST_LANE_ID, position: 'top-center' }),
    );
  });

  it('defers hidden live events and presents one catch-up digest on refocus', async () => {
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'hidden-1',
        type: 'announcement_posted',
        title: 'Hidden update',
        body: 'Arrived while hidden.',
        createdAt: '2026-09-02T09:01:00.000Z',
      });
    });
    expect(toast.custom).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(toast.custom).toHaveBeenCalledTimes(1);
    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [() => React.ReactNode];
    render(renderToast());
    expect(screen.getByText('1 update while you were away')).toBeInTheDocument();
  });

  it('does not add a backlog digest after a slow refocus reconciliation already showed catch-up', async () => {
    let resolveFocusedList: (value: { data: Notification[] }) => void = () => undefined;
    getAllMock
      .mockResolvedValueOnce({ data: [] })
      .mockReturnValueOnce(
        new Promise<{ data: Notification[] }>((resolve) => {
          resolveFocusedList = resolve;
        }),
      );
    getUnreadCountMock
      .mockResolvedValueOnce({ data: { count: 0 } })
      .mockResolvedValueOnce({ data: { count: 1 } });
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(1));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => {
      jest.advanceTimersByTime(31_000);
      socketListeners.get('notification.new')?.({
        id: 'slow-focus-1',
        type: 'announcement_posted',
        title: 'Slow focus update',
        body: 'Arrived while hidden.',
        createdAt: '2026-09-02T09:01:00.000Z',
      });
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(toast.custom).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));

    act(() => jest.advanceTimersByTime(2_000));
    await act(async () => {
      resolveFocusedList({ data: [notification({ id: 'slow-focus-1' })] });
    });

    expect(toast.custom).toHaveBeenCalledTimes(1);
  });

  it('shows a teacher completion notification when a tracked extraction finishes', async () => {
    window.localStorage.setItem(
      getTrackedExtractionNotificationStorageKey('class-1'),
      JSON.stringify([
        {
          extractionId: 'extraction-1',
          classId: 'class-1',
          createdAt: '2026-05-04T00:00:00.000Z',
          originalName: 'Quarter 1 Module.pdf',
          targetSectionCount: 4,
          lastKnownStatus: 'processing',
          lastKnownProgress: 55,
          updatedAt: null,
          notifiedAt: null,
        },
      ]),
    );
    getExtractionStatusMock.mockResolvedValueOnce({
      data: {
        id: 'extraction-1',
        status: 'completed',
        progressPercent: 100,
        totalChunks: 4,
        processedChunks: 4,
        modelUsed: 'mock-model',
      },
    });

    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getExtractionStatusMock).toHaveBeenCalledWith('extraction-1');
    });
    act(() => jest.advanceTimersByTime(750));
    await waitFor(() => {
      expect(toast.custom).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          id: NOTIFICATION_TOAST_LANE_ID,
          position: 'top-right',
        }),
      );
    });

    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [
      () => { props: { title: string; body: string } },
    ];
    const toastElement = renderToast();
    expect(toastElement.props.title).toBe('Extraction ready');
    expect(toastElement.props.body).toContain('Quarter 1 Module.pdf');
  });

  it('ignores tracked extraction completion from an account that has signed out', async () => {
    let resolveExtraction: (value: {
      data: {
        id: string;
        status: string;
        progressPercent: number;
        totalChunks: number;
        processedChunks: number;
        modelUsed: string;
      };
    }) => void = () => undefined;
    window.localStorage.setItem(
      getTrackedExtractionNotificationStorageKey('class-1'),
      JSON.stringify([
        {
          extractionId: 'extraction-1',
          classId: 'class-1',
          createdAt: '2026-05-04T00:00:00.000Z',
          originalName: 'Private Module.pdf',
          targetSectionCount: 4,
          lastKnownStatus: 'processing',
          lastKnownProgress: 55,
          updatedAt: null,
          notifiedAt: null,
        },
      ]),
    );
    getExtractionStatusMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveExtraction = resolve;
      }),
    );
    const view = render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await waitFor(() => expect(getExtractionStatusMock).toHaveBeenCalledWith('extraction-1'));

    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      role: 'teacher',
      user: { id: 'user-2', firstName: 'Teacher', lastName: 'Two' },
    });
    view.rerender(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    );
    await act(async () => {
      resolveExtraction({
        data: {
          id: 'extraction-1',
          status: 'completed',
          progressPercent: 100,
          totalChunks: 4,
          processedChunks: 4,
          modelUsed: 'mock-model',
        },
      });
    });
    act(() => jest.advanceTimersByTime(750));

    expect(toast.custom).not.toHaveBeenCalled();
  });

  it('allows feature pages to subscribe to incoming notifications and unsubscribe cleanly', async () => {
    const { unmount } = render(
      <NotificationProvider>
        <NotificationSubscriberProbe />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(ioMock).toHaveBeenCalledTimes(1);
      expect(socketListeners.has('notification.new')).toBe(true);
    });

    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'notif-1',
        type: 'discussion_comment_posted',
        title: 'Thread updated',
        body: 'A new reply arrived.',
        referenceId: 'thread-1',
        createdAt: '2026-05-04T00:00:00.000Z',
      });
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="subscription-events"]')?.textContent,
      ).toContain('Thread updated');
    });

    unmount();

    act(() => {
      socketListeners.get('notification.new')?.({
        id: 'notif-2',
        type: 'discussion_comment_posted',
        title: 'Should not append',
        body: 'This should not reach an unmounted subscriber.',
        referenceId: 'thread-1',
        createdAt: '2026-05-04T00:01:00.000Z',
      });
    });

    expect(socketDisconnectMock).toHaveBeenCalled();
  });
});

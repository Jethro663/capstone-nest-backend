import { render, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotifications } from './NotificationProvider';
import { getTrackedExtractionNotificationStorageKey } from '@/lib/extraction-notification-tracker';
import { toast } from 'sonner';

const useAuthMock = jest.fn();
const pushMock = jest.fn();
const getAccessTokenMock = jest.fn();
const getAllMock = jest.fn();
const getUnreadCountMock = jest.fn();
const getExtractionStatusMock = jest.fn();
const ioMock = jest.fn();
const socketOnMock = jest.fn();
const socketDisconnectMock = jest.fn();

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
    markRead: jest.fn(),
    readAll: jest.fn(),
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
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function NotificationProbe() {
  const { unreadCount } = useNotifications();
  return <div data-testid="unread-count">{unreadCount}</div>;
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.localStorage.clear();
    socketOnMock.mockReturnValue(undefined);
    socketDisconnectMock.mockReturnValue(undefined);
    ioMock.mockReturnValue({
      on: socketOnMock,
      disconnect: socketDisconnectMock,
    });
    getAccessTokenMock.mockReturnValue('access-token');
    getAllMock.mockResolvedValue({ data: [] });
    getUnreadCountMock.mockResolvedValue({ data: { count: 3 } });
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
    jest.runOnlyPendingTimers();
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
      expect(toast.success).toHaveBeenCalledWith('Extraction ready', expect.objectContaining({
        description: expect.stringContaining('Quarter 1 Module.pdf'),
      }));
    });
  });
});

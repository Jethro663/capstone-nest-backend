import { render, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotifications } from './NotificationProvider';

const useAuthMock = jest.fn();
const pushMock = jest.fn();
const getAccessTokenMock = jest.fn();
const getAllMock = jest.fn();
const getUnreadCountMock = jest.fn();
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

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

function NotificationProbe() {
  const { unreadCount } = useNotifications();
  return <div data-testid="unread-count">{unreadCount}</div>;
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketOnMock.mockReturnValue(undefined);
    socketDisconnectMock.mockReturnValue(undefined);
    ioMock.mockReturnValue({
      on: socketOnMock,
      disconnect: socketDisconnectMock,
    });
    getAccessTokenMock.mockReturnValue('access-token');
    getAllMock.mockResolvedValue({ data: [] });
    getUnreadCountMock.mockResolvedValue({ data: { count: 3 } });
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'user-1',
        firstName: 'System',
        lastName: 'Admin',
      },
    });
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
});

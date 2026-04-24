import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationsPage from './page';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { notificationService } from '@/services/notification-service';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/providers/NotificationProvider', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/services/notification-service', () => ({
  notificationService: {
    getAll: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;

describe('NotificationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      role: 'student',
      user: {
        id: 'student-1',
        roles: ['student'],
        firstName: 'Liam',
        lastName: 'Navarro',
      },
    } as ReturnType<typeof useAuth>);
    mockedUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 1,
      loading: false,
      fetchNotifications: jest.fn().mockResolvedValue(undefined),
      markAsRead: jest.fn().mockResolvedValue(undefined),
      markAllAsRead: jest.fn().mockResolvedValue(undefined),
    });
    mockedNotificationService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'notif-1',
          userId: 'student-1',
          title: 'Math update',
          message: 'Bring your worksheet tomorrow.',
          type: 'announcement',
          isRead: false,
          createdAt: '2026-04-11T12:00:00.000Z',
        },
        {
          id: 'notif-2',
          userId: 'student-1',
          title: 'LXP unlocked',
          message: 'You can continue your intervention tasks.',
          type: 'lxp',
          isRead: true,
          createdAt: '2026-04-10T09:30:00.000Z',
        },
      ],
      totalPages: 1,
      page: 1,
    } as Awaited<ReturnType<typeof notificationService.getAll>>);
  });

  it('renders student notifications and marks a single item as read', async () => {
    const markAsRead = jest.fn().mockResolvedValue(undefined);
    const fetchNotifications = jest.fn().mockResolvedValue(undefined);
    mockedUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 1,
      loading: false,
      fetchNotifications,
      markAsRead,
      markAllAsRead: jest.fn().mockResolvedValue(undefined),
    });

    render(<NotificationsPage />);

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Math update')).toBeInTheDocument();
    expect(screen.getByText('Bring your worksheet tomorrow.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark Read' }));

    await waitFor(() => {
      expect(markAsRead).toHaveBeenCalledWith('notif-1');
      expect(fetchNotifications).toHaveBeenCalled();
    });
  });

  it('uses the LMS blue theme with red notification accents for students', async () => {
    render(<NotificationsPage />);

    const page = await screen.findByRole('main', { name: 'Student notifications' });
    expect(page).toHaveClass('bg-[#f4f7fb]');
    expect(page).toHaveClass('text-[#0f2340]');

    expect(screen.getByTestId('student-notifications-hero')).toHaveClass('bg-[#12284a]');
    expect(screen.getByTestId('student-notifications-hero')).toHaveClass('text-white');
    expect(screen.getByRole('button', { name: /Mark All Read/i })).toHaveClass('bg-[#e70012]');
    expect(screen.getByText('Math update').closest('article')).toHaveClass('border-[#e70012]');
  });

  it('uses the LMS blue theme with red notification accents for teachers', async () => {
    mockedUseAuth.mockReturnValue({
      role: 'teacher',
      user: {
        id: 'teacher-1',
        roles: ['teacher'],
        firstName: 'Ana',
        lastName: 'Reyes',
      },
    } as ReturnType<typeof useAuth>);

    render(<NotificationsPage />);

    const page = await screen.findByRole('main', { name: 'Teacher notifications' });
    expect(page).toHaveClass('bg-[#f4f7fb]');
    expect(page).toHaveClass('text-[#0f2340]');

    expect(screen.getByTestId('teacher-notifications-hero')).toHaveClass('bg-[#12284a]');
    expect(screen.getByTestId('teacher-notifications-hero')).toHaveClass('text-white');
    expect(screen.getByRole('button', { name: /Mark All Read/i })).toHaveClass('bg-[#e70012]');
    expect(screen.getByText('Math update').closest('article')).toHaveClass('border-[#e70012]');
  });

  it('filters to read notifications and keeps the existing mark all action', async () => {
    const markAllAsRead = jest.fn().mockResolvedValue(undefined);
    const fetchNotifications = jest.fn().mockResolvedValue(undefined);
    mockedUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 2,
      loading: false,
      fetchNotifications,
      markAsRead: jest.fn().mockResolvedValue(undefined),
      markAllAsRead,
    });

    mockedNotificationService.getAll
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'notif-1',
            userId: 'student-1',
            title: 'Unread item',
            message: 'Unread body',
            type: 'announcement',
            isRead: false,
            createdAt: '2026-04-11T12:00:00.000Z',
          },
        ],
        totalPages: 1,
        page: 1,
      } as Awaited<ReturnType<typeof notificationService.getAll>>)
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'notif-2',
            userId: 'student-1',
            title: 'Read item',
            message: 'Read body',
            type: 'announcement',
            isRead: true,
            createdAt: '2026-04-10T09:30:00.000Z',
          },
        ],
        totalPages: 1,
        page: 1,
      } as Awaited<ReturnType<typeof notificationService.getAll>>);

    render(<NotificationsPage />);

    expect(await screen.findByText('Unread item')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Read' }));

    expect(await screen.findByText('Read item')).toBeInTheDocument();
    expect(mockedNotificationService.getAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ isRead: true, page: 1, limit: 12 }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Mark All Read/i }));

    await waitFor(() => {
      expect(markAllAsRead).toHaveBeenCalled();
      expect(fetchNotifications).toHaveBeenCalled();
    });
  });
});

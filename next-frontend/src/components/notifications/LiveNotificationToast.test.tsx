import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import {
  NOTIFICATION_TOAST_LANE_ID,
  showLiveNotificationToast,
  showNotificationDigestToast,
} from './LiveNotificationToast';
import type { Notification } from '@/types/notification';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

jest.mock('sonner', () => ({
  toast: {
    custom: jest.fn(),
    dismiss: jest.fn(),
  },
}));

const notification: Notification = {
  id: 'notification-1',
  userId: 'user-1',
  type: 'announcement_posted',
  title: 'New announcement',
  message: 'A class announcement was posted.',
  isRead: false,
  createdAt: '2026-09-02T08:00:00.000Z',
};

describe('live notification presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses one stable lane and reports dismissal or automatic closure', () => {
    const onClose = jest.fn();

    showLiveNotificationToast(notification, 'teacher', { onClose });

    expect(toast.custom).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        id: NOTIFICATION_TOAST_LANE_ID,
        onDismiss: onClose,
        onAutoClose: onClose,
      }),
    );
  });

  it('renders a backlog digest and delegates its open action', () => {
    const onOpen = jest.fn();
    showNotificationDigestToast({ kind: 'backlog', count: 8, onOpen });
    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [() => React.ReactNode];

    render(renderToast());

    expect(screen.getByText('8 unread updates')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(toast.dismiss).toHaveBeenCalledWith(NOTIFICATION_TOAST_LANE_ID);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders an urgent summary in the intervention presentation', () => {
    showNotificationDigestToast({ kind: 'urgent', count: 3 });
    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [() => React.ReactNode];

    render(renderToast());

    expect(screen.getByText('3 urgent updates')).toBeInTheDocument();
    expect(screen.getByText('Intervention Alert')).toBeInTheDocument();
  });
});

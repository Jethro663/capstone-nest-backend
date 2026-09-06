import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import {
  NOTIFICATION_TOAST_LANE_ID,
  showNotificationDigestToast,
} from './LiveNotificationToast';

jest.mock('sonner', () => ({
  toast: {
    custom: jest.fn(),
    dismiss: jest.fn(),
  },
}));

describe('live notification presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['backlog', 'urgent', 'live', 'catch-up'] as const)(
    'uses one quiet top-right lane for %s notifications',
    (kind) => {
      const onClose = jest.fn();

      showNotificationDigestToast({ kind, count: 3, onClose });

      expect(toast.custom).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          id: NOTIFICATION_TOAST_LANE_ID,
          duration: 6000,
          position: 'top-right',
          onDismiss: onClose,
          onAutoClose: onClose,
        }),
      );
    },
  );

  it('renders only an aggregated unread summary and delegates its View action', () => {
    const onClose = jest.fn();
    const onOpen = jest.fn();

    showNotificationDigestToast({ kind: 'backlog', count: 8, onOpen, onClose });
    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [() => React.ReactNode];

    const { container } = render(renderToast());

    expect(screen.getByText('You have 8 unread notifications')).toBeInTheDocument();
    expect(screen.queryByText('Notification Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Intervention Alert')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View notifications' }));
    expect(toast.dismiss).toHaveBeenCalledWith(NOTIFICATION_TOAST_LANE_ID);
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification summary' }));
    expect(toast.dismiss).toHaveBeenCalledTimes(2);
  });

  it('uses singular notification copy', () => {
    showNotificationDigestToast({ kind: 'live', count: 1 });
    const [renderToast] = (toast.custom as jest.Mock).mock.calls[0] as [() => React.ReactNode];

    render(renderToast());

    expect(screen.getByText('You have 1 unread notification')).toBeInTheDocument();
  });
});

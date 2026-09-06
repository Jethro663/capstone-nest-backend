'use client';

import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import styles from './LiveNotificationToast.module.css';

function QuietNotificationToast({
  count,
  onOpen,
  onDismiss,
}: {
  count: number;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const safeCount = Math.max(1, Math.trunc(count));

  return (
    <article className={styles.toastCard} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        <Bell size={17} />
      </span>
      <p className={styles.message}>
        You have {safeCount} unread notification{safeCount === 1 ? '' : 's'}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.viewButton} onClick={onOpen}>
          View notifications
        </button>
        <button
          type="button"
          className={styles.dismissButton}
          aria-label="Dismiss notification summary"
          onClick={onDismiss}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export const NOTIFICATION_TOAST_LANE_ID = 'live-notification-lane';

export function dismissNotificationToastLane() {
  toast.dismiss(NOTIFICATION_TOAST_LANE_ID);
}

type NotificationDigestKind = 'backlog' | 'urgent' | 'live' | 'catch-up';

export function showNotificationDigestToast({
  count,
  onOpen,
  onClose,
}: {
  kind: NotificationDigestKind;
  count: number;
  onOpen?: () => void;
  onClose?: () => void;
}) {
  toast.custom(
    () => (
      <QuietNotificationToast
        count={count}
        onDismiss={() => toast.dismiss(NOTIFICATION_TOAST_LANE_ID)}
        onOpen={() => {
          toast.dismiss(NOTIFICATION_TOAST_LANE_ID);
          if (onOpen) {
            onOpen();
          } else {
            window.location.assign('/dashboard/notifications');
          }
        }}
      />
    ),
    {
      id: NOTIFICATION_TOAST_LANE_ID,
      duration: 6000,
      position: 'top-right',
      onDismiss: onClose,
      onAutoClose: onClose,
    },
  );
}

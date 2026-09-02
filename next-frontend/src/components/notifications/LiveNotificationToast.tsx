'use client';

import { BellRing, Sparkles, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  getNotificationMessage,
  isInterventionAlertNotification,
  resolveNotificationDestination,
  type NotificationRole,
} from '@/lib/notification-routing';
import type { Notification } from '@/types/notification';
import styles from './LiveNotificationToast.module.css';

function LiveNotificationToastCard({
  label,
  title,
  body,
  interventionAlert,
  onOpen,
  onDismiss,
}: {
  label: string;
  title: string;
  body: string;
  interventionAlert: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <article
      className={`${styles.toastCard} ${interventionAlert ? styles.toastCardIntervention : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.shimmer} />
      <div className={styles.content}>
        <header className={styles.headerRow}>
          <span className={`${styles.chip} ${interventionAlert ? styles.interventionChip : ''}`}>
            {interventionAlert ? <TriangleAlert size={12} /> : <BellRing size={12} />}
            {label}
          </span>
          <Sparkles size={14} className={interventionAlert ? 'text-rose-500' : 'text-blue-500'} />
        </header>

        <p className={styles.title}>{title}</p>
        <p className={styles.body}>{body}</p>

        <div className={styles.actions}>
          <button type="button" className={styles.openButton} onClick={onOpen}>
            Open
          </button>
          <button type="button" className={styles.dismissButton} onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>

      <Image
        src={interventionAlert ? '/images/JA/ja_live_notify.png' : '/images/JA/ja_wave.png'}
        alt=""
        className={`${styles.notificationCharacter} ${interventionAlert ? styles.interventionCharacter : styles.standardCharacter}`}
        aria-hidden="true"
        width={98}
        height={98}
      />
      <span className={styles.progressLine} />
    </article>
  );
}

export const NOTIFICATION_TOAST_LANE_ID = 'live-notification-lane';

export function dismissNotificationToastLane() {
  toast.dismiss(NOTIFICATION_TOAST_LANE_ID);
}

interface NotificationToastOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

export function showLiveNotificationToast(
  notification: Notification,
  role?: NotificationRole,
  options: NotificationToastOptions = {},
) {
  const interventionAlert = isInterventionAlertNotification(notification);
  const destination = resolveNotificationDestination(notification, role);
  const message = getNotificationMessage(notification);

  toast.custom(
    () => (
      <LiveNotificationToastCard
        label={interventionAlert ? 'Intervention Alert' : 'Live Update'}
        title={notification.title}
        body={message}
        interventionAlert={interventionAlert}
        onDismiss={() => toast.dismiss(NOTIFICATION_TOAST_LANE_ID)}
        onOpen={() => {
          toast.dismiss(NOTIFICATION_TOAST_LANE_ID);
          if (options.onOpen) {
            options.onOpen();
          } else {
            window.location.assign(destination);
          }
        }}
      />
    ),
    {
      id: NOTIFICATION_TOAST_LANE_ID,
      duration: interventionAlert ? 9000 : 7000,
      position: interventionAlert ? 'top-center' : 'top-right',
      onDismiss: options.onClose,
      onAutoClose: options.onClose,
    },
  );
}

type NotificationDigestKind = 'backlog' | 'urgent' | 'live' | 'catch-up';

export function showNotificationDigestToast({
  kind,
  count,
  onOpen,
  onClose,
}: {
  kind: NotificationDigestKind;
  count: number;
  onOpen?: () => void;
  onClose?: () => void;
}) {
  const plural = count === 1 ? 'update' : 'updates';
  const interventionAlert = kind === 'urgent';
  const title =
    kind === 'backlog'
      ? `${count} unread ${plural}`
      : kind === 'urgent'
        ? `${count} urgent ${plural}`
        : kind === 'catch-up'
          ? `${count} ${plural} while you were away`
          : `${count} new ${plural}`;
  const body =
    kind === 'urgent'
      ? 'Open notifications to review the intervention alerts that need attention.'
      : 'Open your notification center to review what changed.';

  toast.custom(
    () => (
      <LiveNotificationToastCard
        label={interventionAlert ? 'Intervention Alert' : 'Notification Summary'}
        title={title}
        body={body}
        interventionAlert={interventionAlert}
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
      duration: interventionAlert ? 9000 : 7000,
      position: interventionAlert ? 'top-center' : 'top-right',
      onDismiss: onClose,
      onAutoClose: onClose,
    },
  );
}

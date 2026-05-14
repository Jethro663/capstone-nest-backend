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
  title,
  body,
  interventionAlert,
  onOpen,
  onDismiss,
}: {
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
            {interventionAlert ? 'Intervention Alert' : 'Live Update'}
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

export function showLiveNotificationToast(notification: Notification, role?: NotificationRole) {
  const interventionAlert = isInterventionAlertNotification(notification);
  const toastId = `live-notification-${notification.id}`;
  const destination = resolveNotificationDestination(notification, role);
  const message = getNotificationMessage(notification);

  toast.custom(
    () => (
      <LiveNotificationToastCard
        title={notification.title}
        body={message}
        interventionAlert={interventionAlert}
        onDismiss={() => toast.dismiss(toastId)}
        onOpen={() => {
          toast.dismiss(toastId);
          window.location.assign(destination);
        }}
      />
    ),
    {
      id: toastId,
      duration: interventionAlert ? 9000 : 7000,
      position: interventionAlert ? 'top-center' : 'top-right',
    },
  );
}

'use client';

import { BellRing, Sparkles, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { Notification } from '@/types/notification';
import styles from './LiveNotificationToast.module.css';

const INTERVENTION_TERMS = ['intervention', 'at risk', 'at-risk', 'flagged'];

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function getNotificationMessage(notification: Pick<Notification, 'message' | 'body'>) {
  const message = notification.message?.trim();
  if (message) return message;
  return notification.body?.trim() || 'A new update is available.';
}

export function isInterventionAlertNotification(
  notification: Pick<Notification, 'type' | 'title' | 'message' | 'body'>,
) {
  const joined = normalizeText(
    `${notification.type} ${notification.title} ${notification.message ?? ''} ${notification.body ?? ''}`,
  );
  return INTERVENTION_TERMS.some((term) => joined.includes(term));
}

function resolveNotificationDestination(
  notification: Pick<Notification, 'type' | 'referenceId' | 'title' | 'message' | 'body'>,
) {
  if (isInterventionAlertNotification(notification)) {
    return '/dashboard/teacher/interventions';
  }
  if (notification.type === 'discussion_comment_posted' || notification.type === 'discussion_thread_posted') {
    return '/dashboard/notifications';
  }
  return '/dashboard/notifications';
}

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

      {interventionAlert ? (
        <Image
          src="/images/JA/ja_live_notify.png"
          alt=""
          className={styles.interventionCharacter}
          aria-hidden="true"
          width={92}
          height={92}
        />
      ) : null}
      <span className={styles.progressLine} />
    </article>
  );
}

export function showLiveNotificationToast(notification: Notification) {
  const interventionAlert = isInterventionAlertNotification(notification);
  const toastId = `live-notification-${notification.id}`;
  const destination = resolveNotificationDestination(notification);
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

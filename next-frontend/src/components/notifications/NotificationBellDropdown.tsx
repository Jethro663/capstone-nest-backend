'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Clock, Inbox, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import {
  getNotificationActionLabel,
  getNotificationMessage,
  resolveNotificationDestination,
} from '@/lib/notification-routing';
import { cn } from '@/utils/cn';
import type { Notification } from '@/types/notification';

const RECENT_NOTIFICATION_LIMIT = 8;

type NotificationBellDropdownProps = {
  buttonClassName?: string;
  badgeClassName?: string;
  iconClassName?: string;
};

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotificationBellDropdown({
  buttonClassName,
  badgeClassName,
  iconClassName,
}: NotificationBellDropdownProps) {
  const router = useRouter();
  const { role } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const recentNotifications = useMemo(
    () =>
      [...notifications]
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .slice(0, RECENT_NOTIFICATION_LIMIT),
    [notifications],
  );

  const label =
    unreadCount > 0
      ? `Open notifications panel (${unreadCount > 9 ? '9+' : unreadCount} unread)`
      : 'Open notifications panel';

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        void fetchNotifications();
      }
    },
    [fetchNotifications],
  );

  const handleOpenNotification = useCallback(
    async (notification: Notification) => {
      setOpeningId(notification.id);
      try {
        if (!notification.isRead) {
          await markAsRead(notification.id);
        }
        const destination = resolveNotificationDestination(notification, role);
        setOpen(false);
        router.push(destination);
      } finally {
        setOpeningId(null);
      }
    },
    [markAsRead, role, router],
  );

  const handleSeeAll = useCallback(() => {
    setOpen(false);
    router.push('/dashboard/notifications');
  }, [router]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={buttonClassName}
          title={label}
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="relative inline-flex">
            <Bell className={cn('h-5 w-5', iconClassName)} />
            {unreadCount > 0 ? (
              <span className={badgeClassName}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            ) : null}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-black text-slate-950">Notifications</p>
            <p className="text-xs font-medium text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}
            </p>
          </div>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
        </div>

        <div className="max-h-[24rem] overflow-y-auto scroll-smooth p-2">
          {recentNotifications.length === 0 ? (
            <div className="grid place-items-center gap-2 px-5 py-9 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Inbox className="h-5 w-5" />
              </span>
              <p className="text-sm font-bold text-slate-800">No recent notifications</p>
              <p className="text-xs leading-5 text-slate-500">
                Class updates, assessments, and alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentNotifications.map((notification) => {
                const actionLabel = getNotificationActionLabel(notification);
                const isOpening = openingId === notification.id;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={cn(
                      'group grid w-full grid-cols-[auto,minmax(0,1fr)] gap-3 rounded-xl border px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      notification.isRead
                        ? 'border-transparent bg-white'
                        : 'border-blue-100 bg-blue-50',
                    )}
                    onClick={() => void handleOpenNotification(notification)}
                  >
                    <span
                      className={cn(
                        'mt-1 h-2.5 w-2.5 rounded-full',
                        notification.isRead ? 'bg-slate-300' : 'bg-blue-600',
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-sm font-extrabold text-slate-900">
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-slate-500">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                        {getNotificationMessage(notification)}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(notification.createdAt)}
                        <span className="text-slate-300">/</span>
                        <span>{notification.isRead ? 'Read' : 'Unread'}</span>
                        <span className="text-slate-300">/</span>
                        <span>{isOpening ? 'Opening...' : actionLabel}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-extrabold text-white transition hover:bg-slate-800"
            onClick={handleSeeAll}
          >
            <CheckCircle2 className="h-4 w-4" />
            See All
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

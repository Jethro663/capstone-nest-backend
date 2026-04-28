'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Filter, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { notificationService } from '@/services/notification-service';
import type { Notification } from '@/types/notification';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
} from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentEmptyState, StudentSectionHeader, StudentStatusChip } from '@/components/student/student-primitives';

type ReadFilter = 'all' | 'unread' | 'read';

const PAGE_SIZE = 12;

function formatNotificationTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatNotificationRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const { user, role } = useAuth();
  const { unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const isStudent = user?.roles?.includes('student');
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<ReadFilter>('all');
  const [loading, setLoading] = useState(true);

  const backendFilter = useMemo(() => {
    if (filter === 'read') return true;
    if (filter === 'unread') return false;
    return undefined;
  }, [filter]);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.getAll({
        page,
        limit: PAGE_SIZE,
        isRead: backendFilter,
      });
      setItems(response.data ?? []);
      setTotalPages(response.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [backendFilter, page]);

  const unreadItemsOnPage = useMemo(
    () => items.filter((notification) => !notification.isRead).length,
    [items],
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPage(), fetchNotifications()]);
  }, [fetchNotifications, loadPage]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      await markAsRead(id);
      await refreshAll();
    },
    [markAsRead, refreshAll],
  );

  const handleMarkAll = useCallback(async () => {
    await markAllAsRead();
    await refreshAll();
  }, [markAllAsRead, refreshAll]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56 rounded-2xl" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
    );
  }

  if (isStudent) {
    return (
      <div
        role="main"
        aria-label="Student notifications"
        className="space-y-5 rounded-[1.35rem] bg-[#f4f7fb] p-4 text-[#0f2340] md:p-5"
      >
        <section
          data-testid="student-notifications-hero"
          className="overflow-hidden rounded-[1.15rem] bg-[#12284a] p-4 text-white shadow-[0_18px_38px_-30px_rgba(15,35,64,0.65)]"
        >
          <StudentSectionHeader
            title="Notifications"
            subtitle={`${unreadCount} unread update${unreadCount === 1 ? '' : 's'} waiting in your student inbox.`}
            className="[&_h2]:text-white [&_p]:text-[#d9e6ff]"
            action={(
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="border border-white/20 bg-white text-[#12284a] hover:bg-[#edf4ff]"
                  onClick={() => void refreshAll()}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button
                  size="sm"
                  className="bg-[#e70012] text-white hover:bg-[#c90010] disabled:bg-white/20 disabled:text-white/55"
                  onClick={() => void handleMarkAll()}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
                </Button>
              </div>
            )}
          />
        </section>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#d8e2ef] bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(15,35,64,0.42)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f728e]">Unread</p>
              <p className="mt-1 text-2xl font-bold text-[#e70012]">{unreadCount}</p>
            </div>
            <div className="rounded-2xl border border-[#d8e2ef] bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(15,35,64,0.42)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f728e]">On this page</p>
              <p className="mt-1 text-2xl font-bold text-[#12284a]">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-[#d8e2ef] bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(15,35,64,0.42)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f728e]">Need review</p>
              <p className="mt-1 text-2xl font-bold text-[#e70012]">{unreadItemsOnPage}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'unread', 'read'] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant="outline"
                className={
                  filter === value
                    ? 'border-[#e70012] bg-[#e70012] text-white hover:bg-[#c90010]'
                    : 'border-[#c9d6e8] bg-white text-[#183a63] hover:bg-[#edf4ff]'
                }
                onClick={() => setFilter(value)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-[#d8e2ef] bg-white p-3 shadow-[0_18px_38px_-34px_rgba(15,35,64,0.45)] sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8e2ef] px-1 pb-3">
            <div>
              <p className="text-sm font-semibold text-[#12284a]">Inbox</p>
              <p className="text-sm text-[#5f728e]">
                Review class alerts, announcement updates, and intervention prompts in one place.
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f728e]">
              {filter === 'all' ? 'Showing all updates' : filter === 'unread' ? 'Showing unread only' : 'Showing read only'}
            </p>
          </div>

          {items.length === 0 ? (
            <div className="pt-3">
              <StudentEmptyState
                title="No notifications"
                description="Class updates, returned grades, and announcements will appear here."
                icon={<Bell className="h-5 w-5" />}
              />
            </div>
          ) : (
            <div className="space-y-3 pt-3">
              {items.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-[1rem] border p-4 ${notification.isRead ? 'border-[#d8e2ef] bg-[#f8fbff]' : 'border-[#e70012] bg-[#fff8f9]'}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#12284a]">{notification.title}</p>
                        <StudentStatusChip tone={notification.isRead ? 'info' : 'warning'}>
                          {notification.isRead ? 'Read' : 'New'}
                        </StudentStatusChip>
                        <span className="rounded-full border border-[#c9d6e8] bg-[#edf4ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#183a63]">
                          {notification.type.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-[#314766]">{notification.message}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6c7f99]">
                        <span>{formatNotificationRelativeTime(notification.createdAt)}</span>
                        <span>{formatNotificationTimestamp(notification.createdAt)}</span>
                        {notification.readAt ? <span>Read {formatNotificationTimestamp(notification.readAt)}</span> : null}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-[#e70012] text-[#e70012] hover:bg-[#fff1f3] hover:text-[#c90010]"
                        onClick={() => void handleMarkRead(notification.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="pt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    const unreadItems = items.filter((notification) => !notification.isRead).length;
    const readItems = items.length - unreadItems;

    return (
      <AdminPageShell
        badge="Admin Notifications"
        title="Notifications"
        description="Review alerts, announcements, and system activity from one cleaner admin inbox."
        actions={(
          <div className="admin-controls">
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => void refreshAll()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl font-black"
              onClick={() => void handleMarkAll()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          </div>
        )}
        meta={(
          <>
            <div className="admin-compact-meta__item">
              <span className="admin-compact-meta__label">Unread</span>
              {unreadCount} pending
            </div>
            <div className="admin-compact-meta__item">
              <span className="admin-compact-meta__label">Visible</span>
              {items.length} on this page
            </div>
            <div className="admin-compact-meta__item">
              <span className="admin-compact-meta__label">View</span>
              {filter === 'all' ? 'All updates' : filter === 'unread' ? 'Unread only' : 'Read only'}
            </div>
            <div className="admin-compact-meta__item">
              <span className="admin-compact-meta__label">Pages</span>
              {page} / {Math.max(totalPages, 1)}
            </div>
          </>
        )}
      >
        <AdminSectionCard
          title="Inbox"
          description="Filter the inbox, scan the latest entries, and clear unread notices without moving between stacked cards."
          density="compact"
          contentClassName="space-y-5"
        >
          <div className="admin-notifications-toolbar">
            <div className="admin-notifications-filters">
              {(['all', 'unread', 'read'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={filter === value ? 'admin-button-solid rounded-xl font-black' : 'admin-button-outline rounded-xl font-black'}
                  onClick={() => setFilter(value)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}
                </Button>
              ))}
            </div>

            <div className="admin-notifications-summary">
              <div className="admin-notifications-summary__item">
                <span className="admin-notifications-summary__label">Unread</span>
                <strong>{unreadItems}</strong>
              </div>
              <div className="admin-notifications-summary__item">
                <span className="admin-notifications-summary__label">Read</span>
                <strong>{readItems}</strong>
              </div>
              <div className="admin-notifications-summary__item">
                <span className="admin-notifications-summary__label">Page</span>
                <strong>{page}</strong>
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <AdminEmptyState
              title="No notifications in this view"
              description="System alerts, announcements, and workflow events will appear here once they match the selected filter."
            />
          ) : (
            <div className="admin-notification-list">
              {items.map((notification) => (
                <article
                  key={notification.id}
                  className={`admin-notification-row ${notification.isRead ? 'admin-notification-row--read' : 'admin-notification-row--unread'}`}
                >
                  <div className="admin-notification-row__icon">
                    <Bell className="h-4 w-4" />
                  </div>

                  <div className="admin-notification-row__body">
                    <div className="admin-notification-row__head">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="admin-notification-row__title">{notification.title}</p>
                          <span className={`admin-notification-row__status ${notification.isRead ? 'is-read' : 'is-unread'}`}>
                            {notification.isRead ? 'Read' : 'Unread'}
                          </span>
                          <span className="admin-notification-row__type">
                            {notification.type.replaceAll('_', ' ')}
                          </span>
                        </div>
                        <p className="admin-notification-row__message">{notification.message}</p>
                      </div>

                      {!notification.isRead ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="admin-button-outline rounded-xl font-black"
                          onClick={() => void handleMarkRead(notification.id)}
                        >
                          Mark Read
                        </Button>
                      ) : null}
                    </div>

                    <div className="admin-notification-row__meta">
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      {notification.readAt ? <span>Read {new Date(notification.readAt).toLocaleString()}</span> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="admin-notifications-pagination">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="admin-button-outline rounded-xl font-black"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-[var(--admin-text-muted)]">
              Page {page} of {Math.max(totalPages, 1)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="admin-button-outline rounded-xl font-black"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </AdminSectionCard>
      </AdminPageShell>
    );
  }

  return (
    <div
      role="main"
      aria-label="Teacher notifications"
      className="mx-auto max-w-6xl space-y-5 rounded-[1.35rem] bg-[#f4f7fb] p-4 text-[#0f2340] md:p-5"
    >
      <section
        data-testid="teacher-notifications-hero"
        className="overflow-hidden rounded-[1.15rem] bg-[#12284a] p-4 text-white shadow-[0_18px_38px_-30px_rgba(15,35,64,0.65)]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#d9e6ff]">Teacher inbox</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Notifications</h1>
            <p className="mt-1 text-sm text-[#d9e6ff]">
              {unreadCount} unread update{unreadCount === 1 ? '' : 's'} from classes, assessments, and school activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="border border-white/20 bg-white text-[#12284a] hover:bg-[#edf4ff]"
              onClick={() => void refreshAll()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button
              size="sm"
              className="bg-[#e70012] text-white hover:bg-[#c90010] disabled:bg-white/20 disabled:text-white/55"
              onClick={() => void handleMarkAll()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#d8e2ef] bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(15,35,64,0.42)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f728e]">Unread</p>
            <p className="mt-1 text-2xl font-bold text-[#e70012]">{unreadCount}</p>
          </div>
          <div className="rounded-2xl border border-[#d8e2ef] bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(15,35,64,0.42)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f728e]">Visible</p>
            <p className="mt-1 text-2xl font-bold text-[#12284a]">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-[#d8e2ef] bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(15,35,64,0.42)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f728e]">Need review</p>
            <p className="mt-1 text-2xl font-bold text-[#e70012]">{unreadItemsOnPage}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'unread', 'read'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant="outline"
              className={
                filter === value
                  ? 'border-[#e70012] bg-[#e70012] text-white hover:bg-[#c90010]'
                  : 'border-[#c9d6e8] bg-white text-[#183a63] hover:bg-[#edf4ff]'
              }
              onClick={() => setFilter(value)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-[1.15rem] border border-[#d8e2ef] bg-white p-3 shadow-[0_18px_38px_-34px_rgba(15,35,64,0.45)] sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8e2ef] px-1 pb-3">
          <div>
            <p className="text-sm font-semibold text-[#12284a]">Inbox</p>
            <p className="text-sm text-[#5f728e]">
              Scan class alerts, assessment reminders, and school updates without leaving the teacher workspace.
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f728e]">
            {filter === 'all' ? 'Showing all updates' : filter === 'unread' ? 'Showing unread only' : 'Showing read only'}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="pt-3">
            <StudentEmptyState
              title="No notifications"
              description="Class alerts, assessment updates, and school notices will appear here."
              icon={<Bell className="h-5 w-5" />}
            />
          </div>
        ) : (
          <div className="space-y-3 pt-3">
            {items.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-[1rem] border p-4 ${notification.isRead ? 'border-[#d8e2ef] bg-[#f8fbff]' : 'border-[#e70012] bg-[#fff8f9]'}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#12284a]">{notification.title}</p>
                      <StudentStatusChip tone={notification.isRead ? 'info' : 'warning'}>
                        {notification.isRead ? 'Read' : 'New'}
                      </StudentStatusChip>
                      <span className="rounded-full border border-[#c9d6e8] bg-[#edf4ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#183a63]">
                        {notification.type.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-[#314766]">{notification.message}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6c7f99]">
                      <span>{formatNotificationRelativeTime(notification.createdAt)}</span>
                      <span>{formatNotificationTimestamp(notification.createdAt)}</span>
                      {notification.readAt ? <span>Read {formatNotificationTimestamp(notification.readAt)}</span> : null}
                    </div>
                  </div>
                  {!notification.isRead && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-[#e70012] text-[#e70012] hover:bg-[#fff1f3] hover:text-[#c90010]"
                      onClick={() => void handleMarkRead(notification.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm student-muted-text">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

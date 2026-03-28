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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentActionCard, StudentEmptyState, StudentSectionHeader, StudentStatusChip } from '@/components/student/student-primitives';

type ReadFilter = 'all' | 'unread' | 'read';

const PAGE_SIZE = 12;

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
      <div className="student-page space-y-6 rounded-3xl p-1">
        <StudentActionCard className="border-0 bg-[var(--student-accent)] text-[var(--student-accent-contrast)]">
          <StudentSectionHeader
            title="Notifications"
            subtitle={`${unreadCount} unread update${unreadCount === 1 ? '' : 's'} waiting for you.`}
            className="[&_h2]:text-[var(--student-accent-contrast)] [&_p]:text-[var(--student-accent-contrast)]/75"
            action={(
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => void refreshAll()}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void handleMarkAll()} disabled={unreadCount === 0}>
                  <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
                </Button>
              </div>
            )}
          />
        </StudentActionCard>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'unread', 'read'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? 'default' : 'outline'}
              className={filter === value ? 'student-button-solid' : 'student-button-outline'}
              onClick={() => setFilter(value)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}
            </Button>
          ))}
        </div>

        {items.length === 0 ? (
          <StudentEmptyState
            title="No notifications"
            description="Class updates, returned grades, and announcements will appear here."
            icon={<Bell className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-3">
            {items.map((notification) => (
              <StudentActionCard key={notification.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--student-text-strong)]">{notification.title}</p>
                      <StudentStatusChip tone={notification.isRead ? 'info' : 'warning'}>
                        {notification.isRead ? 'Read' : 'New'}
                      </StudentStatusChip>
                    </div>
                    <p className="text-sm student-muted-text">{notification.message}</p>
                    <p className="text-xs student-muted-text">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      type="button"
                      size="sm"
                      className="student-button-outline"
                      onClick={() => void handleMarkRead(notification.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </StudentActionCard>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">{unreadCount} unread</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refreshAll()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => void handleMarkAll()} disabled={unreadCount === 0}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'unread', 'read'] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 items-center justify-center text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((notification) => (
            <Card key={notification.id} className={notification.isRead ? 'opacity-70' : ''}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                  {!notification.isRead && (
                    <Button size="sm" variant="outline" onClick={() => void handleMarkRead(notification.id)}>
                      Mark Read
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}

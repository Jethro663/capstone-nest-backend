import { isInterventionAlertNotification } from '@/lib/notification-routing';
import type { Notification } from '@/types/notification';

export const NOTIFICATION_BACKLOG_COOLDOWN_MS = 5 * 60 * 60 * 1000;
export const NOTIFICATION_SURFACE_URGENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const NOTIFICATION_SURFACE_VERSION = 1 as const;
const MAX_SURFACED_URGENT = 100;
const STORAGE_KEY_PREFIX = 'nexora:notification-surface:v1:';

export interface NotificationSurfaceState {
  version: typeof NOTIFICATION_SURFACE_VERSION;
  lastBacklogDigestAt: number | null;
  surfacedUrgent: Array<{ id: string; surfacedAt: number }>;
}

export type NotificationBacklogPresentation =
  | { kind: 'none' }
  | { kind: 'backlog-digest'; unreadCount: number }
  | { kind: 'urgent'; notifications: Notification[] };

function emptyNotificationSurfaceState(): NotificationSurfaceState {
  return {
    version: NOTIFICATION_SURFACE_VERSION,
    lastBacklogDigestAt: null,
    surfacedUrgent: [],
  };
}

function getBrowserStorage(storage?: Storage | null) {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeUrgentEntries(value: unknown, now: number) {
  if (!Array.isArray(value)) return [];

  const newestById = new Map<string, number>();
  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object') return;
    const { id, surfacedAt } = candidate as { id?: unknown; surfacedAt?: unknown };
    if (typeof id !== 'string' || !id || typeof surfacedAt !== 'number') return;
    if (!Number.isFinite(surfacedAt) || surfacedAt < 0 || surfacedAt > now) return;
    if (now - surfacedAt > NOTIFICATION_SURFACE_URGENT_RETENTION_MS) return;
    newestById.set(id, Math.max(newestById.get(id) ?? 0, surfacedAt));
  });

  return [...newestById.entries()]
    .map(([id, surfacedAt]) => ({ id, surfacedAt }))
    .sort((left, right) => right.surfacedAt - left.surfacedAt)
    .slice(0, MAX_SURFACED_URGENT);
}

function normalizeNotificationSurfaceState(value: unknown, now: number): NotificationSurfaceState {
  if (!value || typeof value !== 'object') return emptyNotificationSurfaceState();
  const candidate = value as Partial<NotificationSurfaceState>;
  if (candidate.version !== NOTIFICATION_SURFACE_VERSION) return emptyNotificationSurfaceState();

  const lastBacklogDigestAt = candidate.lastBacklogDigestAt;
  if (
    lastBacklogDigestAt !== null &&
    (typeof lastBacklogDigestAt !== 'number' ||
      !Number.isFinite(lastBacklogDigestAt) ||
      lastBacklogDigestAt < 0 ||
      lastBacklogDigestAt > now)
  ) {
    return emptyNotificationSurfaceState();
  }

  return {
    version: NOTIFICATION_SURFACE_VERSION,
    lastBacklogDigestAt,
    surfacedUrgent: normalizeUrgentEntries(candidate.surfacedUrgent, now),
  };
}

export function getNotificationSurfaceStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function readNotificationSurfaceState(
  userId: string,
  now = Date.now(),
  storage?: Storage | null,
): NotificationSurfaceState {
  const target = getBrowserStorage(storage);
  if (!target) return emptyNotificationSurfaceState();

  try {
    const raw = target.getItem(getNotificationSurfaceStorageKey(userId));
    if (!raw) return emptyNotificationSurfaceState();
    return normalizeNotificationSurfaceState(JSON.parse(raw), now);
  } catch {
    return emptyNotificationSurfaceState();
  }
}

export function writeNotificationSurfaceState(
  userId: string,
  state: NotificationSurfaceState,
  storage?: Storage | null,
) {
  const target = getBrowserStorage(storage);
  if (!target) return false;

  try {
    target.setItem(getNotificationSurfaceStorageKey(userId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function evaluateNotificationBacklogPresentation({
  notifications,
  unreadCount,
  state,
  now,
}: {
  notifications: Notification[];
  unreadCount: number;
  state: NotificationSurfaceState;
  now: number;
}): { presentation: NotificationBacklogPresentation; state: NotificationSurfaceState } {
  const surfacedUrgentIds = new Set(state.surfacedUrgent.map((entry) => entry.id));
  const urgentNotifications = notifications.filter(
    (notification) =>
      !notification.isRead &&
      !surfacedUrgentIds.has(notification.id) &&
      isInterventionAlertNotification(notification),
  );

  if (urgentNotifications.length > 0) {
    const nextState = normalizeNotificationSurfaceState(
      {
        version: NOTIFICATION_SURFACE_VERSION,
        lastBacklogDigestAt: now,
        surfacedUrgent: [
          ...urgentNotifications.map((notification) => ({ id: notification.id, surfacedAt: now })),
          ...state.surfacedUrgent,
        ],
      },
      now,
    );
    return {
      presentation: { kind: 'urgent', notifications: urgentNotifications },
      state: nextState,
    };
  }

  const cooldownElapsed =
    state.lastBacklogDigestAt === null ||
    now - state.lastBacklogDigestAt >= NOTIFICATION_BACKLOG_COOLDOWN_MS;

  if (unreadCount > 0 && cooldownElapsed) {
    return {
      presentation: { kind: 'backlog-digest', unreadCount },
      state: { ...state, lastBacklogDigestAt: now },
    };
  }

  return { presentation: { kind: 'none' }, state };
}

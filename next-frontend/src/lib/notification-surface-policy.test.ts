import type { Notification } from '@/types/notification';
import {
  NOTIFICATION_BACKLOG_COOLDOWN_MS,
  NOTIFICATION_SURFACE_URGENT_RETENTION_MS,
  evaluateNotificationBacklogPresentation,
  getNotificationSurfaceStorageKey,
  readNotificationSurfaceState,
  writeNotificationSurfaceState,
  type NotificationSurfaceState,
} from './notification-surface-policy';

const NOW = Date.parse('2026-09-02T08:00:00.000Z');

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: 'announcement_posted',
    title: 'New announcement',
    message: 'A class announcement was posted.',
    isRead: false,
    createdAt: '2026-09-02T07:00:00.000Z',
    ...overrides,
  };
}

function emptyState(overrides: Partial<NotificationSurfaceState> = {}): NotificationSurfaceState {
  return {
    version: 1,
    lastBacklogDigestAt: null,
    surfacedUrgent: [],
    ...overrides,
  };
}

describe('notification surface policy', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows one backlog digest on first entry and suppresses it until the five-hour boundary', () => {
    const first = evaluateNotificationBacklogPresentation({
      notifications: [notification(), notification({ id: 'notification-2' })],
      unreadCount: 7,
      state: emptyState(),
      now: NOW,
    });

    expect(first.presentation).toEqual({ kind: 'backlog-digest', unreadCount: 7 });
    expect(first.state.lastBacklogDigestAt).toBe(NOW);

    const early = evaluateNotificationBacklogPresentation({
      notifications: [notification()],
      unreadCount: 7,
      state: first.state,
      now: NOW + NOTIFICATION_BACKLOG_COOLDOWN_MS - 1,
    });
    expect(early.presentation).toEqual({ kind: 'none' });

    const eligible = evaluateNotificationBacklogPresentation({
      notifications: [notification()],
      unreadCount: 7,
      state: first.state,
      now: NOW + NOTIFICATION_BACKLOG_COOLDOWN_MS,
    });
    expect(eligible.presentation).toEqual({ kind: 'backlog-digest', unreadCount: 7 });
  });

  it('surfaces unread urgent notifications once even during cooldown and starts a new window', () => {
    const urgent = notification({
      id: 'urgent-1',
      type: 'student_at_risk',
      title: 'Learner at risk',
    });
    const state = emptyState({ lastBacklogDigestAt: NOW - 60_000 });

    const first = evaluateNotificationBacklogPresentation({
      notifications: [urgent],
      unreadCount: 1,
      state,
      now: NOW,
    });

    expect(first.presentation).toEqual({ kind: 'urgent', notifications: [urgent] });
    expect(first.state).toEqual({
      version: 1,
      lastBacklogDigestAt: NOW,
      surfacedUrgent: [{ id: 'urgent-1', surfacedAt: NOW }],
    });

    const repeated = evaluateNotificationBacklogPresentation({
      notifications: [urgent],
      unreadCount: 1,
      state: first.state,
      now: NOW + 60_000,
    });
    expect(repeated.presentation).toEqual({ kind: 'none' });
  });

  it('persists only account-scoped timestamps and ids', () => {
    const state = emptyState({
      lastBacklogDigestAt: NOW,
      surfacedUrgent: [{ id: 'urgent-1', surfacedAt: NOW }],
    });

    expect(writeNotificationSurfaceState('user-1', state)).toBe(true);
    expect(readNotificationSurfaceState('user-1', NOW)).toEqual(state);
    expect(readNotificationSurfaceState('user-2', NOW)).toEqual(emptyState());

    const raw = window.localStorage.getItem(getNotificationSurfaceStorageKey('user-1')) ?? '';
    expect(raw).not.toContain('Learner at risk');
    expect(raw).not.toContain('announcement');
  });

  it('recovers from malformed and future-dated state', () => {
    window.localStorage.setItem(getNotificationSurfaceStorageKey('user-1'), '{bad-json');
    expect(readNotificationSurfaceState('user-1', NOW)).toEqual(emptyState());

    window.localStorage.setItem(
      getNotificationSurfaceStorageKey('user-1'),
      JSON.stringify({
        version: 1,
        lastBacklogDigestAt: NOW + 1,
        surfacedUrgent: [{ id: 'urgent-1', surfacedAt: NOW + 1 }],
      }),
    );
    expect(readNotificationSurfaceState('user-1', NOW)).toEqual(emptyState());
  });

  it('falls back safely when browser storage is unavailable', () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {
        throw new Error('storage disabled');
      },
    } as unknown as Storage;

    expect(readNotificationSurfaceState('user-1', NOW, unavailableStorage)).toEqual(emptyState());
    expect(writeNotificationSurfaceState('user-1', emptyState(), unavailableStorage)).toBe(false);
  });

  it('prunes expired urgent entries and retains only the newest one hundred', () => {
    const surfacedUrgent = Array.from({ length: 105 }, (_, index) => ({
      id: `urgent-${index}`,
      surfacedAt: NOW - index,
    }));
    surfacedUrgent.push({
      id: 'expired',
      surfacedAt: NOW - NOTIFICATION_SURFACE_URGENT_RETENTION_MS - 1,
    });
    window.localStorage.setItem(
      getNotificationSurfaceStorageKey('user-1'),
      JSON.stringify({ version: 1, lastBacklogDigestAt: null, surfacedUrgent }),
    );

    const state = readNotificationSurfaceState('user-1', NOW);

    expect(state.surfacedUrgent).toHaveLength(100);
    expect(state.surfacedUrgent[0]).toEqual({ id: 'urgent-0', surfacedAt: NOW });
    expect(state.surfacedUrgent.some((entry) => entry.id === 'expired')).toBe(false);
  });
});

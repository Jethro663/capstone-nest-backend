import { useEffect, useRef } from 'react';
import { useNotifications } from '@/providers/NotificationProvider';

type DiscussionRealtimeRefreshOptions = {
  enabled: boolean;
  selectedThreadId: string | null;
  refreshThreads: () => Promise<void> | void;
  refreshThread: (threadId: string) => Promise<void> | void;
};

const DISCUSSION_NOTIFICATION_TYPES = new Set([
  'discussion_thread_posted',
  'discussion_comment_posted',
]);

export function useDiscussionRealtimeRefresh({
  enabled,
  selectedThreadId,
  refreshThreads,
  refreshThread,
}: DiscussionRealtimeRefreshOptions) {
  const { subscribe } = useNotifications();
  const selectedThreadIdRef = useRef(selectedThreadId);
  const refreshThreadsRef = useRef(refreshThreads);
  const refreshThreadRef = useRef(refreshThread);
  const queuedThreadIdsRef = useRef(new Set<string>());
  const flushTimerRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    refreshThreadsRef.current = refreshThreads;
  }, [refreshThreads]);

  useEffect(() => {
    refreshThreadRef.current = refreshThread;
  }, [refreshThread]);

  useEffect(() => {
    async function flushQueue() {
      if (refreshInFlightRef.current) return;

      const pendingIds = Array.from(queuedThreadIdsRef.current);
      if (pendingIds.length === 0) return;
      queuedThreadIdsRef.current.clear();
      refreshInFlightRef.current = true;

      try {
        await refreshThreadsRef.current();
        const currentThreadId = selectedThreadIdRef.current;
        if (currentThreadId && pendingIds.includes(currentThreadId)) {
          await refreshThreadRef.current(currentThreadId);
        }
      } finally {
        refreshInFlightRef.current = false;
        if (queuedThreadIdsRef.current.size > 0) {
          const jitterMs = 180 + Math.floor(Math.random() * 2000);
          flushTimerRef.current = window.setTimeout(() => {
            flushTimerRef.current = null;
            void flushQueue();
          }, jitterMs);
        }
      }
    }

    if (!enabled) {
      queuedThreadIdsRef.current.clear();
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      return;
    }

    const unsubscribe = subscribe((notification) => {
      if (!DISCUSSION_NOTIFICATION_TYPES.has(notification.type)) return;
      const threadId = notification.referenceId ?? null;
      if (!threadId) return;

      queuedThreadIdsRef.current.add(threadId);
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
      const jitterMs = 180 + Math.floor(Math.random() * 2000);
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        void flushQueue();
      }, jitterMs);
    });

    return () => {
      unsubscribe();
      queuedThreadIdsRef.current.clear();
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [enabled, subscribe]);
}

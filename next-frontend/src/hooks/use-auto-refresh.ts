import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that auto-refreshes data at a specified interval.
 * Pauses when the tab is not visible.
 *
 * @param callback - Async function to call on each interval tick
 * @param intervalMs - Interval in milliseconds (default 30s)
 * @param enabled - Whether the auto-refresh is active (default true)
 */
export function useAutoRefresh(
  callback: () => Promise<void> | void,
  intervalMs = 30_000,
  enabled = true,
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const tick = useCallback(() => {
    if (document.visibilityState === 'visible') {
      savedCallback.current();
    }
  }, []);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, intervalMs, enabled]);
}

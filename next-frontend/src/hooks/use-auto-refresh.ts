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
  runImmediately = false,
) {
  const savedCallback = useRef(callback);
  const inFlightRef = useRef(false);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const runCallback = useCallback(() => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    Promise.resolve(savedCallback.current()).finally(() => {
      inFlightRef.current = false;
    });
  }, []);

  const tick = useCallback(() => {
    if (document.visibilityState === 'visible') {
      runCallback();
    }
  }, [runCallback]);

  useEffect(() => {
    if (!enabled || !runImmediately || document.visibilityState !== 'visible') return;

    const timeoutId = window.setTimeout(() => {
      runCallback();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [enabled, runImmediately, runCallback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, intervalMs, enabled]);
}

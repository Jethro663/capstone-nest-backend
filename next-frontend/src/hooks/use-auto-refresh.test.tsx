import { renderHook } from '@testing-library/react';
import { useAutoRefresh } from './use-auto-refresh';

describe('useAutoRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not overlap async refresh executions', async () => {
    let resolveFirstRun: (() => void) | null = null;
    const callback = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstRun = resolve;
        }),
    );

    renderHook(() => useAutoRefresh(callback, 1000, true, true));

    await jest.runOnlyPendingTimersAsync();
    expect(callback).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(3000);
    expect(callback).toHaveBeenCalledTimes(1);

    resolveFirstRun?.();
    await Promise.resolve();

    await jest.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

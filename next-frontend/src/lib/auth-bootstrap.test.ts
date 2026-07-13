import { settleWithTimeout } from './auth-bootstrap';

describe('settleWithTimeout', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears the timeout after the primary promise settles', async () => {
    jest.useFakeTimers();

    await expect(
      settleWithTimeout(Promise.resolve('primary'), 5_000, 'fallback'),
    ).resolves.toBe('primary');

    expect(jest.getTimerCount()).toBe(0);
  });

  it('returns the fallback when the timeout wins', async () => {
    jest.useFakeTimers();
    const pending = new Promise<string>(() => undefined);
    const result = settleWithTimeout(pending, 5_000, 'fallback');

    await jest.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toBe('fallback');
    expect(jest.getTimerCount()).toBe(0);
  });
});

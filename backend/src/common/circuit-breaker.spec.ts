import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    jest.useRealTimers();
    cb = new CircuitBreaker({
      failureThreshold: 3,
      cooldownMs: 1000,
      halfOpenMaxAttempts: 1,
      name: 'test',
    });
  });

  it('starts in CLOSED state', () => {
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.allowRequest()).toBe(true);
    expect(cb.getConsecutiveFailures()).toBe(0);
  });

  it('transitions to OPEN after failureThreshold consecutive failures', () => {
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.allowRequest()).toBe(true);

    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
  });

  it('fast-fails when OPEN', () => {
    for (let i = 0; i < 3; i++) cb.recordFailure();
    expect(cb.allowRequest()).toBe(false);
  });

  it('does not trip on failures below threshold', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.getConsecutiveFailures()).toBe(0);
    expect(cb.getState()).toBe('CLOSED');
  });

  it('resets on success', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.getConsecutiveFailures()).toBe(0);
    expect(cb.getState()).toBe('CLOSED');
  });

  it('transitions to HALF_OPEN after cooldown', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 3; i++) cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    jest.advanceTimersByTime(1000);
    expect(cb.allowRequest()).toBe(true);
    expect(cb.getState()).toBe('HALF_OPEN');
  });

  it('transitions to CLOSED on successful HALF_OPEN probe', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 3; i++) cb.recordFailure();
    jest.advanceTimersByTime(1000);

    cb.allowRequest(); // enters HALF_OPEN
    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(0);
  });

  it('transitions to OPEN on failed HALF_OPEN probe', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 3; i++) cb.recordFailure();
    jest.advanceTimersByTime(1000);

    cb.allowRequest(); // enters HALF_OPEN
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
  });

  it('limits HALF_OPEN attempts to halfOpenMaxAttempts', () => {
    jest.useFakeTimers();
    cb = new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 500,
      halfOpenMaxAttempts: 2,
    });

    for (let i = 0; i < 2; i++) cb.recordFailure();
    jest.advanceTimersByTime(500);

    expect(cb.allowRequest()).toBe(true);
    expect(cb.allowRequest()).toBe(true);
    expect(cb.allowRequest()).toBe(false);
  });

  it('reports cooldownRemainingMs correctly', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 3; i++) cb.recordFailure();

    expect(cb.getCooldownRemainingMs()).toBe(1000);
    jest.advanceTimersByTime(500);
    expect(cb.getCooldownRemainingMs()).toBe(500);
    jest.advanceTimersByTime(500);
    expect(cb.getCooldownRemainingMs()).toBe(0);
  });

  it('returns 0 cooldown when not OPEN', () => {
    expect(cb.getCooldownRemainingMs()).toBe(0);
  });
});

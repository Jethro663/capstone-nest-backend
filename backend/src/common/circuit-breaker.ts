export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxAttempts: number;
  name: string;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private halfOpenAttempts = 0;
  private readonly opts: CircuitBreakerOptions;

  constructor(options?: Partial<CircuitBreakerOptions>) {
    this.opts = {
      failureThreshold: options?.failureThreshold ?? 5,
      cooldownMs: options?.cooldownMs ?? 60_000,
      halfOpenMaxAttempts: options?.halfOpenMaxAttempts ?? 1,
      name: options?.name ?? 'circuit-breaker',
    };
  }

  getState(): CircuitState {
    return this.state;
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  getCooldownRemainingMs(): number {
    if (this.state !== 'OPEN') return 0;
    const elapsed = Date.now() - this.openedAt;
    return Math.max(0, this.opts.cooldownMs - elapsed);
  }

  allowRequest(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.opts.cooldownMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
        return this.allowRequest();
      }
      return false;
    }

    // HALF_OPEN
    if (this.halfOpenAttempts < this.opts.halfOpenMaxAttempts) {
      this.halfOpenAttempts++;
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.reset();
      return;
    }
    this.consecutiveFailures = 0;
  }

  recordFailure(): void {
    if (this.state === 'HALF_OPEN') {
      this.trip();
      return;
    }

    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.opts.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'OPEN';
    this.openedAt = Date.now();
    this.halfOpenAttempts = 0;
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.openedAt = 0;
    this.halfOpenAttempts = 0;
  }
}

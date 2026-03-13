/**
 * Parses a JWT expiry string (e.g. '7d', '24h', '30m', '60s') to milliseconds.
 * Returns the fallback (default: 7 days) if the value is missing or unparseable.
 */
export function parseExpiryMs(
  expiry: string | undefined,
  fallbackMs = 7 * 24 * 60 * 60 * 1000,
): number {
  if (!expiry) return fallbackMs;
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return fallbackMs;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return parseInt(match[1], 10) * multipliers[match[2]];
}

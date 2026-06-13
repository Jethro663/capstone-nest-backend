/** How long (in minutes) an OTP remains valid. Referenced by OtpService, MailService. */
export const OTP_TTL_MINUTES = 10;

/** Circuit breaker defaults for AiProxyService. */
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
export const CIRCUIT_BREAKER_COOLDOWN_MS = 60_000;

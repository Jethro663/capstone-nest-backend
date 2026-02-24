import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { refreshTokens } from '../../drizzle/schema';
import { otpVerifications } from '../../drizzle/schema';
import { lt, or, eq, and } from 'drizzle-orm';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Runs every day at 03:00 AM — deletes expired or revoked refresh token rows
   * to prevent the refresh_tokens table from growing unboundedly.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTokens(): Promise<void> {
    this.logger.log('[TOKEN-CLEANUP] Starting expired/revoked token cleanup...');

    try {
      const now = new Date();

      const result = await this.dbService.db
        .delete(refreshTokens)
        .where(
          or(
            // All expired tokens
            lt(refreshTokens.expiresAt, now),
            // Revoked tokens older than 24 hours (keep recent ones for audit window)
            and(
              eq(refreshTokens.revoked, true),
              lt(refreshTokens.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
            ),
          ),
        )
        .returning({ id: refreshTokens.id });

      this.logger.log(
        `[TOKEN-CLEANUP] Removed ${result.length} expired/revoked token rows.`,
      );
    } catch (error) {
      this.logger.error(
        '[TOKEN-CLEANUP] Cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Runs every hour — deletes expired or used OTP rows to prevent the
   * otp_verifications table from growing unboundedly (expired rows are
   * otherwise only removed lazily on the next verify attempt).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtps(): Promise<void> {
    this.logger.log('[OTP-CLEANUP] Starting expired/used OTP cleanup...');

    try {
      const now = new Date();

      const result = await this.dbService.db
        .delete(otpVerifications)
        .where(
          or(
            // All expired unused OTPs
            and(
              lt(otpVerifications.expiresAt, now),
              eq(otpVerifications.isUsed, false),
            ),
            // Used OTPs older than 7 days (keep recent ones for audit)
            and(
              eq(otpVerifications.isUsed, true),
              lt(
                otpVerifications.createdAt,
                new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
              ),
            ),
          ),
        )
        .returning({ id: otpVerifications.id });

      this.logger.log(
        `[OTP-CLEANUP] Removed ${result.length} expired/used OTP rows.`,
      );
    } catch (error) {
      this.logger.error(
        '[OTP-CLEANUP] OTP cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

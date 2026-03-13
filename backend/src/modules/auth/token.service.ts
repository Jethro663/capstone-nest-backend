import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { refreshTokens } from '../../drizzle/schema';
import { eq, and, gt } from 'drizzle-orm';
import { parseExpiryMs } from './utils/parse-expiry.util';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  generateRawRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  /**
   * Parse a JWT expiry string (e.g. '7d', '24h', '30m') to milliseconds.
   * Falls back to 7 days if the config value is missing or unparseable.
   */
  private refreshTtlMs(): number {
    return parseExpiryMs(
      this.configService.get<string>('jwt.refreshTokenExpiry'),
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Persist a hashed refresh-token row after a successful login or rotation.
   */
  async storeRefreshToken(
    userId: string,
    rawToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    await this.dbService.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      revoked: false,
      expiresAt,
    });
  }

  /**
   * On POST /auth/refresh — fully atomic via a DB transaction:
   *
   *  1. Attempt to UPDATE the row to revoked=true WHERE revoked=false AND not expired.
   *     This is a single check-and-set operation — only one concurrent request wins.
   *  2. If UPDATE matched 0 rows, inspect why:
   *     - Row exists + already revoked → reuse attack: wipe all sessions.
   *     - Row doesn't exist / expired  → generic invalid.
   *  3. If UPDATE succeeded, insert the new token in the same transaction.
   *
   * Returns `{ newRawToken, userId }` so the caller can issue a fresh access JWT.
   */
  async validateAndRotate(
    rawToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ newRawToken: string; userId: string }> {
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    return await this.dbService.db.transaction(async (tx) => {
      // Atomically revoke only if the token is valid and not yet consumed
      const [consumed] = await tx
        .update(refreshTokens)
        .set({ revoked: true })
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            eq(refreshTokens.revoked, false),
            gt(refreshTokens.expiresAt, now),
          ),
        )
        .returning();

      if (!consumed) {
        // Determine why the update matched nothing
        const [existing] = await tx
          .select()
          .from(refreshTokens)
          .where(eq(refreshTokens.tokenHash, tokenHash))
          .limit(1);

        if (existing?.revoked) {
          // Token was already revoked — potential token reuse / theft
          this.logger.warn(
            `[SECURITY] Revoked refresh token reuse detected for user ` +
              `${existing.userId} from IP ${ip ?? 'unknown'}. Revoking all active sessions.`,
          );
          await tx
            .update(refreshTokens)
            .set({ revoked: true })
            .where(
              and(
                eq(refreshTokens.userId, existing.userId),
                eq(refreshTokens.revoked, false),
              ),
            );
          throw new UnauthorizedException(
            'Refresh token reuse detected. All sessions have been revoked for your security.',
          );
        }

        throw new UnauthorizedException('Invalid refresh token');
      }

      // Issue a brand-new opaque refresh token in the same transaction
      const newRawToken = this.generateRawRefreshToken();
      const newHash = this.hashToken(newRawToken);
      const expiresAt = new Date(Date.now() + this.refreshTtlMs());

      await tx.insert(refreshTokens).values({
        userId: consumed.userId,
        tokenHash: newHash,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        revoked: false,
        expiresAt,
      });

      return { newRawToken, userId: consumed.userId };
    });
  }

  /**
   * Revoke a single token by its raw value (used on logout).
   * Hash-based lookup — no userId required.
   */
  async revokeByToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.dbService.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  /**
   * Revoke all active refresh tokens for a user.
   * Used for: security wipe on reuse detection, or "log out all devices".
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.dbService.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(
        and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)),
      );
  }
}

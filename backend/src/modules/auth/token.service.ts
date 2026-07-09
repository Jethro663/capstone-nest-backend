import {
  Injectable,
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import Redis from 'ioredis';
import { DatabaseService } from '../../database/database.service';
import { refreshTokens } from '../../drizzle/schema';
import { eq, and, gt } from 'drizzle-orm';
import { parseExpiryMs } from './utils/parse-expiry.util';

@Injectable()
export class TokenService implements OnModuleDestroy {
  private readonly logger = new Logger(TokenService.name);
  private readonly rotationGraceCache = new Map<
    string,
    { newRawToken: string; userId: string; rotatedAt: number }
  >();
  private redisClient?: Redis;

  constructor(
    private readonly dbService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService?.get<string>('redis.url');
    if (redisUrl && process.env.NODE_ENV !== 'test') {
      try {
        this.redisClient = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });
      } catch (e) {
        this.logger.warn(
          'Failed to initialize Redis for TokenService rotation grace',
          e,
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        this.redisClient.disconnect();
      }
    }
  }

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

    const cached = this.rotationGraceCache.get(tokenHash);
    if (cached && Date.now() - cached.rotatedAt < 45000) {
      return { newRawToken: cached.newRawToken, userId: cached.userId };
    }

    if (this.redisClient) {
      try {
        const redisVal = await this.redisClient.get(`auth:grace:${tokenHash}`);
        if (redisVal) {
          const parsed = JSON.parse(redisVal);
          if (parsed && parsed.newRawToken && parsed.userId) {
            return { newRawToken: parsed.newRawToken, userId: parsed.userId };
          }
        }
      } catch {
        // ignore redis read errors and fall through to DB
      }
    }

    return await this.dbService.db.transaction(async (tx) => {
      const newRawToken = this.generateRawRefreshToken();
      const newHash = this.hashToken(newRawToken);
      const expiresAt = new Date(Date.now() + this.refreshTtlMs());
      const graceExpiresAt = new Date(Date.now() + 45000);

      // Atomically revoke only if the token is valid and not yet consumed
      const [consumed] = await tx
        .update(refreshTokens)
        .set({
          revoked: true,
          rotatedAt: now,
          graceExpiresAt,
          replacedByTokenHash: newHash,
        })
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
          // Check if within 45-second grace window (benign concurrent refresh race).
          // Note: Because DB stores one-way SHA-256 hashes (`tokenHash`), plaintext `newRawToken`
          // cannot be returned from DB when Redis L2 / in-memory cache misses. Instead of revoking
          // all sessions (reuse attack protection), throw a gentle retry error.
          if (existing.graceExpiresAt && existing.graceExpiresAt > now) {
            this.logger.warn(
              `[SECURITY] Concurrent refresh within grace window for user ${existing.userId}. Benign race detected without cache hit.`,
            );
            throw new UnauthorizedException(
              'Token recently refreshed. Please use your latest active session.',
            );
          }

          // Token was already revoked outside grace window — potential token reuse / theft
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
      await tx.insert(refreshTokens).values({
        userId: consumed.userId,
        tokenHash: newHash,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        revoked: false,
        expiresAt,
      });

      this.rotationGraceCache.set(tokenHash, {
        newRawToken,
        userId: consumed.userId,
        rotatedAt: Date.now(),
      });
      if (this.rotationGraceCache.size > 500) {
        const threshold = Date.now() - 45000;
        for (const [key, val] of this.rotationGraceCache.entries()) {
          if (val.rotatedAt < threshold) this.rotationGraceCache.delete(key);
        }
      }

      if (this.redisClient) {
        try {
          await this.redisClient.set(
            `auth:grace:${tokenHash}`,
            JSON.stringify({ newRawToken, userId: consumed.userId }),
            'EX',
            45,
          );
        } catch {
          // ignore redis set error
        }
      }

      return { newRawToken, userId: consumed.userId };
    });
  }

  /**
   * Revoke a single token by its raw value (used on logout).
   * Hash-based lookup — no userId required.
   */
  async revokeByToken(rawToken: string): Promise<string | null> {
    const tokenHash = this.hashToken(rawToken);
    const [revokedToken] = await this.dbService.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .returning({ userId: refreshTokens.userId });

    return revokedToken?.userId ?? null;
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

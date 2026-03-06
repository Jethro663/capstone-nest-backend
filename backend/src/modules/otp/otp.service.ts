import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { otpVerifications, users } from '../../drizzle/schema';
import { MailService } from '../mail/mail.service';
import { OTP_TTL_MINUTES } from './otp.constants';

/** Resend cooldown in milliseconds */
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * HMAC-SHA256 pepper read from OTP_PEPPER env var.
   * Throws at startup in production if the variable is missing.
   */
  private get pepper(): string {
    const pepper = process.env.OTP_PEPPER;
    if (!pepper) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'OTP_PEPPER environment variable must be set in production',
        );
      }
      return 'dev-pepper-change-me'; // Acceptable only in development
    }
    return pepper;
  }

  /** Compute HMAC-SHA256 of a code using the server-side pepper. */
  private hashCode(code: string): string {
    return crypto.createHmac('sha256', this.pepper).update(code).digest('hex');
  }

  async createAndSendOTP(
    userId: string,
    email: string,
    purpose: 'email_verification' | 'password_reset' = 'email_verification',
  ): Promise<void> {
    // 1. Delete old unused OTPs for this user/purpose
    await this.db
      .delete(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          eq(otpVerifications.purpose, purpose),
          eq(otpVerifications.isUsed, false),
        ),
      );

    // 2. Generate a bias-free secure 6-digit OTP and hash it immediately
    const code = this.generateSecureOTP();
    const codeHash = this.hashCode(code);

    // 3. Set expiration
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // 4. Persist only the hash — never the plaintext code
    await this.db.insert(otpVerifications).values({
      userId,
      codeHash,
      purpose,
      expiresAt,
      isUsed: false,
      attemptCount: 0,
    });

    // 5. Email the plaintext code; it goes out of scope after this call
    await this.mailService.sendOtpEmail(email, code, purpose);
  }

  async verifyOTP(
    email: string,
    code: string,
    purpose: 'email_verification' | 'password_reset' = 'email_verification',
  ): Promise<void> {
    // 1. Look up the user — return a generic error to prevent account enumeration.
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true, isEmailVerified: true },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Block re-verification on already-verified accounts
    if (purpose === 'email_verification' && user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // 2. Fetch the most-recent active OTP for this user/purpose
    const otp = await this.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.userId, user.id),
        eq(otpVerifications.purpose, purpose),
        eq(otpVerifications.isUsed, false),
      ),
      orderBy: (otpVerifications, { desc }) => [
        desc(otpVerifications.createdAt),
      ],
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // 3. Check expiration before burning an attempt
    if (new Date() > otp.expiresAt) {
      await this.db
        .delete(otpVerifications)
        .where(eq(otpVerifications.id, otp.id));
      throw new BadRequestException('Invalid or expired verification code');
    }

    // 4. Atomically increment attemptCount — reject if already at the cap
    const [updated] = await this.db
      .update(otpVerifications)
      .set({ attemptCount: sql`${otpVerifications.attemptCount} + 1` })
      .where(
        and(
          eq(otpVerifications.id, otp.id),
          sql`${otpVerifications.attemptCount} < 5`,
        ),
      )
      .returning();

    if (!updated) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    // 5. Compare HMAC hashes — constant-time via crypto.timingSafeEqual
    const incomingHash = Buffer.from(this.hashCode(code), 'hex');
    const storedHash = Buffer.from(otp.codeHash, 'hex');
    const valid =
      incomingHash.length === storedHash.length &&
      crypto.timingSafeEqual(incomingHash, storedHash);

    if (!valid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // 6. Mark OTP as used for audit trail instead of deleting
    await this.db
      .update(otpVerifications)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(otpVerifications.id, otp.id));

    // 7. For email_verification: mark the user's email as verified
    if (purpose === 'email_verification') {
      await this.db
        .update(users)
        .set({ isEmailVerified: true, status: 'ACTIVE' })
        .where(eq(users.id, user.id));
    }
  }

  async resendOTP(email: string): Promise<void> {
    // Look up silently — do NOT reveal whether the email is registered
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true, isEmailVerified: true },
    });
    if (!user || user.isEmailVerified) {
      // Return silently; caller receives an identical 200 either way
      return;
    }

    // Enforce 60-second resend cooldown
    const existingOtp = await this.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.userId, user.id),
        eq(otpVerifications.purpose, 'email_verification'),
        eq(otpVerifications.isUsed, false),
      ),
      orderBy: (otpVerifications, { desc }) => [
        desc(otpVerifications.createdAt),
      ],
    });

    if (existingOtp) {
      const nextAllowed = new Date(
        existingOtp.createdAt.getTime() + RESEND_COOLDOWN_MS,
      );
      if (new Date() < nextAllowed) {
        const secondsLeft = Math.ceil(
          (nextAllowed.getTime() - Date.now()) / 1000,
        );
        throw new BadRequestException(
          `Please wait ${secondsLeft} second${secondsLeft !== 1 ? 's' : ''} before requesting a new code`,
        );
      }
    }

    await this.createAndSendOTP(user.id, user.email, 'email_verification');
  }

  /**
   * Generates a cryptographically uniform 6-digit OTP using rejection sampling
   * to eliminate the modulo bias that arises from a non-power-of-two range.
   *
   * 4 random bytes → uint32 in [0, 2^32).
   * Reject if value >= floor(2^32 / 1_000_000) * 1_000_000 (= 4_294_967_000).
   * Remaining values map uniformly onto [0, 1_000_000).
   */
  private generateSecureOTP(): string {
    // Highest multiple of 1_000_000 that fits in a uint32
    const limit = 4_294_967_000; // floor(0x1_0000_0000 / 1_000_000) * 1_000_000
    let value: number;
    do {
      value = crypto.randomBytes(4).readUInt32BE(0);
    } while (value >= limit);
    return (value % 1_000_000).toString().padStart(6, '0');
  }
}

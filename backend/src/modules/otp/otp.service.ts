import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { otpVerifications } from '../../drizzle/schema';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service'; // Imported MailService
import { OTP_TTL_MINUTES } from './otp.constants';

@Injectable()
export class OtpService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly mailService: MailService, // Injected MailService
  ) {}

  private get db() {
    return this.databaseService.db;
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

    // 2. Generate secure 6-digit OTP
    const code = this.generateSecureOTP();

    // 3. Set expiration
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // 4. Save to database
    await this.db.insert(otpVerifications).values({
      userId,
      code,
      purpose,
      expiresAt,
      isUsed: false,
      attemptCount: 0,
    });

    // 5. Send email via MailService
    await this.mailService.sendOtpEmail(email, code, purpose);
  }

  async verifyOTP(
    email: string,
    code: string,
    purpose: 'email_verification' | 'password_reset' = 'email_verification',
  ): Promise<void> {
    // 1. Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only block re-verification when doing email_verification flow
    if (purpose === 'email_verification' && user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // 2. Find the OTP record for the given purpose
    const otp = await this.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.userId, user.id),
        eq(otpVerifications.purpose, purpose),
      ),
      orderBy: (otpVerifications, { desc }) => [
        desc(otpVerifications.createdAt),
      ],
    });

    if (!otp) {
      console.error('[OTP] No pending OTP found for user:', email, 'purpose:', purpose);
      throw new BadRequestException('No pending verification found');
    }

    console.log('[OTP] Verifying OTP for:', email, 'purpose:', purpose, 'provided:', code.substring(0, 2) + '****');

    // 3. Check expiration first — before burning an attempt on stale data
    if (new Date() > otp.expiresAt) {
      // Clean up the expired record so the next lookup finds nothing
      await this.db
        .delete(otpVerifications)
        .where(eq(otpVerifications.id, otp.id));
      throw new BadRequestException('Verification code has expired');
    }

    // 4. Atomically increment attempt count — gate: max 5 attempts
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

    // 5. Verify code
    if (otp.code !== code) {
      console.warn('[OTP] Invalid code for user:', email);
      throw new BadRequestException('Invalid verification code');
    }

    // 6. Delete the consumed OTP
    await this.db
      .delete(otpVerifications)
      .where(eq(otpVerifications.id, otp.id));

    // 7. For email_verification: mark the user's email as verified
    if (purpose === 'email_verification') {
      await this.usersService.verifyEmail(user.id);
    }
  }

  async resendOTP(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.createAndSendOTP(user.id, user.email, 'email_verification');
  }

  private generateSecureOTP(): string {
    const randomBytes = crypto.randomBytes(3);
    const randomNumber = randomBytes.readUIntBE(0, 3);
    const otp = (randomNumber % 900000) + 100000; // Ensures 6 digits
    return otp.toString();
  }
}

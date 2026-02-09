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

    // 3. Set expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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

  async verifyOTP(email: string, code: string): Promise<void> {
    // 1. Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // 2. Find the OTP record
    const otp = await this.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.userId, user.id),
        eq(otpVerifications.purpose, 'email_verification'),
        eq(otpVerifications.isUsed, false),
      ),
      orderBy: (otpVerifications, { desc }) => [
        desc(otpVerifications.createdAt),
      ],
    });

    if (!otp) {
      console.error('[OTP] No pending OTP found for user:', email);
      throw new BadRequestException('No pending verification found');
    }

    console.log('[OTP] Verifying OTP for:', email, 'provided:', code.substring(0, 2) + '****', 'stored:', otp.code.substring(0, 2) + '****');

    // 3. Check attempt limit
    // Use atomic increment with WHERE clause
    const [updated] = await this.db
      .update(otpVerifications)
      .set({ attemptCount: sql`${otpVerifications.attemptCount} + 1` })
      .where(
        and(
          eq(otpVerifications.id, otp.id),
          sql`${otpVerifications.attemptCount} < 5`, // Only update if under limit
        ),
      )
      .returning();

    if (!updated) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    if (otp.code !== code) {
      console.warn('[OTP] Invalid code for user:', email, '- provided:', code, 'expected:', otp.code);
      throw new BadRequestException('Invalid verification code');
    }

    // 4. Check expiration
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Verification code has expired');
    }

    // 5. Verify code
    if (otp.code !== code) {
      // Increment attempt count
      await this.db
        .update(otpVerifications)
        .set({ attemptCount: otp.attemptCount + 1 })
        .where(eq(otpVerifications.id, otp.id));

      throw new BadRequestException('Invalid verification code');
    }

    // 6. Mark OTP as used and delete
    // Note: Deleting is fine, but marking isUsed=true is better for audit trails if needed later.
    // For now, sticking to your delete logic to keep it clean.
    await this.db
      .delete(otpVerifications)
      .where(eq(otpVerifications.id, otp.id));

    // 7. Verify user's email
    await this.usersService.verifyEmail(user.id);
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

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '../../../common/events';
import { OtpService } from '../../otp/otp.service';
import { MailService } from '../../mail/mail.service';

/**
 * Listens for user lifecycle events and handles side-effects
 * (OTP emails, password emails) without coupling UsersService
 * directly to OTP or Mail modules.
 */
@Injectable()
export class UserEventsListener {
  private readonly logger = new Logger(UserEventsListener.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
  ) {}

  @OnEvent(UserCreatedEvent.eventName)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    // Send OTP verification email
    if (event.requiresOTP) {
      await this.otpService.createAndSendOTP(
        event.userId,
        event.email,
        'email_verification',
      );
    }

    // Send generated password email
    if (event.generatedPassword) {
      await this.mailService.sendPasswordEmail(
        event.email,
        event.generatedPassword,
      );
    }

    this.logger.log(`User onboarding email flow completed for ${event.email}`);
  }
}

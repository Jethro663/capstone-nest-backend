import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Only initialize transporter if credentials exist or we are in dev
    if (process.env.EMAIL_SERVICE === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    purpose: string = 'email_verification',
  ) {
    if (!this.transporter) {
      this.logger.warn(`[DEV MODE] OTP for ${email}: ${otp}`);
      return { success: true, mode: 'development' };
    }

    const subject =
      purpose === 'email_verification'
        ? 'Verify Your Nexora Account'
        : 'Reset Your Nexora Password';

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject,
        html: this.getOtpTemplate(otp, purpose),
        text: `Your Nexora verification code is: ${otp}. Expires in 10 minutes.`,
      });
      return { success: true, mode: 'production' };
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error.stack);
      throw new Error('Email delivery failed'); // Filtered by Global Exception Filter
    }
  }

  // Kept your template logic inside the class
  private getOtpTemplate(otp: string, purpose: string) {
    const isVerification = purpose === 'email_verification';
    const color = isVerification ? '#4CAF50' : '#2196F3';
    const title = isVerification
      ? 'Email Verification'
      : 'Password Reset Request';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
            <h1>Nexora LMS</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>${title}</h2>
            <p>Use the code below to complete your request:</p>
            <div style="font-size: 32px; font-weight: bold; color: ${color}; text-align: center; margin: 20px 0;">
                ${otp}
            </div>
            <p><strong>Expires in 10 minutes.</strong></p>
        </div>
      </div>
    `;
  }
}

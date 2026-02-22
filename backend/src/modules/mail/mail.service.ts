import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { OTP_TTL_MINUTES } from '../../common/constants';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Only initialize transporter if credentials exist or we are in dev
    if (process.env.EMAIL_SERVICE?.toLowerCase() === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      // Verify SMTP connectivity at startup so misconfigurations surface early
      this.transporter.verify().catch((err) => {
        this.logger.error('[MAIL] SMTP transporter verification failed', err.message);
      });
    }
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    purpose: 'email_verification' | 'password_reset' = 'email_verification',
  ): Promise<{ success: boolean; mode: 'development' | 'production' }> {
    if (!this.transporter) {
      this.logger.debug(`[DEV MODE] OTP for ${email}: ${otp}`);
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
        text: `Your Nexora verification code is: ${otp}. Expires in ${OTP_TTL_MINUTES} minutes.`,
      });
      return { success: true, mode: 'production' };
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error.stack);
      throw new Error('Email delivery failed'); // Filtered by Global Exception Filter
    }
  }

  /**
   * Send temporary password to new user's email
   * @param email User's email address
   * @param password Temporary password
   */
  async sendPasswordEmail(
    email: string,
    password: string,
  ): Promise<{ success: boolean; mode: 'development' | 'production' }> {
    if (!this.transporter) {
      this.logger.debug(`[DEV MODE] Password email skipped for ${email} (no transporter)`);
      return { success: true, mode: 'development' };
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Your Nexora Account Credentials',
        html: this.getPasswordTemplate(password),
        text: `Your temporary Nexora account password is: ${password}. Please log in and change it immediately after verifying your email.`,
      });
      return { success: true, mode: 'production' };
    } catch (error) {
      this.logger.error(`Failed to send password email to ${email}`, error.stack);
      throw new Error('Email delivery failed');
    }
  }

  private getOtpTemplate(otp: string, purpose: 'email_verification' | 'password_reset') {
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
            <p><strong>Expires in ${OTP_TTL_MINUTES} minutes.</strong></p>
        </div>
      </div>
    `;
  }

  /**
   * Template for temporary password email
   */
  private getPasswordTemplate(password: string) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
            <h1>Nexora LMS</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Your Account is Ready!</h2>
            <p>Your Nexora account has been created. Here is your temporary password:</p>
            <div style="font-size: 24px; font-weight: bold; color: #2196F3; text-align: center; margin: 20px 0; padding: 15px; background-color: white; border-radius: 8px; font-family: 'Courier New', monospace;">
                ${password}
            </div>
            <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
              <p style="margin: 0; color: #856404;"><strong>⚠️ Important Security Notice:</strong></p>
              <ul style="margin: 10px 0 0 0; color: #856404;">
                <li>This is a temporary password. For your security, please change it after logging in.</li>
                <li>Do not share this password with anyone.</li>
                <li>Verify your email address after logging in to fully activate your account.</li>
              </ul>
            </div>
            <p style="margin-top: 20px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || '#'}" style="display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 6px;">Go to Nexora</a>
            </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;
  }
}

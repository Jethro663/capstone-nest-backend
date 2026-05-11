import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { OTP_TTL_MINUTES } from '../../common/constants';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly emailService = process.env.EMAIL_SERVICE?.toLowerCase() || '';
  private readonly resendApiKey = process.env.RESEND_API_KEY || '';
  private smtpReady = false;
  private smtpError: string | null = null;

  constructor() {
    if (this.emailService === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      this.transporter
        .verify()
        .then(() => {
          this.smtpReady = true;
          this.smtpError = null;
        })
        .catch((err) => {
          this.smtpReady = false;
          this.smtpError = err?.message ?? 'Unknown SMTP verification error';
          this.logger.error(
            '[MAIL] SMTP transporter verification failed',
            this.smtpError,
          );
        });
    }
  }

  private isResendEnabled() {
    return this.emailService === 'resend' && Boolean(this.resendApiKey.trim());
  }

  private getFromAddress() {
    const configuredFrom = process.env.EMAIL_FROM?.trim() || '';
    const configuredUser = process.env.EMAIL_USER?.trim() || '';

    if (this.emailService === 'gmail') {
      if (configuredFrom) {
        return configuredFrom;
      }

      if (configuredUser) {
        return `Nexora LMS <${configuredUser}>`;
      }
    }

    return configuredFrom || configuredUser;
  }

  private async sendViaResend(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const from = this.getFromAddress();
    if (!from) {
      throw new Error('EMAIL_FROM is required for Resend email delivery');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `[MAIL] Resend API returned ${response.status}: ${errorText}`,
      );
      throw new Error('Email delivery failed');
    }
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; mode: 'development' | 'production' }> {
    if (this.isResendEnabled()) {
      await this.sendViaResend(options);
      return { success: true, mode: 'production' };
    }

    if (!this.transporter) {
      this.logger.debug(
        `[DEV MODE] Email skipped for ${options.to} (no configured transporter)`,
      );
      return { success: true, mode: 'development' };
    }

    if (this.emailService === 'gmail' && this.smtpError) {
      throw new Error(
        `Gmail SMTP is not ready (${this.smtpError}). Set EMAIL_PASSWORD to a valid Gmail App Password.`,
      );
    }

    await this.transporter.sendMail({
      from: this.getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return { success: true, mode: 'production' };
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    purpose: 'email_verification' | 'password_reset' = 'email_verification',
  ): Promise<{ success: boolean; mode: 'development' | 'production' }> {
    const subject =
      purpose === 'email_verification'
        ? 'Verify Your Nexora Account'
        : 'Reset Your Nexora Password';

    try {
      return await this.sendMail({
        to: email,
        subject,
        html: this.getOtpTemplate(otp, purpose),
        text: `Your Nexora verification code is: ${otp}. Expires in ${OTP_TTL_MINUTES} minutes.`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error('Email delivery failed');
    }
  }

  async sendPasswordEmail(
    email: string,
    password: string,
  ): Promise<{ success: boolean; mode: 'development' | 'production' }> {
    try {
      return await this.sendMail({
        to: email,
        subject: 'Your Nexora Account Credentials',
        html: this.getPasswordTemplate(password),
        text: `Your temporary Nexora account password is: ${password}. Please log in and change it immediately after verifying your email.`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password email to ${email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error('Email delivery failed');
    }
  }

  private getOtpTemplate(
    otp: string,
    purpose: 'email_verification' | 'password_reset',
  ) {
    const isVerification = purpose === 'email_verification';
    const title = isVerification
      ? 'Confirm your email'
      : 'Reset your password';
    const intro = isVerification
      ? 'Use this one-time code to activate your Nexora account.'
      : 'Use this one-time code to continue your password reset request.';
    const accent = isVerification ? '#7f1d1d' : '#9f1239';
    const accentSoft = isVerification ? '#fb7185' : '#f43f5e';

    return `
      <div style="margin:0;background-color:#fff7f5;padding:32px 18px;color:#1f2937;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#fffaf9 0%,#fff5f4 100%);border:1px solid #f3d6d3;">
          <div style="height:6px;background:linear-gradient(90deg,${accent} 0%,${accentSoft} 100%);"></div>
          <div style="padding:28px 28px 24px 28px;">
            <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#9f5f5f;">
              Nexora LMS
            </p>
            <h1 style="margin:0;font-size:24px;line-height:1.2;font-weight:700;color:#3f1518;">
              ${title}
            </h1>
            <p style="margin:14px 0 0 0;font-size:15px;line-height:1.8;color:#6b4b4b;">
              ${intro}
            </p>
            <div style="margin:24px 0 18px 0;padding:14px 16px;border-top:1px solid #edd4d0;border-bottom:1px solid #edd4d0;">
              <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a16262;">
                Verification code
              </p>
              <div style="font-size:30px;line-height:1;font-weight:700;letter-spacing:0.32em;color:${accent};font-family:'Courier New',monospace;">
                ${otp}
              </div>
            </div>
            <p style="margin:0;font-size:14px;line-height:1.8;color:#6b4b4b;">
              This code expires in <strong style="color:#3f1518;">${OTP_TTL_MINUTES} minutes</strong>.
            </p>
            <p style="margin:18px 0 0 0;font-size:14px;line-height:1.8;color:#7b5e5e;">
              If you did not request this, you can safely ignore this email.
            </p>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #edd4d0;font-size:12px;line-height:1.7;color:#9a7a7a;">
              Automated message from Nexora. Please do not reply.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getPasswordTemplate(password: string) {
    return `
      <div style="margin:0;background-color:#fff7f5;padding:32px 18px;color:#1f2937;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#fffaf9 0%,#fff5f4 100%);border:1px solid #f3d6d3;">
          <div style="height:6px;background:linear-gradient(90deg,#7f1d1d 0%,#fb7185 100%);"></div>
          <div style="padding:28px 28px 24px 28px;">
            <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#9f5f5f;">
              Nexora LMS
            </p>
            <h1 style="margin:0;font-size:24px;line-height:1.2;font-weight:700;color:#3f1518;">
              Your account is ready
            </h1>
            <p style="margin:14px 0 0 0;font-size:15px;line-height:1.8;color:#6b4b4b;">
              Your Nexora account has been created. Use the temporary password below for your first sign in.
            </p>
            <div style="margin:24px 0 18px 0;padding:14px 16px;border-top:1px solid #edd4d0;border-bottom:1px solid #edd4d0;">
              <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a16262;">
                Temporary password
              </p>
              <div style="font-size:24px;line-height:1.2;font-weight:700;letter-spacing:0.08em;color:#7f1d1d;font-family:'Courier New',monospace;word-break:break-word;">
                ${password}
              </div>
            </div>
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a16262;">
              Before you log in
            </p>
            <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.9;color:#6b4b4b;">
              <li><strong style="color:#3f1518;">Verify your email first</strong> using the separate OTP email.</li>
              <li><strong style="color:#3f1518;">Sign in to Nexora</strong> with the temporary password above.</li>
              <li><strong style="color:#3f1518;">Change your password</strong> after your first successful login.</li>
            </ol>
            <p style="margin:18px 0 0 0;font-size:14px;line-height:1.8;color:#7b5e5e;">
              Keep this password private and do not forward this email.
            </p>
            <p style="margin:22px 0 0 0;">
              <a href="${process.env.FRONTEND_URL || '#'}" style="display:inline-block;padding:11px 18px;background:#7f1d1d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                Open Nexora
              </a>
            </p>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #edd4d0;font-size:12px;line-height:1.7;color:#9a7a7a;">
              Automated message from Nexora. Please do not reply.
            </div>
          </div>
        </div>
      </div>
    `;
  }
}





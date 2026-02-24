import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';
import { OTP_TTL_MINUTES } from '../../common/constants';

// ---------------------------------------------------------------------------
// Mock the entire nodemailer module so no real SMTP connection is ever opened
// ---------------------------------------------------------------------------
jest.mock('nodemailer');
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// ---------------------------------------------------------------------------
// Helper: build a fake transporter with controllable sendMail / verify
// ---------------------------------------------------------------------------
function makeMockTransporter(sendMailImpl?: () => Promise<any>) {
  return {
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockImplementation(sendMailImpl ?? (() => Promise.resolve({ messageId: 'test-id' }))),
  };
}

// ---------------------------------------------------------------------------
// Shared fixture values
// ---------------------------------------------------------------------------
const EMAIL = 'student@school.edu';
const OTP = '123456';
const PASSWORD = 'TempP@ss1';
const EMAIL_FROM = 'Nexora LMS <nexora@school.edu>';
const EMAIL_USER = 'nexora@school.edu';

// ---------------------------------------------------------------------------
// Helper: create MailService through the NestJS testing module
// (constructor runs inside compile(), so process.env must be set before)
// ---------------------------------------------------------------------------
async function buildService(): Promise<MailService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [MailService],
  }).compile();
  return module.get<MailService>(MailService);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('MailService', () => {
  // Save and restore env vars around every test
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ===========================================================================
  // Constructor: transporter is only initialised when EMAIL_SERVICE=gmail
  // ===========================================================================

  describe('constructor', () => {
    it('does NOT create a transporter when EMAIL_SERVICE is unset', async () => {
      delete process.env.EMAIL_SERVICE;
      await buildService();
      expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('does NOT create a transporter when EMAIL_SERVICE is not "gmail"', async () => {
      process.env.EMAIL_SERVICE = 'smtp';
      await buildService();
      expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('creates a Gmail transporter when EMAIL_SERVICE=gmail', async () => {
      process.env.EMAIL_SERVICE = 'gmail';
      process.env.EMAIL_USER = EMAIL_USER;
      process.env.EMAIL_PASSWORD = 'secret';
      const mockTransporter = makeMockTransporter();
      mockNodemailer.createTransport.mockReturnValue(mockTransporter as any);

      await buildService();

      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: 'secret' },
      });
    });

    it('calls transporter.verify() at startup and swallows errors', async () => {
      process.env.EMAIL_SERVICE = 'gmail';
      const mockTransporter = makeMockTransporter();
      mockTransporter.verify.mockRejectedValue(new Error('SMTP timeout'));
      mockNodemailer.createTransport.mockReturnValue(mockTransporter as any);

      // Must not throw even if verify fails
      await expect(buildService()).resolves.toBeDefined();
    });
  });

  // ===========================================================================
  // sendOtpEmail — development mode (no transporter)
  // ===========================================================================

  describe('sendOtpEmail — development mode', () => {
    let service: MailService;

    beforeEach(async () => {
      delete process.env.EMAIL_SERVICE;
      service = await buildService();
    });

    it('returns { success: true, mode: "development" } for email_verification', async () => {
      const result = await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      expect(result).toEqual({ success: true, mode: 'development' });
    });

    it('returns { success: true, mode: "development" } for password_reset', async () => {
      const result = await service.sendOtpEmail(EMAIL, OTP, 'password_reset');
      expect(result).toEqual({ success: true, mode: 'development' });
    });

    it('uses email_verification as the default purpose', async () => {
      const result = await service.sendOtpEmail(EMAIL, OTP);
      expect(result).toEqual({ success: true, mode: 'development' });
    });

    it('never calls sendMail in dev mode', async () => {
      await service.sendOtpEmail(EMAIL, OTP);
      expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // sendOtpEmail — production mode (Gmail transporter)
  // ===========================================================================

  describe('sendOtpEmail — production mode', () => {
    let service: MailService;
    let mockTransporter: ReturnType<typeof makeMockTransporter>;

    beforeEach(async () => {
      process.env.EMAIL_SERVICE = 'gmail';
      process.env.EMAIL_USER = EMAIL_USER;
      process.env.EMAIL_FROM = EMAIL_FROM;
      mockTransporter = makeMockTransporter();
      mockNodemailer.createTransport.mockReturnValue(mockTransporter as any);
      service = await buildService();
    });

    it('returns { success: true, mode: "production" } for email_verification', async () => {
      const result = await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      expect(result).toEqual({ success: true, mode: 'production' });
    });

    it('returns { success: true, mode: "production" } for password_reset', async () => {
      const result = await service.sendOtpEmail(EMAIL, OTP, 'password_reset');
      expect(result).toEqual({ success: true, mode: 'production' });
    });

    it('sends to the correct recipient', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.to).toBe(EMAIL);
    });

    it('uses EMAIL_FROM as the from address', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.from).toBe(EMAIL_FROM);
    });

    it('falls back to EMAIL_USER when EMAIL_FROM is unset', async () => {
      delete process.env.EMAIL_FROM;
      // Rebuild service without EMAIL_FROM
      const transporter2 = makeMockTransporter();
      mockNodemailer.createTransport.mockReturnValue(transporter2 as any);
      const svc = await buildService();

      await svc.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = transporter2.sendMail.mock.calls[0];
      expect(mailOptions.from).toBe(EMAIL_USER);
    });

    it('uses correct subject for email_verification', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.subject).toBe('Verify Your Nexora Account');
    });

    it('uses correct subject for password_reset', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'password_reset');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.subject).toBe('Reset Your Nexora Password');
    });

    it('includes the OTP code in the HTML body', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain(OTP);
    });

    it('includes OTP_TTL_MINUTES in the HTML body', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain(String(OTP_TTL_MINUTES));
    });

    it('includes OTP code in the plain-text fallback', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.text).toContain(OTP);
    });

    it('uses green colour (#4CAF50) for email_verification template', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain('#4CAF50');
    });

    it('uses blue colour (#2196F3) for password_reset template', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'password_reset');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain('#2196F3');
    });

    it('throws a generic error when sendMail rejects', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.sendOtpEmail(EMAIL, OTP, 'email_verification'),
      ).rejects.toThrow('Email delivery failed');
    });

    it('calls sendMail exactly once per invocation', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // sendPasswordEmail — development mode
  // ===========================================================================

  describe('sendPasswordEmail — development mode', () => {
    let service: MailService;

    beforeEach(async () => {
      delete process.env.EMAIL_SERVICE;
      service = await buildService();
    });

    it('returns { success: true, mode: "development" }', async () => {
      const result = await service.sendPasswordEmail(EMAIL, PASSWORD);
      expect(result).toEqual({ success: true, mode: 'development' });
    });

    it('never opens a real connection in dev mode', async () => {
      await service.sendPasswordEmail(EMAIL, PASSWORD);
      expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // sendPasswordEmail — production mode
  // ===========================================================================

  describe('sendPasswordEmail — production mode', () => {
    let service: MailService;
    let mockTransporter: ReturnType<typeof makeMockTransporter>;

    beforeEach(async () => {
      process.env.EMAIL_SERVICE = 'gmail';
      process.env.EMAIL_USER = EMAIL_USER;
      process.env.EMAIL_FROM = EMAIL_FROM;
      mockTransporter = makeMockTransporter();
      mockNodemailer.createTransport.mockReturnValue(mockTransporter as any);
      service = await buildService();
    });

    it('returns { success: true, mode: "production" }', async () => {
      const result = await service.sendPasswordEmail(EMAIL, PASSWORD);
      expect(result).toEqual({ success: true, mode: 'production' });
    });

    it('sends to the correct recipient', async () => {
      await service.sendPasswordEmail(EMAIL, PASSWORD);
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.to).toBe(EMAIL);
    });

    it('uses the correct subject', async () => {
      await service.sendPasswordEmail(EMAIL, PASSWORD);
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.subject).toBe('Your Nexora Account Credentials');
    });

    it('includes the temporary password in the HTML body', async () => {
      await service.sendPasswordEmail(EMAIL, PASSWORD);
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain(PASSWORD);
    });

    it('includes the temporary password in the plain-text fallback', async () => {
      await service.sendPasswordEmail(EMAIL, PASSWORD);
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.text).toContain(PASSWORD);
    });

    it('includes a security notice warning in the HTML body', async () => {
      await service.sendPasswordEmail(EMAIL, PASSWORD);
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain('Important Security Notice');
    });

    it('includes the FRONTEND_URL login link when set', async () => {
      process.env.FRONTEND_URL = 'http://localhost:5173';
      const transporter2 = makeMockTransporter();
      mockNodemailer.createTransport.mockReturnValue(transporter2 as any);
      const svc = await buildService();

      await svc.sendPasswordEmail(EMAIL, PASSWORD);
      const [mailOptions] = transporter2.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain('http://localhost:5173');
    });

    it('throws a generic error when sendMail rejects', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Auth failed'));

      await expect(
        service.sendPasswordEmail(EMAIL, PASSWORD),
      ).rejects.toThrow('Email delivery failed');
    });

    it('calls sendMail exactly once per invocation', async () => {
      await service.sendPasswordEmail(EMAIL, PASSWORD);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });
});

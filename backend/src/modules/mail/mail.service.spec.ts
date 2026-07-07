import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';
import { OTP_TTL_MINUTES } from '../../common/constants';

jest.mock('nodemailer');
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

function makeMockTransporter(sendMailImpl?: () => Promise<any>) {
  return {
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest
      .fn()
      .mockImplementation(
        sendMailImpl ?? (() => Promise.resolve({ messageId: 'test-id' })),
      ),
  };
}

const EMAIL = 'student@school.edu';
const OTP = '123456';
const PASSWORD = 'TempP@ss1';
const EMAIL_FROM = 'Nexora LMS <nexora@school.edu>';
const EMAIL_USER = 'nexora@school.edu';
const RESEND_API_KEY = 're_test_key';

async function buildService(): Promise<MailService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [MailService],
  }).compile();
  return module.get<MailService>(MailService);
}

describe('MailService', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
    fetchMock = jest.fn();
    (global as typeof globalThis & { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('does not create a transporter when EMAIL_SERVICE is unset', async () => {
      delete process.env.EMAIL_SERVICE;
      await buildService();
      expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('does not create a transporter when EMAIL_SERVICE is not gmail', async () => {
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

    it('does not create a transporter when EMAIL_SERVICE=resend', async () => {
      process.env.EMAIL_SERVICE = 'resend';
      process.env.RESEND_API_KEY = RESEND_API_KEY;
      await buildService();
      expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  describe('sendOtpEmail development mode', () => {
    let service: MailService;

    beforeEach(async () => {
      delete process.env.EMAIL_SERVICE;
      service = await buildService();
    });

    it('returns development mode for email verification', async () => {
      const result = await service.sendOtpEmail(
        EMAIL,
        OTP,
        'email_verification',
      );
      expect(result).toEqual({ success: true, mode: 'development' });
    });
  });

  describe('sendOtpEmail gmail mode', () => {
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

    it('returns production mode', async () => {
      const result = await service.sendOtpEmail(
        EMAIL,
        OTP,
        'email_verification',
      );
      expect(result).toEqual({ success: true, mode: 'production' });
    });

    it('uses EMAIL_FROM as the from address', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.from).toBe(EMAIL_FROM);
    });

    it('includes OTP_TTL_MINUTES in the HTML body', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain(String(OTP_TTL_MINUTES));
    });
  });

  describe('sendOtpEmail resend mode', () => {
    let service: MailService;

    beforeEach(async () => {
      process.env.EMAIL_SERVICE = 'resend';
      process.env.RESEND_API_KEY = RESEND_API_KEY;
      process.env.EMAIL_FROM = EMAIL_FROM;
      fetchMock.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });
      service = await buildService();
    });

    it('returns production mode', async () => {
      const result = await service.sendOtpEmail(
        EMAIL,
        OTP,
        'email_verification',
      );
      expect(result).toEqual({ success: true, mode: 'production' });
    });

    it('posts the expected payload to Resend', async () => {
      await service.sendOtpEmail(EMAIL, OTP, 'email_verification');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          }),
        }),
      );
      const [, request] = fetchMock.mock.calls[0];
      expect(JSON.parse(request.body)).toMatchObject({
        from: EMAIL_FROM,
        to: [EMAIL],
        subject: 'Verify Your Nexora Account',
      });
    });

    it('throws a generic error when Resend rejects the request', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('domain not verified'),
      });

      await expect(
        service.sendOtpEmail(EMAIL, OTP, 'email_verification'),
      ).rejects.toThrow('Email delivery failed');
    });
  });

  describe('sendPasswordEmail development mode', () => {
    let service: MailService;

    beforeEach(async () => {
      delete process.env.EMAIL_SERVICE;
      service = await buildService();
    });

    it('returns development mode', async () => {
      const result = await service.sendPasswordEmail(EMAIL, PASSWORD);
      expect(result).toEqual({ success: true, mode: 'development' });
    });
  });

  describe('sendPasswordEmail gmail mode', () => {
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

    it('returns production mode', async () => {
      const result = await service.sendPasswordEmail(EMAIL, PASSWORD);
      expect(result).toEqual({ success: true, mode: 'production' });
    });

    it('includes the temporary password in the HTML body', async () => {
      await service.sendPasswordEmail(EMAIL, PASSWORD);
      const [mailOptions] = mockTransporter.sendMail.mock.calls[0];
      expect(mailOptions.html).toContain(PASSWORD);
    });
  });

  describe('sendPasswordEmail resend mode', () => {
    let service: MailService;

    beforeEach(async () => {
      process.env.EMAIL_SERVICE = 'resend';
      process.env.RESEND_API_KEY = RESEND_API_KEY;
      process.env.EMAIL_FROM = EMAIL_FROM;
      fetchMock.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });
      service = await buildService();
    });

    it('returns production mode', async () => {
      const result = await service.sendPasswordEmail(EMAIL, PASSWORD);
      expect(result).toEqual({ success: true, mode: 'production' });
    });
  });
});

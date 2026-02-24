import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { OtpService } from './otp.service';
import { DatabaseService } from '../../database/database.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

// ---------------------------------------------------------------------------
// Test pepper — must match what process.env.OTP_PEPPER is set to below
// ---------------------------------------------------------------------------
const TEST_PEPPER = 'test-pepper-for-unit-tests-do-not-use-in-prod';

/** Mirror of the private hashCode() logic in OtpService */
function hashCode(code: string): string {
  return crypto
    .createHmac('sha256', TEST_PEPPER)
    .update(code)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USER_ID = 'user-uuid-1';
const EMAIL = 'student@school.edu';
const VALID_CODE = '123456';
const WRONG_CODE = '000000';
const OTP_ID = 'otp-uuid-1';

const makeUser = (overrides: Partial<any> = {}) => ({
  id: USER_ID,
  email: EMAIL,
  isEmailVerified: false,
  ...overrides,
});

const makeOtpRow = (overrides: Partial<any> = {}) => ({
  id: OTP_ID,
  userId: USER_ID,
  codeHash: hashCode(VALID_CODE),
  purpose: 'email_verification' as const,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min in future
  isUsed: false,
  usedAt: null,
  createdAt: new Date(Date.now() - 30 * 1000), // created 30s ago (within cooldown)
  attemptCount: 0,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mock DB chain builders
// ---------------------------------------------------------------------------

/** Chainable delete().where() returning a resolving promise */
const makeDeleteChain = () => ({
  where: jest.fn().mockResolvedValue([]),
});

/** Chainable insert().values() returning a resolving promise */
const makeInsertChain = () => ({
  values: jest.fn().mockResolvedValue([]),
});

/**
 * Chainable update().set().where().returning() — callers configure the
 * `.returning()` value via the returned `returningMock` reference.
 */
const makeUpdateChain = (returnRows: any[] = [makeOtpRow()]) => {
  const chain: any = {};
  chain.set = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.returning = jest.fn().mockResolvedValue(returnRows);
  return chain;
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('OtpService', () => {
  let service: OtpService;

  const mockDb: any = {
    query: {
      otpVerifications: {
        findFirst: jest.fn(),
      },
    },
    delete: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };

  const mockDatabaseService = { db: mockDb };

  const mockUsersService = {
    findByEmail: jest.fn(),
    verifyEmail: jest.fn(),
  };

  const mockMailService = {
    sendOtpEmail: jest.fn(),
  };

  beforeAll(() => {
    // Ensure the service uses a known pepper and non-production mode
    process.env.OTP_PEPPER = TEST_PEPPER;
    process.env.NODE_ENV = 'test';
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  // ===========================================================================
  // createAndSendOTP
  // ===========================================================================

  describe('createAndSendOTP', () => {
    it('deletes existing unused OTPs, inserts hashed OTP, and sends email', async () => {
      mockDb.delete.mockReturnValue(makeDeleteChain());
      mockDb.insert.mockReturnValue(makeInsertChain());
      mockMailService.sendOtpEmail.mockResolvedValue(undefined);

      await service.createAndSendOTP(USER_ID, EMAIL, 'email_verification');

      // Old OTPs deleted
      expect(mockDb.delete).toHaveBeenCalledTimes(1);

      // New row inserted
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      const insertedValues = mockDb.insert().values.mock.calls[0][0];
      expect(insertedValues.userId).toBe(USER_ID);
      expect(insertedValues.isUsed).toBe(false);
      expect(insertedValues.attemptCount).toBe(0);

      // CRITICAL: must NOT store plaintext code
      expect(insertedValues).not.toHaveProperty('code');
      expect(insertedValues).toHaveProperty('codeHash');
      expect(typeof insertedValues.codeHash).toBe('string');
      expect(insertedValues.codeHash).toHaveLength(64); // SHA-256 hex = 64 chars

      // Email was sent
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledTimes(1);
      const [sentEmail, sentCode] = mockMailService.sendOtpEmail.mock.calls[0];
      expect(sentEmail).toBe(EMAIL);

      // Plaintext code sent in email must match the stored hash
      expect(hashCode(sentCode)).toBe(insertedValues.codeHash);
    });

    it('generates a 6-digit padded code', async () => {
      mockDb.delete.mockReturnValue(makeDeleteChain());
      mockDb.insert.mockReturnValue(makeInsertChain());
      mockMailService.sendOtpEmail.mockResolvedValue(undefined);

      await service.createAndSendOTP(USER_ID, EMAIL);

      const [, sentCode] = mockMailService.sendOtpEmail.mock.calls[0];
      expect(sentCode).toMatch(/^\d{6}$/);
    });

    it('works for password_reset purpose', async () => {
      mockDb.delete.mockReturnValue(makeDeleteChain());
      mockDb.insert.mockReturnValue(makeInsertChain());
      mockMailService.sendOtpEmail.mockResolvedValue(undefined);

      await service.createAndSendOTP(USER_ID, EMAIL, 'password_reset');

      const insertedValues = mockDb.insert().values.mock.calls[0][0];
      expect(insertedValues.purpose).toBe('password_reset');
      const [, , purpose] = mockMailService.sendOtpEmail.mock.calls[0];
      expect(purpose).toBe('password_reset');
    });
  });

  // ===========================================================================
  // verifyOTP
  // ===========================================================================

  describe('verifyOTP', () => {
    // --- success paths -------------------------------------------------------

    it('marks OTP as used and calls verifyEmail on success (email_verification)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(makeOtpRow());

      // Two separate chains so we can inspect each update independently
      const attemptChain = makeUpdateChain([makeOtpRow({ attemptCount: 1 })]);
      const markUsedChain = makeUpdateChain([makeOtpRow({ isUsed: true })]);
      mockDb.update
        .mockReturnValueOnce(attemptChain)
        .mockReturnValueOnce(markUsedChain);

      await service.verifyOTP(EMAIL, VALID_CODE, 'email_verification');

      // Both updates were triggered
      expect(mockDb.update).toHaveBeenCalledTimes(2);

      // Second update must set isUsed=true and usedAt
      const setArgs = markUsedChain.set.mock.calls[0][0];
      expect(setArgs.isUsed).toBe(true);
      expect(setArgs.usedAt).toBeInstanceOf(Date);

      expect(mockUsersService.verifyEmail).toHaveBeenCalledWith(USER_ID);
    });

    it('does NOT call verifyEmail for password_reset purpose', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(
        makeOtpRow({ purpose: 'password_reset' }),
      );
      mockDb.update.mockReturnValue(
        makeUpdateChain([makeOtpRow({ attemptCount: 1 })]),
      );

      await service.verifyOTP(EMAIL, VALID_CODE, 'password_reset');

      expect(mockUsersService.verifyEmail).not.toHaveBeenCalled();
    });

    // --- enumeration protection ----------------------------------------------

    it('returns the same generic error when user does not exist (no enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.verifyOTP('unknown@test.com', VALID_CODE),
      ).rejects.toThrow(
        new BadRequestException('Invalid or expired verification code'),
      );
    });

    it('returns the same generic error when code is wrong (no enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(makeOtpRow());
      mockDb.update.mockReturnValue(
        makeUpdateChain([makeOtpRow({ attemptCount: 1 })]),
      );

      await expect(
        service.verifyOTP(EMAIL, WRONG_CODE),
      ).rejects.toThrow(
        new BadRequestException('Invalid or expired verification code'),
      );

      // verifyEmail must NOT be called
      expect(mockUsersService.verifyEmail).not.toHaveBeenCalled();
    });

    it('returns the same generic error when no OTP row exists (no enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(null);

      await expect(service.verifyOTP(EMAIL, VALID_CODE)).rejects.toThrow(
        new BadRequestException('Invalid or expired verification code'),
      );
    });

    // --- already verified ---------------------------------------------------

    it('throws BadRequestException when email is already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue(
        makeUser({ isEmailVerified: true }),
      );

      await expect(service.verifyOTP(EMAIL, VALID_CODE)).rejects.toThrow(
        new BadRequestException('Email already verified'),
      );

      // Should not touch the DB for OTPs
      expect(mockDb.query.otpVerifications.findFirst).not.toHaveBeenCalled();
    });

    // --- expiration ---------------------------------------------------------

    it('deletes expired OTP and throws generic error (no "expired" leak)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(
        makeOtpRow({ expiresAt: new Date(Date.now() - 1000) }), // expired 1s ago
      );
      mockDb.delete.mockReturnValue(makeDeleteChain());

      await expect(service.verifyOTP(EMAIL, VALID_CODE)).rejects.toThrow(
        new BadRequestException('Invalid or expired verification code'),
      );

      // Expired row must be cleaned up
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      // attemptCount must NOT have been incremented (no wasted attempt)
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    // --- too many attempts --------------------------------------------------

    it('throws Too many attempts when attemptCount is already at cap', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(
        makeOtpRow({ attemptCount: 5 }),
      );
      // Atomic update WHERE attemptCount < 5 matches nothing → returns empty array
      mockDb.update.mockReturnValue(makeUpdateChain([]));

      await expect(service.verifyOTP(EMAIL, VALID_CODE)).rejects.toThrow(
        new BadRequestException('Too many attempts. Request a new code.'),
      );
    });

    // --- hash comparison correctness ----------------------------------------

    it('accepts a code whose hash matches the stored hash', async () => {
      const code = '987654';
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(
        makeOtpRow({ codeHash: hashCode(code) }),
      );
      mockDb.update.mockReturnValue(makeUpdateChain([makeOtpRow()]));

      await expect(
        service.verifyOTP(EMAIL, code, 'email_verification'),
      ).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // resendOTP
  // ===========================================================================

  describe('resendOTP', () => {
    // --- silent returns (enumeration protection) ----------------------------

    it('returns silently when user does not exist (no 404 leak)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.resendOTP('nonexistent@test.com')).resolves.toBeUndefined();
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockMailService.sendOtpEmail).not.toHaveBeenCalled();
    });

    it('returns silently when user is already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue(
        makeUser({ isEmailVerified: true }),
      );

      await expect(service.resendOTP(EMAIL)).resolves.toBeUndefined();
      expect(mockMailService.sendOtpEmail).not.toHaveBeenCalled();
    });

    // --- cooldown -----------------------------------------------------------

    it('throws BadRequestException during the 60-second cooldown window', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      // OTP was created 10 seconds ago — still within the 60-second window
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(
        makeOtpRow({ createdAt: new Date(Date.now() - 10 * 1000) }),
      );

      await expect(service.resendOTP(EMAIL)).rejects.toThrow(
        BadRequestException,
      );

      const error = await service.resendOTP(EMAIL).catch((e) => e);
      expect(error.message).toMatch(/Please wait \d+ seconds? before requesting a new code/);
      expect(mockMailService.sendOtpEmail).not.toHaveBeenCalled();
    });

    it('error message shows exact seconds remaining', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      // Created 45 seconds ago: 15 seconds remain
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(
        makeOtpRow({ createdAt: new Date(Date.now() - 45 * 1000) }),
      );

      const err = await service.resendOTP(EMAIL).catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toMatch(/15 second/);
    });

    // --- after cooldown expires ---------------------------------------------

    it('sends a new OTP when cooldown has elapsed', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      // OTP was created 90 seconds ago — outside the 60-second window
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(
        makeOtpRow({ createdAt: new Date(Date.now() - 90 * 1000) }),
      );
      mockDb.delete.mockReturnValue(makeDeleteChain());
      mockDb.insert.mockReturnValue(makeInsertChain());
      mockMailService.sendOtpEmail.mockResolvedValue(undefined);

      await expect(service.resendOTP(EMAIL)).resolves.toBeUndefined();
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith(
        EMAIL,
        expect.stringMatching(/^\d{6}$/),
        'email_verification',
      );
    });

    it('sends a new OTP when no prior OTP row exists (first resend)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      mockDb.query.otpVerifications.findFirst.mockResolvedValue(null);
      mockDb.delete.mockReturnValue(makeDeleteChain());
      mockDb.insert.mockReturnValue(makeInsertChain());
      mockMailService.sendOtpEmail.mockResolvedValue(undefined);

      await expect(service.resendOTP(EMAIL)).resolves.toBeUndefined();
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // generateSecureOTP (private — tested via observable side-effects)
  // ===========================================================================

  describe('generateSecureOTP (via createAndSendOTP)', () => {
    it('always produces a 6-digit zero-padded numeric string', async () => {
      mockDb.delete.mockReturnValue(makeDeleteChain());
      mockDb.insert.mockReturnValue(makeInsertChain());
      mockMailService.sendOtpEmail.mockResolvedValue(undefined);

      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        jest.clearAllMocks();
        mockDb.delete.mockReturnValue(makeDeleteChain());
        mockDb.insert.mockReturnValue(makeInsertChain());
        mockMailService.sendOtpEmail.mockResolvedValue(undefined);

        await service.createAndSendOTP(USER_ID, EMAIL);
        const [, code] = mockMailService.sendOtpEmail.mock.calls[0];
        expect(code).toMatch(/^\d{6}$/);
        codes.add(code);
      }
      // With 20 calls, having at least 2 distinct values proves the generator
      // is not static. (Probability of all 20 being the same is 10^-114.)
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  // ===========================================================================
  // Integrity: hash is never the plaintext code
  // ===========================================================================

  describe('Security invariants', () => {
    it('never stores the raw plaintext OTP in the database', async () => {
      mockDb.delete.mockReturnValue(makeDeleteChain());
      mockDb.insert.mockReturnValue(makeInsertChain());
      mockMailService.sendOtpEmail.mockResolvedValue(undefined);

      await service.createAndSendOTP(USER_ID, EMAIL);

      const [, sentCode] = mockMailService.sendOtpEmail.mock.calls[0];
      const insertedValues = mockDb.insert().values.mock.calls[0][0];

      // codeHash must not equal the plaintext code
      expect(insertedValues.codeHash).not.toBe(sentCode);
      // codeHash must equal the HMAC of the sent code with the test pepper
      expect(insertedValues.codeHash).toBe(hashCode(sentCode));
    });

    it('two different codes always produce two different hashes', async () => {
      const hash1 = hashCode('111111');
      const hash2 = hashCode('222222');
      expect(hash1).not.toBe(hash2);
    });

    it('the same code with two different peppers produces different hashes', () => {
      const hash1 = crypto
        .createHmac('sha256', 'pepper-A')
        .update('123456')
        .digest('hex');
      const hash2 = crypto
        .createHmac('sha256', 'pepper-B')
        .update('123456')
        .digest('hex');
      expect(hash1).not.toBe(hash2);
    });
  });
});

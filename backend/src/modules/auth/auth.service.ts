import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './DTO/login.dto';
import { ChangePasswordDto } from './DTO/change-password.dto';
import { UpdateProfileDto } from './DTO/update-profile.dto';
import { ResetPasswordDto } from './DTO/reset-password.dto';
import { OtpService } from '../otp/otp.service';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private tokenService: TokenService,
    private auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const { email, password } = loginDto;

    // 1. Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Email not verified. Please check your inbox.',
      );
    }

    // 3. Check account status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Account is not active. Contact administrator.',
      );
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 5. Update last login timestamp
    await this.usersService.updateLastLogin(user.id);

    // 6. Generate access token + opaque refresh token
    const accessToken = await this.generateAccessToken(user);
    const rawRefreshToken = this.tokenService.generateRawRefreshToken();
    await this.tokenService.storeRefreshToken(
      user.id,
      rawRefreshToken,
      ip,
      userAgent,
    );

    // 7. Return sanitized user + tokens
    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Validate credentials without enforcing email verification or status.
   * Used by the frontend to determine if a provided password is correct for an email
   * when the login response indicates the account is unverified.
   *
   * Returns true if credentials are valid, otherwise throws UnauthorizedException.
   */
  async validateCredentials(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    // If we reach here, credentials are valid
    return true;
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Silent — never reveal whether an account exists for this email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.debug(
        `[AUTH] Password reset requested for unknown email: ${email}`,
      );
      return; // Return silently — same response as a real account
    }
    await this.otpService.createAndSendOTP(
      user.id,
      user.email,
      'password_reset',
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    await this.otpService.verifyOTP(dto.email, dto.code, 'password_reset');
    // Silent — do not reveal if the email exists
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return;
    }
    await this.usersService.updatePassword(user.id, dto.newPassword);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const { oldPassword, newPassword } = dto;

    // 1. Get user by ID
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 2. Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    // 3. Update to new password
    await this.usersService.updatePassword(userId, newPassword);
  }

  async setInitialPassword(
    email: string,
    otpCode: string,
    newPassword: string,
  ): Promise<void> {
    // 1. Verify the OTP (this also marks email as verified and activates account)
    await this.otpService.verifyOTP(email, otpCode, 'email_verification');

    // 2. Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. Update password
    await this.usersService.updatePassword(user.id, newPassword);
  }

  /**
   * Set password after OTP has already been consumed and the account is ACTIVE.
   * Called from POST /auth/set-activation-password (the optional step after /verify-email).
   * Uses account status as the gate — no OTP required here.
   */
  async setActivationPassword(
    email: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isEmailVerified || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not yet verified or active');
    }
    await this.usersService.updatePassword(user.id, newPassword);
  }

  async refreshToken(
    rawToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Validate the opaque token in DB, revoke it, issue a new one (rotation)
    const { newRawToken, userId } = await this.tokenService.validateAndRotate(
      rawToken,
      ip,
      userAgent,
    );

    // 2. Ensure user is still active
    const user = await this.usersService.findById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // 3. Issue fresh access token
    const accessToken = await this.generateAccessToken(user);

    return { accessToken, refreshToken: newRawToken };
  }

  async logout(rawToken: string): Promise<void> {
    // Revoke the specific refresh token; silently no-op if already gone
    try {
      await this.tokenService.revokeByToken(rawToken);
    } catch {
      // Non-critical — cookie will be cleared regardless
    }
  }

  private async generateAccessToken(user: any): Promise<string> {
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.accessTokenExpiry'),
    });
  }

  private sanitizeUser(user: any) {
    const { password, userRoles, ...result } = user;
    return {
      ...result,
      roles: user.roles.map((role) => role.name),
    };
  }

  // Update profile fields for a user
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.usersService.updateUser(userId, dto);
    await this.auditService.log({
      actorId: userId,
      action: 'profile.updated',
      targetType: 'student_profile',
      targetId: userId,
      metadata: {
        fields: Object.keys(dto),
      },
    });
    return this.sanitizeUser(updated);
  }
}

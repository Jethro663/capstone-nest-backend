import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './DTO/login.dto';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
  ) {}

  async login(loginDto: LoginDto) {
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

    // 6. Generate tokens
    const tokens = await this.generateTokens(user);

    // 7. Return sanitized user + tokens
    return {
      user: this.sanitizeUser(user),
      ...tokens,
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
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    // If we reach here, credentials are valid
    return true;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email/Account not found');
    }
    await this.otpService.createAndSendOTP(
      user.id,
      user.email,
      'password_reset',
    );
  }

  async resetPassword(dto: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<void> {
    await this.otpService.verifyOTP(dto.email, dto.code);
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.updatePassword(user.id, dto.newPassword);
  }

  async changePassword(userId: string, dto: any): Promise<void> {
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

  async setInitialPassword(email: string, otpCode: string, newPassword: string): Promise<void> {
    // 1. Verify the OTP (this also marks email as verified and activates account)
    await this.otpService.verifyOTP(email, otpCode);

    // 2. Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. Update password
    await this.usersService.updatePassword(user.id, newPassword);
  }

  async refreshToken(refreshToken: string) {
    try {
      // 1. Verify the refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      // 2. Check token type
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // 3. Get fresh user data
      const user = await this.usersService.findById(payload.userId);
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // 4. Generate new access token
      const accessToken = await this.generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: any) {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
    };
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

  private async generateRefreshToken(user: any): Promise<string> {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshTokenExpiry'),
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
  async updateProfile(userId: string, dto: any) {
    const updated = await this.usersService.updateUser(userId, dto);
    return this.sanitizeUser(updated);
  }
}

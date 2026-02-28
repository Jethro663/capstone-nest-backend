import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Res,
  Req,
  UnauthorizedException,
  InternalServerErrorException,
  Patch,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { LoginDto } from './DTO/login.dto';
import { UpdateProfileDto } from './DTO/update-profile.dto';
import { ChangePasswordDto } from './DTO/change-password.dto';
import { ValidateCredentialsDto } from './DTO/validate-credentials.dto';
import { ForgotPasswordDto } from './DTO/forgot-password.dto';
import { ResetPasswordDto } from './DTO/reset-password.dto';
import { SetInitialPasswordDto } from './DTO/set-initial-password.dto';
import { SetActivationPasswordDto } from './DTO/set-activation-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { parseExpiryMs } from './utils/parse-expiry.util';

@ApiTags('auth')
@ApiBearerAuth('token')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Cookie options built per-request so `secure` is read from the live
   * environment and `maxAge` stays in sync with the DB token TTL.
   */
  private refreshCookieOptions() {
    const ttlMs = parseExpiryMs(
      this.configService.get<string>('jwt.refreshTokenExpiry'),
    );
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: ttlMs,
    };
  }

  // --------------------------------------------------------------------------
  // Login
  // --------------------------------------------------------------------------

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts / 60 s per IP
  @ApiOperation({ summary: 'Authenticate user and obtain tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    const result = await this.authService.login(loginDto, ip, userAgent);

    response.cookie('refreshToken', result.refreshToken, this.refreshCookieOptions());

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Refresh (token rotation)
  // --------------------------------------------------------------------------

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // capped but generous — normal clients rotate once per 15 min
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Rotate refresh token and obtain new access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const refreshToken = request.cookies?.['refreshToken'] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    const result = await this.authService.refreshToken(refreshToken, ip, userAgent);

    // Rotation: replace cookie with newly issued opaque token
    response.cookie('refreshToken', result.refreshToken, this.refreshCookieOptions());

    return {
      success: true,
      message: 'Token refreshed',
      data: { accessToken: result.accessToken },
    };
  }

  // --------------------------------------------------------------------------
  // Logout
  // --------------------------------------------------------------------------

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: 'Revoke refresh token and clear cookie' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const refreshToken = request.cookies?.['refreshToken'] as string;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear with same path/domain as when it was set
    response.clearCookie('refreshToken', { path: '/' });

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  // --------------------------------------------------------------------------
  // Logout all devices
  // --------------------------------------------------------------------------

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user (all devices)' })
  @ApiResponse({ status: 200, description: 'All sessions revoked' })
  async logoutAll(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    if (!user?.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    await this.tokenService.revokeAllForUser(user.userId);
    response.clearCookie('refreshToken', { path: '/' });

    return {
      success: true,
      message: 'All sessions revoked successfully.',
    };
  }

  // --------------------------------------------------------------------------
  // Password reset (silent — never reveals if email exists)
  // --------------------------------------------------------------------------

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts / 5 min
  @ApiOperation({ summary: 'Request a password reset OTP' })
  @ApiResponse({
    status: 200,
    description: 'If an account exists, a reset code was sent',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(dto.email);
    return {
      success: true,
      message: 'If an account with that email exists, a reset code has been sent.',
    };
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Reset password using OTP code' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { success: true, message: 'Password reset successful' };
  }

  // --------------------------------------------------------------------------
  // Validate credentials (rate-limited)
  // --------------------------------------------------------------------------

  @Public()
  @Post('validate-credentials')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // same as login
  @ApiOperation({
    summary: 'Validate email + password without completing login',
    description:
      'Used by the frontend to confirm a password is correct when the account is unverified.',
  })
  @ApiBody({ type: ValidateCredentialsDto })
  @ApiResponse({ status: 200, description: 'Credentials valid' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async validateCredentials(@Body() dto: ValidateCredentialsDto) {
    await this.authService.validateCredentials(dto.email, dto.password);
    return { success: true, message: 'Credentials valid' };
  }

  // --------------------------------------------------------------------------
  // Get current user
  // --------------------------------------------------------------------------

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      success: true,
      data: { user },
    };
  }

  // --------------------------------------------------------------------------
  // Change password
  // --------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Change the authenticated user's password" })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    if (!user || !user.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    await this.authService.changePassword(user.userId, dto);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  // --------------------------------------------------------------------------
  // Set initial password (account activation)
  // --------------------------------------------------------------------------

  @Public()
  @Post('set-initial-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Set the first password when activating via OTP' })
  @ApiBody({ type: SetInitialPasswordDto })
  @ApiResponse({ status: 200, description: 'Password set successfully' })
  async setInitialPassword(@Body() dto: SetInitialPasswordDto) {
    await this.authService.setInitialPassword(dto.email, dto.code, dto.newPassword);

    return {
      success: true,
      message: 'Password set successfully. You can now log in.',
    };
  }

  // --------------------------------------------------------------------------
  // Set activation password (called AFTER OTP verification — no code needed)
  // --------------------------------------------------------------------------

  @Public()
  @Post('set-activation-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({
    summary: 'Set password after OTP activation (account already ACTIVE)',
    description:
      'Called after the student has verified their OTP. No OTP code required — account ACTIVE status is the gate.',
  })
  @ApiBody({ type: SetActivationPasswordDto })
  @ApiResponse({ status: 200, description: 'Password set successfully' })
  async setActivationPassword(@Body() dto: SetActivationPasswordDto) {
    await this.authService.setActivationPassword(dto.email, dto.newPassword);
    return {
      success: true,
      message: 'Password set successfully. You can now log in.',
    };
  }

  // --------------------------------------------------------------------------
  // Update profile
  // --------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @SkipThrottle()
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    if (!user || !user.userId) {
      this.logger.warn('[AUTH] updateProfile called without authenticated user');
      throw new UnauthorizedException('Not authenticated');
    }

    this.logger.debug(
      `[AUTH] PATCH /auth/profile for user ${user.userId}`,
    );

    try {
      const updated = await this.authService.updateProfile(user.userId, dto);
      return {
        success: true,
        message: 'Profile updated',
        data: { user: updated },
      };
    } catch (error) {
      this.logger.error(
        `[AUTH] updateProfile failed for user ${user.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Profile update failed');
    }
  }
}

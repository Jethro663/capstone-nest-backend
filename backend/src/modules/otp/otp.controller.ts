import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { Public } from '../auth/decorators/public.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('OTP')
@ApiBearerAuth('token')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  // 5 attempts per 60 s per IP — tighter than the global 30/60 s fallback
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify email using OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    await this.otpService.verifyOTP(verifyOtpDto.email, verifyOtpDto.code);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  @Public()
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  // 3 requests per 5 min per IP — matches /auth/forgot-password
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Resend verification OTP' })
  @ApiResponse({
    status: 200,
    description:
      'If the address is registered and unverified, a new code has been sent.',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    await this.otpService.resendOTP(resendOtpDto.email);

    return {
      success: true,
      message:
        'If the address is registered and unverified, a new code has been sent.',
    };
  }
}

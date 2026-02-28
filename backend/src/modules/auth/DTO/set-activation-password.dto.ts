import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

/**
 * Used by POST /auth/set-activation-password
 *
 * Called AFTER OTP verification has already activated the account.
 * No OTP code needed here — the account status (ACTIVE + isEmailVerified)
 * acts as the gate.
 */
export class SetActivationPasswordDto {
  @ApiProperty({ example: 'student@school.edu' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsStrongPassword(
    'MyP@ss1!',
    'New password (min 8 chars, uppercase, lowercase, digit, special character)',
  )
  newPassword: string;
}

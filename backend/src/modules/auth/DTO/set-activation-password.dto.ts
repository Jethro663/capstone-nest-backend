import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

/**
 * Used by POST /auth/set-activation-password
 *
 * Called AFTER OTP verification has already activated the account.
 * The current temporary password proves ownership after the OTP is consumed.
 */
export class SetActivationPasswordDto {
  @ApiProperty({ example: 'student@school.edu' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Current temporary password supplied during onboarding',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword: string;

  @IsStrongPassword(
    'MyP@ss1!',
    'New password (min 8 chars, uppercase, lowercase, digit, special character)',
  )
  newPassword: string;
}

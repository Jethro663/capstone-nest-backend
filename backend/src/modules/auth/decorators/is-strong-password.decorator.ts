import { applyDecorators } from '@nestjs/common';
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Composite decorator that enforces the project's standard password strength rules.
 *
 * Applies: @IsString, @IsNotEmpty, @MinLength(8), plus four @Matches rules for
 * uppercase, lowercase, digit, and special character — plus @ApiProperty.
 *
 * Usage:
 *   @IsStrongPassword()
 *   newPassword: string;
 */
export function IsStrongPassword(example = 'P@ssw0rd!', descriptionOverride?: string) {
  return applyDecorators(
    ApiProperty({
      example,
      description:
        descriptionOverride ??
        'Min 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&#)',
    }),
    IsString({ message: 'Password must be a string' }),
    IsNotEmpty({ message: 'Password is required' }),
    MinLength(8, { message: 'Password must be at least 8 characters' }),
    Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' }),
    Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' }),
    Matches(/\d/, { message: 'Password must contain at least one number' }),
    Matches(/[@$!%*?&#]/, { message: 'Password must contain at least one special character (@$!%*?&#)' }),
  );
}

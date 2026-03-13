import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'student@school.edu' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: '123456', description: 'OTP code sent to email' })
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  code: string;

  @IsStrongPassword(
    'NewP@ss1!',
    'New password (min 8 chars, uppercase, lowercase, digit, special character)',
  )
  newPassword: string;
}

import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

export class SetInitialPasswordDto {
  @ApiProperty({ example: 'student@school.edu' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: '123456', description: 'OTP activation code' })
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  code: string;

  @IsStrongPassword(
    'MyP@ss1!',
    'Initial password (min 8 chars, uppercase, lowercase, digit, special character)',
  )
  newPassword: string;
}

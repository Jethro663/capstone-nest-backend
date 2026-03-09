import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ss1', description: 'Current password' })
  @IsString({ message: 'Old password must be a string' })
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsStrongPassword('NewP@ss1!', 'New password (min 8 chars, uppercase, lowercase, digit, special character)')
  newPassword: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsStrongPassword('NewP@ss1!', 'Confirm password (min 8 chars, uppercase, lowercase, digit, special character)')
  confirmPassword: string;
}

import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  lowerTrimmedValue,
  PASSWORD_SAFE_REGEX,
} from '../../../common/validation/input-policy';
import { Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@lms.local',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => lowerTrimmedValue(value))
  email: string;

  @ApiProperty({ example: 'Test@123', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @Matches(PASSWORD_SAFE_REGEX, {
    message: 'Password contains unsupported control characters',
  })
  password: string;
}

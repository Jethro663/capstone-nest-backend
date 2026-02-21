import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@school.edu' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

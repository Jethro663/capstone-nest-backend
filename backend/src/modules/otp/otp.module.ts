import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { MailModule } from '../mail/mail.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, MailModule],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { OtpModule } from '../otp/otp.module';
import { RolesModule } from '../roles/roles.module';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [OtpModule, RolesModule],
  controllers: [UsersController],
  providers: [UsersService, MailService],
  exports: [UsersService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { OtpModule } from '../otp/otp.module';
import { RolesModule } from '../roles/roles.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [OtpModule, RolesModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

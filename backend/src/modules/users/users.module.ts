import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesModule } from '../roles/roles.module';
import { OtpModule } from '../otp/otp.module';
import { MailModule } from '../mail/mail.module';
import { UserEventsListener } from './listeners/user-events.listener';

@Module({
  imports: [RolesModule, OtpModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService, UserEventsListener],
  exports: [UsersService],
})
export class UsersModule {}

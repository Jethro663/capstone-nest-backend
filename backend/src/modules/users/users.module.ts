import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesModule } from '../roles/roles.module';
import { OtpModule } from '../otp/otp.module';
import { MailModule } from '../mail/mail.module';
import { UserEventsListener } from './listeners/user-events.listener';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [RolesModule, OtpModule, MailModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService, UserEventsListener],
  exports: [UsersService],
})
export class UsersModule {}

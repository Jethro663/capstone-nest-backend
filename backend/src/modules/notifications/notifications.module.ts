import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { AnnouncementFanOutProcessor } from './processors/announcement-fan-out.processor';
import { AssessmentNotificationDispatchService } from './assessment-notification-dispatch.service';
import { AssessmentNotificationProcessor } from './processors/assessment-notification.processor';

@Module({
  imports: [
    // Consume the same 'announcements' queue that AnnouncementsModule enqueues into
    BullModule.registerQueue({
      name: 'announcements',
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    // JwtService needed by the WebSocket gateway for token verification
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    AssessmentNotificationDispatchService,
    AnnouncementFanOutProcessor,
    AssessmentNotificationProcessor,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    AssessmentNotificationDispatchService,
  ],
})
export class NotificationsModule {}

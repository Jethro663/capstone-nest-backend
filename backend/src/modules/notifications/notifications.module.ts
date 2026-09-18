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
import { NotificationDevicesService } from './notification-devices.service';
import { PushTokenProtectionService } from './push-token-protection.service';
import {
  PUSH_NOTIFICATION_QUEUE,
  PushNotificationDispatchService,
} from './push-notification-dispatch.service';
import { ExpoPushProvider } from './expo-push.provider';
import { PushNotificationProcessor } from './processors/push-notification.processor';

@Module({
  imports: [
    // Consume the same 'announcements' queue that AnnouncementsModule enqueues into
    BullModule.registerQueue({
      name: 'announcements',
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    BullModule.registerQueue({
      name: PUSH_NOTIFICATION_QUEUE,
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
    NotificationDevicesService,
    PushTokenProtectionService,
    PushNotificationDispatchService,
    ExpoPushProvider,
    PushNotificationProcessor,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    AssessmentNotificationDispatchService,
    NotificationDevicesService,
    PushNotificationDispatchService,
  ],
})
export class NotificationsModule {}

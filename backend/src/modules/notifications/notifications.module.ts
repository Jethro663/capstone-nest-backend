import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { AnnouncementFanOutProcessor } from './processors/announcement-fan-out.processor';

@Module({
  imports: [
    // Consume the same 'announcements' queue that AnnouncementsModule enqueues into
    BullModule.registerQueue({
      name: 'announcements',
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
    AnnouncementFanOutProcessor,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LxpController } from './lxp.controller';
import { LxpService } from './lxp.service';
import { LxpPerformanceListener } from './listeners/lxp-performance.listener';

@Module({
  imports: [DatabaseModule, NotificationsModule, EventEmitterModule],
  controllers: [LxpController],
  providers: [LxpService, LxpPerformanceListener],
  exports: [LxpService],
})
export class LxpModule {}

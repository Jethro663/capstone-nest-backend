import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LxpController } from './lxp.controller';
import { LxpService } from './lxp.service';
import { LxpPerformanceListener } from './listeners/lxp-performance.listener';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    EventEmitterModule,
    AuditModule,
  ],
  controllers: [LxpController],
  providers: [LxpService, LxpPerformanceListener],
  exports: [LxpService],
})
export class LxpModule {}

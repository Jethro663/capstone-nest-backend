import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LxpController } from './lxp.controller';
import { LxpService } from './lxp.service';
import { LxpPerformanceListener } from './listeners/lxp-performance.listener';
import { AuditModule } from '../audit/audit.module';
import { SystemEvaluationService } from './system-evaluation.service';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    EventEmitterModule,
    AuditModule,
  ],
  controllers: [LxpController],
  providers: [LxpService, SystemEvaluationService, LxpPerformanceListener],
  exports: [LxpService, SystemEvaluationService],
})
export class LxpModule {}

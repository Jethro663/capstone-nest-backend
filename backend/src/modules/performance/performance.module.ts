import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PerformanceEventsListener } from './listeners/performance-events.listener';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, EventEmitterModule, AuditModule],
  controllers: [PerformanceController],
  providers: [PerformanceService, PerformanceEventsListener],
  exports: [PerformanceService],
})
export class PerformanceModule {}

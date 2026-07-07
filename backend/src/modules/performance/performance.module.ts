import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PerformanceEventsListener } from './listeners/performance-events.listener';
import { PerformanceRecomputeQueueService } from './performance-recompute-queue.service';
import { PerformanceRecomputeProcessor } from './performance-recompute.processor';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule,
    AuditModule,
    BullModule.registerQueue({
      name: 'performance-recompute',
    }),
  ],
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    PerformanceEventsListener,
    PerformanceRecomputeQueueService,
    PerformanceRecomputeProcessor,
  ],
  exports: [PerformanceService, PerformanceRecomputeQueueService],
})
export class PerformanceModule {}

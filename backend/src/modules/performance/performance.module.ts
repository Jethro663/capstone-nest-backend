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
import { PerformanceSnapshotReadService } from './performance-snapshot-read.service';
import { ClassRecordModule } from '../class-record/class-record.module';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule,
    AuditModule,
    ClassRecordModule,
    BullModule.registerQueue({
      name: 'performance-recompute',
    }),
  ],
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    PerformanceSnapshotReadService,
    PerformanceEventsListener,
    PerformanceRecomputeQueueService,
    PerformanceRecomputeProcessor,
  ],
  exports: [
    PerformanceService,
    PerformanceSnapshotReadService,
    PerformanceRecomputeQueueService,
  ],
})
export class PerformanceModule {}

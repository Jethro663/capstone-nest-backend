import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PerformanceEventsListener } from './listeners/performance-events.listener';

@Module({
  imports: [DatabaseModule, EventEmitterModule],
  controllers: [PerformanceController],
  providers: [PerformanceService, PerformanceEventsListener],
  exports: [PerformanceService],
})
export class PerformanceModule {}

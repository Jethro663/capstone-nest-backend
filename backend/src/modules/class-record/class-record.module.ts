import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { ClassRecordController } from './class-record.controller';
import { ClassRecordService } from './class-record.service';
import { ClassRecordComputationService } from './class-record-computation.service';
import { ClassRecordSyncService } from './class-record-sync.service';
import { AdviserSectionGuard } from './guards/adviser-section.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, EventEmitterModule, AuditModule],
  controllers: [ClassRecordController],
  providers: [
    ClassRecordService,
    ClassRecordComputationService,
    ClassRecordSyncService,
    AdviserSectionGuard,
  ],
  exports: [ClassRecordService],
})
export class ClassRecordModule {}

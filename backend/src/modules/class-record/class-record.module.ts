import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ClassRecordController } from './class-record.controller';
import { ClassRecordService } from './class-record.service';
import { ClassRecordComputationService } from './class-record-computation.service';
import { ClassRecordSyncService } from './class-record-sync.service';
import { AdviserSectionGuard } from './guards/adviser-section.guard';

@Module({
  imports: [DatabaseModule],
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

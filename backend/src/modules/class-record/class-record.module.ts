import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { ClassRecordController } from './class-record.controller';
import { ClassRecordService } from './class-record.service';
import { ClassRecordComputationService } from './class-record-computation.service';
import { ClassRecordSyncService } from './class-record-sync.service';
import { TransmutationService } from './transmutation.service';
import { AdviserSectionGuard } from './guards/adviser-section.guard';
import { AuditModule } from '../audit/audit.module';
import { AcademicPolicyModule } from '../academic-state/academic-policy.module';
import { AcademicGradingModule } from '../academic-state/academic-grading.module';
import { ClassRecordReadinessService } from './class-record-readiness.service';
import { ClassRecordRosterService } from './class-record-roster.service';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule,
    AuditModule,
    AcademicPolicyModule,
    AcademicGradingModule,
  ],
  controllers: [ClassRecordController],
  providers: [
    ClassRecordService,
    ClassRecordReadinessService,
    ClassRecordRosterService,
    ClassRecordComputationService,
    ClassRecordSyncService,
    TransmutationService,
    AdviserSectionGuard,
  ],
  exports: [
    ClassRecordService,
    ClassRecordReadinessService,
    TransmutationService,
  ],
})
export class ClassRecordModule {}

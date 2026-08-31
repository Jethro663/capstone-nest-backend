import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AcademicStateController } from './academic-state.controller';
import { AcademicStateService } from './academic-state.service';
import { AcademicPolicyModule } from './academic-policy.module';
import { AcademicPeriodService } from './academic-period.service';
import { AcademicReadinessModule } from './academic-readiness.module';
import { AcademicAuditService } from './academic-audit.service';
import { AcademicRepairService } from './academic-repair.service';
import { AcademicRepairController } from './academic-repair.controller';
import { AcademicGradingModule } from './academic-grading.module';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    NotificationsModule,
    AcademicPolicyModule,
    AcademicReadinessModule,
    AcademicGradingModule,
  ],
  controllers: [AcademicStateController, AcademicRepairController],
  providers: [
    AcademicStateService,
    AcademicPeriodService,
    AcademicAuditService,
    AcademicRepairService,
  ],
  exports: [AcademicStateService],
})
export class AcademicStateModule {}

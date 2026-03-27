import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditModule } from '../audit/audit.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { HealthModule } from '../health/health.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [AuditModule, ReportsModule, AnalyticsModule, HealthModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

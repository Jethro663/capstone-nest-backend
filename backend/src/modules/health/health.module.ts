import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { WorkflowDiagnosticsController } from './workflow-diagnostics.controller';
import {
  WORKFLOW_DIAGNOSTICS_CLOCK,
  WorkflowDiagnosticsService,
} from './workflow-diagnostics.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [HealthController, WorkflowDiagnosticsController],
  providers: [
    HealthService,
    WorkflowDiagnosticsService,
    { provide: WORKFLOW_DIAGNOSTICS_CLOCK, useValue: () => new Date() },
  ],
  exports: [HealthService, WorkflowDiagnosticsService],
})
export class HealthModule {}

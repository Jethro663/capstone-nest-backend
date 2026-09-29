import { Module } from '@nestjs/common';
import { AcademicPolicyModule } from '../academic-state/academic-policy.module';
import { AdminMaintenanceModule } from '../admin-maintenance/admin-maintenance.module';
import { HealthModule } from '../health/health.module';
import { SystemCapabilitiesController } from './system-capabilities.controller';
import {
  SYSTEM_CAPABILITIES_CLOCK,
  SystemCapabilitiesService,
} from './system-capabilities.service';

@Module({
  imports: [AcademicPolicyModule, AdminMaintenanceModule, HealthModule],
  controllers: [SystemCapabilitiesController],
  providers: [
    SystemCapabilitiesService,
    { provide: SYSTEM_CAPABILITIES_CLOCK, useValue: () => new Date() },
  ],
  exports: [SystemCapabilitiesService],
})
export class SystemCapabilitiesModule {}

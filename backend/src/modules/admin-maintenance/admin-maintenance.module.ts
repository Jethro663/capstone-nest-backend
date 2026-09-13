import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AdminMaintenanceController } from './admin-maintenance.controller';
import {
  ADMIN_MAINTENANCE_CLOCK,
  AdminMaintenanceService,
} from './admin-maintenance.service';

@Global()
@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [AdminMaintenanceController],
  providers: [
    AdminMaintenanceService,
    { provide: ADMIN_MAINTENANCE_CLOCK, useValue: () => new Date() },
  ],
  exports: [AdminMaintenanceService],
})
export class AdminMaintenanceModule {}

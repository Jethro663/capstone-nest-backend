import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AdminDemoModeController } from './admin-demo-mode.controller';
import {
  ADMIN_DEMO_MODE_CLOCK,
  AdminDemoModeService,
} from './admin-demo-mode.service';

@Global()
@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [AdminDemoModeController],
  providers: [
    AdminDemoModeService,
    { provide: ADMIN_DEMO_MODE_CLOCK, useValue: () => new Date() },
  ],
  exports: [AdminDemoModeService],
})
export class AdminDemoModeModule {}

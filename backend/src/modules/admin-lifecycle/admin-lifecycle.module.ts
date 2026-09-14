import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminLifecycleController } from './admin-lifecycle.controller';
import { AdminMaintenanceLifecycleController } from './admin-maintenance-lifecycle.controller';
import { AdminLifecycleService } from './admin-lifecycle.service';
import { AdminErasureService } from './admin-erasure.service';
import { ClassLifecycleService } from './class-lifecycle.service';
import { PurgeLifecycleService } from './purge-lifecycle.service';
import { SectionLifecycleService } from './section-lifecycle.service';
import { StudentLifecycleService } from './student-lifecycle.service';
import { AdminErasureCleanupProcessor } from './admin-erasure-cleanup.processor';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    NotificationsModule,
    BullModule.registerQueue({ name: 'admin-erasure-cleanup' }),
  ],
  controllers: [AdminLifecycleController, AdminMaintenanceLifecycleController],
  providers: [
    AdminLifecycleService,
    StudentLifecycleService,
    ClassLifecycleService,
    SectionLifecycleService,
    PurgeLifecycleService,
    AdminErasureService,
    AdminErasureCleanupProcessor,
  ],
  exports: [AdminLifecycleService, PurgeLifecycleService, AdminErasureService],
})
export class AdminLifecycleModule {}

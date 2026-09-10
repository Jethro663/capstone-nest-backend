import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminLifecycleController } from './admin-lifecycle.controller';
import { AdminLifecycleService } from './admin-lifecycle.service';
import { ClassLifecycleService } from './class-lifecycle.service';
import { PurgeLifecycleService } from './purge-lifecycle.service';
import { SectionLifecycleService } from './section-lifecycle.service';
import { StudentLifecycleService } from './student-lifecycle.service';

@Module({
  imports: [DatabaseModule, AuditModule, NotificationsModule],
  controllers: [AdminLifecycleController],
  providers: [
    AdminLifecycleService,
    StudentLifecycleService,
    ClassLifecycleService,
    SectionLifecycleService,
    PurgeLifecycleService,
  ],
  exports: [AdminLifecycleService, PurgeLifecycleService],
})
export class AdminLifecycleModule {}

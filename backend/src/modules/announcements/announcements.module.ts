import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsScheduler } from './announcements.scheduler';
import { AuditModule } from '../audit/audit.module';
import { TeacherAnnouncementsController } from './teacher-announcements.controller';

@Module({
  imports: [
    AuditModule,
    BullModule.registerQueue({
      name: 'announcements',
    }),
  ],
  controllers: [AnnouncementsController, TeacherAnnouncementsController],
  providers: [AnnouncementsService, AnnouncementsScheduler],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}

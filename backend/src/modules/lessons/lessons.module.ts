import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StudentLessonAccessService } from './student-lesson-access.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [LessonsController],
  providers: [LessonsService, StudentLessonAccessService],
  exports: [LessonsService, StudentLessonAccessService],
})
export class LessonsModule {}

import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StudentLessonAccessService } from './student-lesson-access.service';
import { LessonPreviewTokenService } from './lesson-preview-token.service';
import { FileUploadModule } from '../file-upload/file-upload.module';

@Module({
  imports: [DatabaseModule, AuditModule, FileUploadModule],
  controllers: [LessonsController],
  providers: [
    LessonsService,
    StudentLessonAccessService,
    LessonPreviewTokenService,
  ],
  exports: [LessonsService, StudentLessonAccessService],
})
export class LessonsModule {}

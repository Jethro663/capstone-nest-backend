import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { AuditModule } from '../audit/audit.module';
import { LibraryIndexingService } from './library-indexing.service';
import { LibraryIndexingProcessor } from './processors/library-indexing.processor';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    BullModule.registerQueue({
      name: 'library-indexing',
    }),
  ],
  controllers: [FileUploadController],
  providers: [
    FileUploadService,
    LibraryIndexingService,
    LibraryIndexingProcessor,
  ],
  exports: [FileUploadService, LibraryIndexingService],
})
export class FileUploadModule {}

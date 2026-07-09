import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { FileUploadController } from './file-upload.controller';
import { InternalUploadsController } from './internal-uploads.controller';
import { FileUploadService } from './file-upload.service';
import { AuditModule } from '../audit/audit.module';
import { LibraryIndexingService } from './library-indexing.service';
import { LibraryIndexingProcessor } from './processors/library-indexing.processor';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    StorageModule,
    BullModule.registerQueue({
      name: 'library-indexing',
    }),
  ],
  controllers: [FileUploadController, InternalUploadsController],
  providers: [
    FileUploadService,
    LibraryIndexingService,
    LibraryIndexingProcessor,
  ],
  exports: [FileUploadService, LibraryIndexingService, StorageModule],
})
export class FileUploadModule {}

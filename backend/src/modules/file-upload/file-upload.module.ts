import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [FileUploadController],
  providers: [FileUploadService],
  exports: [FileUploadService], // exported for future AI module access
})
export class FileUploadModule {}

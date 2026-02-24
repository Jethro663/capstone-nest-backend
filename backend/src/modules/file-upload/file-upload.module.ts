import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FileUploadController],
  providers: [FileUploadService],
  exports: [FileUploadService], // exported for future AI module access
})
export class FileUploadModule {}

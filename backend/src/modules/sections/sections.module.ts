import { Module } from '@nestjs/common';
import {
  SectionsController,
  SectionsPublicController,
} from './sections.controller';
import { SectionsService } from './sections.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { ClassRecordModule } from '../class-record/class-record.module';

@Module({
  imports: [DatabaseModule, AuditModule, ClassRecordModule],
  controllers: [SectionsController, SectionsPublicController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}

import { Module } from '@nestjs/common';
import { SectionsController, SectionsPublicController } from './sections.controller';
import { SectionsService } from './sections.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [SectionsController, SectionsPublicController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}

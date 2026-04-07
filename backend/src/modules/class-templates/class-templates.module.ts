import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { ClassTemplatesController } from './class-templates.controller';
import { ClassTemplatesService } from './class-templates.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [ClassTemplatesController],
  providers: [ClassTemplatesService],
  exports: [ClassTemplatesService],
})
export class ClassTemplatesModule {}

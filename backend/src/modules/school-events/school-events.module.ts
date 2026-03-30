import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SchoolEventsController } from './school-events.controller';
import { SchoolEventsService } from './school-events.service';

@Module({
  imports: [AuditModule],
  controllers: [SchoolEventsController],
  providers: [SchoolEventsService],
  exports: [SchoolEventsService],
})
export class SchoolEventsModule {}

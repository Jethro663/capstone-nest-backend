import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsPublicController } from './assessments-public.controller';
import { AssessmentsService } from './assessments.service';
import { FeedbackService } from './feedback.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, EventEmitterModule, AuditModule],
  controllers: [AssessmentsController, AssessmentsPublicController],
  providers: [AssessmentsService, FeedbackService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}

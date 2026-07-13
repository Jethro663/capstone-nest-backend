import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsPublicController } from './assessments-public.controller';
import { AssessmentsService } from './assessments.service';
import { FeedbackService } from './feedback.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssessmentAccessService } from './assessment-access.service';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [AssessmentsController, AssessmentsPublicController],
  providers: [AssessmentsService, AssessmentAccessService, FeedbackService],
  exports: [AssessmentsService, AssessmentAccessService],
})
export class AssessmentsModule {}

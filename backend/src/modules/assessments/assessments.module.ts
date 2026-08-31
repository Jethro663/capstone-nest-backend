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
import { AcademicPolicyModule } from '../academic-state/academic-policy.module';
import { ClassRecordModule } from '../class-record/class-record.module';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule,
    AuditModule,
    NotificationsModule,
    AcademicPolicyModule,
    ClassRecordModule,
  ],
  controllers: [AssessmentsController, AssessmentsPublicController],
  providers: [AssessmentsService, AssessmentAccessService, FeedbackService],
  exports: [AssessmentsService, AssessmentAccessService],
})
export class AssessmentsModule {}

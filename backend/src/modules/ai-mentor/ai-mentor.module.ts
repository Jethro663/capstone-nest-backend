import { AiAssessmentAuthoringService } from './ai-assessment-authoring.service';
import { AssessmentsModule } from '../assessments/assessments.module';
import { AcademicPolicyModule } from '../academic-state/academic-policy.module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiMentorController } from './ai-mentor.controller';
import { AiProxyService } from './ai-proxy.service';
import { AdminAnalyticsChatService } from './admin-analytics-chat.service';
import { AiGenerationQueueService } from './ai-generation-queue.service';
import { AiGenerationProcessor } from './processors/ai-generation.processor';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AdminModule } from '../admin/admin.module';
import { ReportsModule } from '../reports/reports.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PerformanceModule } from '../performance/performance.module';
import { LxpModule } from '../lxp/lxp.module';
import { TeacherAiJobQueryService } from './teacher-ai-job-query.service';

/**
 * AI Mentor Module
 *
 * Now acts as a thin proxy layer — all AI logic (JAKIPIR chat, PDF extraction,
 * content safety, Ollama integration) has been migrated to the Python FastAPI
 * ai-service. This module retains JWT/Role guards and forwards authenticated
 * requests via AiProxyService.
 *
 * Lesson-plan (and later quiz) generation is orchestrated through a durable
 * BullMQ queue (`ai-teacher-generation`). The backend owns retry, backoff,
 * and concurrency control; ai-service is the stateless execution engine.
 */
@Module({
  imports: [
    AssessmentsModule,
    AcademicPolicyModule,
    DatabaseModule,
    AuditModule,
    AdminModule,
    ReportsModule,
    AnalyticsModule,
    PerformanceModule,
    LxpModule,
    BullModule.registerQueue({ name: 'ai-teacher-generation' }),
  ],
  controllers: [AiMentorController],
  providers: [
    AiAssessmentAuthoringService,
    AiProxyService,
    AdminAnalyticsChatService,
    AiGenerationQueueService,
    AiGenerationProcessor,
    TeacherAiJobQueryService,
  ],
  exports: [AiProxyService, AdminAnalyticsChatService],
})
export class AiMentorModule {}

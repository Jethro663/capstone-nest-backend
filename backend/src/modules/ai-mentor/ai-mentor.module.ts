import { Module } from '@nestjs/common';
import { AiMentorController } from './ai-mentor.controller';
import { AiProxyService } from './ai-proxy.service';
import { AdminAnalyticsChatService } from './admin-analytics-chat.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AdminModule } from '../admin/admin.module';
import { ReportsModule } from '../reports/reports.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PerformanceModule } from '../performance/performance.module';
import { LxpModule } from '../lxp/lxp.module';

/**
 * AI Mentor Module
 *
 * Now acts as a thin proxy layer — all AI logic (JAKIPIR chat, PDF extraction,
 * content safety, Ollama integration) has been migrated to the Python FastAPI
 * ai-service. This module retains JWT/Role guards and forwards authenticated
 * requests via AiProxyService.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    AdminModule,
    ReportsModule,
    AnalyticsModule,
    PerformanceModule,
    LxpModule,
  ],
  controllers: [AiMentorController],
  providers: [AiProxyService, AdminAnalyticsChatService],
  exports: [AiProxyService, AdminAnalyticsChatService],
})
export class AiMentorModule {}

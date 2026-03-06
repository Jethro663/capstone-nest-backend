import { Module } from '@nestjs/common';
import { AiMentorController } from './ai-mentor.controller';
import { AiProxyService } from './ai-proxy.service';

/**
 * AI Mentor Module
 *
 * Now acts as a thin proxy layer — all AI logic (JAKIPIR chat, PDF extraction,
 * content safety, Ollama integration) has been migrated to the Python FastAPI
 * ai-service. This module retains JWT/Role guards and forwards authenticated
 * requests via AiProxyService.
 */
@Module({
  controllers: [AiMentorController],
  providers: [AiProxyService],
  exports: [AiProxyService],
})
export class AiMentorModule {}

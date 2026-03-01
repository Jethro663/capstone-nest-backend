import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { AiMentorController } from './ai-mentor.controller';
import { AiMentorService } from './ai-mentor.service';
import { OllamaService } from './ollama.service';
import { ExtractionProcessor } from './extraction.processor';

/**
 * AI Mentor Module
 *
 * Provides:
 *  - Module extraction  (PDF → structured lesson content blocks via BullMQ)
 *  - Echo/chat endpoint (structural validation, evolves into AI Mentor Chat)
 *  - Ollama integration (local LLM) with rule-based fallback
 *  - AI interaction history logging
 *  - Content safety guardrails (multi-layer sanitization)
 *
 * Architecture position:
 *   User Management → LMS Core (Classes/Lessons) → File Upload → **AI Mentor** → Lesson Content Blocks
 *
 * To swap LLM providers, replace `OllamaService` with a different provider
 * implementing the same `generate()` + `isAvailable()` interface.
 */
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'module-extraction',
    }),
  ],
  controllers: [AiMentorController],
  providers: [AiMentorService, OllamaService, ExtractionProcessor],
  exports: [AiMentorService],
})
export class AiMentorModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AiMentorModule } from '../ai-mentor/ai-mentor.module';
import { JaController } from './ja.controller';
import { JaHubController } from './ja-hub.controller';
import { JaService } from './ja.service';

@Module({
  imports: [DatabaseModule, AuditModule, AiMentorModule],
  controllers: [JaController, JaHubController],
  providers: [JaService],
  exports: [JaService],
})
export class JaModule {}

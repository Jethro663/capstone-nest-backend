import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { RagIndexingService } from './rag-indexing.service';
import { RagIndexingProcessor } from './processors/rag-indexing.processor';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'rag-indexing',
    }),
  ],
  providers: [RagIndexingService, RagIndexingProcessor],
  exports: [RagIndexingService],
})
export class RagModule {}

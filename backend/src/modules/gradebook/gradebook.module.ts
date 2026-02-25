import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { GradebookController } from './gradebook.controller';
import { GradebookService } from './gradebook.service';
import { GradebookComputationService } from './gradebook-computation.service';
import { GradebookSyncService } from './gradebook-sync.service';
import { AdviserSectionGuard } from './guards/adviser-section.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [GradebookController],
  providers: [
    GradebookService,
    GradebookComputationService,
    GradebookSyncService,
    AdviserSectionGuard,
  ],
  exports: [GradebookService],
})
export class GradebookModule {}

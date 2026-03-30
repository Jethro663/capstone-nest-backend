import { Module } from '@nestjs/common';
import { SectionsController, SectionsPublicController } from './sections.controller';
import { SectionsService } from './sections.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SectionsController, SectionsPublicController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}

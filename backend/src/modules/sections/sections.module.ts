import { Module } from '@nestjs/common';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SectionsController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}

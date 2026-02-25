import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RosterImportController } from './roster-import.controller';
import { RosterImportService } from './roster-import.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RosterImportController],
  providers: [RosterImportService],
  exports: [RosterImportService],
})
export class RosterImportModule {}

import { AcademicPolicyModule } from '../academic-state/academic-policy.module';
import { AuditModule } from '../audit/audit.module';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RosterImportController } from './roster-import.controller';
import { RosterImportService } from './roster-import.service';

@Module({
  imports: [DatabaseModule, AcademicPolicyModule, AuditModule],
  controllers: [RosterImportController],
  providers: [RosterImportService],
  exports: [RosterImportService],
})
export class RosterImportModule {}

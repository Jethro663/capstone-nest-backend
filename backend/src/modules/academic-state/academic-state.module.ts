import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AcademicStateController } from './academic-state.controller';
import { AcademicStateService } from './academic-state.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [AcademicStateController],
  providers: [AcademicStateService],
  exports: [AcademicStateService],
})
export class AcademicStateModule {}

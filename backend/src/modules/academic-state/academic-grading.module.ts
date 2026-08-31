import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AcademicPolicyModule } from './academic-policy.module';
import { AnnualGradesService } from './annual-grades.service';
import { AcademicGradingController } from './academic-grading.controller';

@Module({
  imports: [DatabaseModule, AuditModule, AcademicPolicyModule],
  providers: [AnnualGradesService],
  controllers: [AcademicGradingController],
  exports: [AnnualGradesService],
})
export class AcademicGradingModule {}

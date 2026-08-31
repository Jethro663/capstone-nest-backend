import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AcademicPolicyModule } from './academic-policy.module';
import { AcademicTransitionReadinessService } from './academic-transition-readiness.service';

@Module({
  imports: [DatabaseModule, AcademicPolicyModule],
  providers: [AcademicTransitionReadinessService],
  exports: [AcademicTransitionReadinessService],
})
export class AcademicReadinessModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AcademicPolicyService } from './academic-policy.service';

@Module({
  imports: [DatabaseModule],
  providers: [AcademicPolicyService],
  exports: [AcademicPolicyService],
})
export class AcademicPolicyModule {}

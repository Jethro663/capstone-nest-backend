import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AcademicPolicyService } from './academic-policy.service';
import { AnnualTransmutationPolicyService } from './annual-transmutation-policy.service';

@Module({
  imports: [DatabaseModule],
  providers: [AcademicPolicyService, AnnualTransmutationPolicyService],
  exports: [AcademicPolicyService, AnnualTransmutationPolicyService],
})
export class AcademicPolicyModule {}

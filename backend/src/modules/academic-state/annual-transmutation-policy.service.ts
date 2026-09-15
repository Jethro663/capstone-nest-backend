import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  transmutationTables,
} from '../../drizzle/schema';
import type {
  AcademicPolicy,
  AnnualGradePolicySnapshot,
} from './academic-policy';
import {
  DEFAULT_DEPED_TRANSMUTATION_BANDS,
  SYSTEM_DEFAULT_TRANSMUTATION_TITLE,
  withAnnualTransmutation,
} from './annual-transmutation';

@Injectable()
export class AnnualTransmutationPolicyService {
  constructor(private readonly databaseService: DatabaseService) {}

  async snapshotForPolicy(
    policy: AcademicPolicy,
  ): Promise<AnnualGradePolicySnapshot> {
    const current =
      await this.databaseService.db.query.academicSystemStates.findFirst({
        orderBy: [desc(academicSystemStates.updatedAt)],
      });
    if (!current || current.schoolYear !== policy.schoolYear) return policy;

    const active =
      await this.databaseService.db.query.transmutationTables.findFirst({
        where: eq(transmutationTables.isActive, true),
        orderBy: [desc(transmutationTables.updatedAt)],
      });
    return withAnnualTransmutation(
      policy,
      active?.bands?.length
        ? active
        : {
            id: 'system-default',
            title: SYSTEM_DEFAULT_TRANSMUTATION_TITLE,
            updatedAt: new Date(0),
            bands: DEFAULT_DEPED_TRANSMUTATION_BANDS,
          },
    );
  }
}

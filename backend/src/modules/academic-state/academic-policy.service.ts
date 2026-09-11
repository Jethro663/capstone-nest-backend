import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  academicYearPolicies,
  classes,
  transmutationTables,
} from '../../drizzle/schema';
import { getDefaultAcademicPolicy } from './academic-policy';
import type { AcademicPolicy } from './academic-policy';
import { AdminDemoModeService } from '../admin-demo-mode/admin-demo-mode.service';
import type { AdminDemoModeRelaxedRuleCode } from '../admin-demo-mode/admin-demo-mode.policy';

export const ACADEMIC_STATE_ID = '00000000-0000-0000-0000-000000000001';
export type AssessmentAcademicAction =
  | 'prepare'
  | 'view'
  | 'release'
  | 'start'
  | 'complete'
  | 'grade';

export type AcademicPolicyActor = {
  userId: string;
  roles: string[];
};

@Injectable()
export class AcademicPolicyService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly adminDemoModeService?: AdminDemoModeService,
  ) {}
  private get db() {
    return this.databaseService.db;
  }

  async forYear(schoolYear: string): Promise<AcademicPolicy> {
    let policy: AcademicPolicy;
    try {
      policy = getDefaultAcademicPolicy(schoolYear);
    } catch {
      throw new BadRequestException(
        'Invalid school year; use consecutive YYYY-YYYY',
      );
    }
    const existing = await this.db.query.academicYearPolicies.findFirst({
      where: eq(academicYearPolicies.schoolYear, schoolYear),
    });
    if (existing) return existing.policy;
    if (policy.gradeMethod === 'legacy_transmutation') {
      const active = await this.db.query.transmutationTables.findFirst({
        where: eq(transmutationTables.isActive, true),
        orderBy: [desc(transmutationTables.updatedAt)],
      });
      if (active?.bands.length)
        policy.transmutationBands = active.bands.map((band) => ({
          minInitialGrade: band.minInitialGrade,
          transmutedGrade: band.transmutedGrade,
        }));
    }
    const [inserted] = await this.db
      .insert(academicYearPolicies)
      .values({ schoolYear, policyId: policy.id, policy })
      .onConflictDoNothing()
      .returning();
    if (inserted) return inserted.policy;
    const winner = await this.db.query.academicYearPolicies.findFirst({
      where: eq(academicYearPolicies.schoolYear, schoolYear),
    });
    if (!winner)
      throw new ConflictException(
        'School-year policy could not be initialized',
      );
    return winner.policy;
  }

  async forClass(classId: string) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      with: { section: true },
    });
    if (!cls) throw new NotFoundException('Class not found');
    const policy = await this.forYear(cls.schoolYear);
    return { cls, policy };
  }

  async currentState() {
    let state = await this.db.query.academicSystemStates.findFirst({
      orderBy: [desc(academicSystemStates.updatedAt)],
    });
    if (!state) {
      const now = new Date();
      const start =
        now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
      const [created] = await this.db
        .insert(academicSystemStates)
        .values({
          id: ACADEMIC_STATE_ID,
          schoolYear: `${start}-${start + 1}`,
          quarter: 'Q1',
        })
        .onConflictDoNothing()
        .returning();
      state =
        created ??
        (await this.db.query.academicSystemStates.findFirst({
          orderBy: [desc(academicSystemStates.updatedAt)],
        }));
    }
    if (!state)
      throw new ConflictException('Academic state could not be initialized');
    const policy = await this.forYear(state.schoolYear);
    return { ...state, policy, periods: policy.periods };
  }

  async assertAssessmentAction(
    assessment: { classId: string; quarter?: string | null },
    action: AssessmentAcademicAction,
    existingAttempt = false,
    actor?: AcademicPolicyActor,
  ) {
    const { cls, policy } = await this.forClass(assessment.classId);
    const current = await this.currentState();
    const period = policy.periods.find((p) => p.key === assessment.quarter);
    if (!period)
      throw new ConflictException({
        code: 'invalid_academic_period',
        message: 'Assessment period is not part of its school year policy',
        periods: policy.periods,
      });
    const sameYear = cls.schoolYear === current.schoolYear && cls.isActive;
    const samePeriod = assessment.quarter === current.quarter;
    const future =
      Number(cls.schoolYear.slice(0, 4)) >
        Number(current.schoolYear.slice(0, 4)) ||
      (sameYear &&
        policy.periods.findIndex((p) => p.key === period.key) >
          policy.periods.findIndex((p) => p.key === current.quarter));
    const demo = this.adminDemoModeService
      ? await this.adminDemoModeService.resolveForActor(
          actor?.userId,
          actor?.roles,
        )
      : {
          allows: () => false,
          audit: () => undefined,
        };
    const canRelaxAcademicWindow = Boolean(
      actor?.roles.includes('admin') &&
      (action === 'prepare' || action === 'release' || action === 'grade') &&
      demo.allows('admin_academic_window'),
    );
    const bypassedRules: AdminDemoModeRelaxedRuleCode[] = [];
    const bypassAcademicWindow = () => {
      if (!bypassedRules.includes('admin_academic_window')) {
        bypassedRules.push('admin_academic_window');
      }
    };
    if (action === 'prepare') {
      if (
        !cls.isActive ||
        Number(cls.schoolYear.slice(0, 4)) <
          Number(current.schoolYear.slice(0, 4))
      ) {
        if (!canRelaxAcademicWindow) {
          throw new ConflictException(
            'Cannot edit assessments in a closed school year',
          );
        }
        bypassAcademicWindow();
      }
    } else if (action === 'view') {
      if (future && !existingAttempt)
        throw new ConflictException(
          'Future-period assessments are not available to students',
        );
    } else {
      if (!sameYear) {
        if (!canRelaxAcademicWindow) {
          throw new ConflictException(
            'This school year is not active for assessment work',
          );
        }
        bypassAcademicWindow();
      }
      if (action === 'complete' && existingAttempt)
        return {
          cls,
          policy,
          current,
          period,
          demoMode: demo.audit(bypassedRules),
        };
      if (action === 'grade') {
        if (future) {
          if (!canRelaxAcademicWindow) {
            throw new ConflictException(
              'Future-period assessments cannot receive grades',
            );
          }
          bypassAcademicWindow();
        }
      } else if (!samePeriod) {
        if (!canRelaxAcademicWindow) {
          throw new ConflictException({
            code: 'inactive_academic_period',
            message: 'New student work and release require the active period',
            activeQuarter: current.quarter,
            schoolYear: current.schoolYear,
          });
        }
        bypassAcademicWindow();
      }
    }
    return {
      cls,
      policy,
      current,
      period,
      demoMode: demo.audit(bypassedRules),
    };
  }
}

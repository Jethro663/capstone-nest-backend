import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  auditLogs,
  classRecords,
  classes,
  users,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { AcademicPolicyService } from './academic-policy.service';
import { ActivateAcademicPeriodDto } from './DTO/activate-academic-period.dto';
import type { AcademicPolicy, PeriodKey } from './academic-policy';
import { captureObservedPeriodParticipants } from './academic-roster-observation';

export interface ActivationResult {
  schoolYear: string;
  quarter: PeriodKey;
  version: number;
  updatedAt: Date | string;
  updatedBy: string | null;
  policy: AcademicPolicy;
  periods: AcademicPolicy['periods'];
  replayed: boolean;
}

@Injectable()
export class AcademicPeriodService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly policyService: AcademicPolicyService,
    private readonly auditService: AuditService,
  ) {}
  private get db() {
    return this.databaseService.db;
  }

  async preview(targetQuarter: PeriodKey) {
    return this.databaseService.academicTransaction(async () => {
      const state = await this.policyService.currentState();
      const targetIndex = state.policy.periods.findIndex(
        (p) => p.key === targetQuarter,
      );
      if (targetIndex < 0)
        throw new BadRequestException(
          'Target period is outside the school-year policy',
        );
      const activeClasses = await this.db.query.classes.findMany({
        where: and(
          eq(classes.schoolYear, state.schoolYear),
          eq(classes.isActive, true),
        ),
        columns: { id: true, subjectName: true, teacherId: true },
      });
      const ids = activeClasses.map((c) => c.id);
      const records = ids.length
        ? await this.db.query.classRecords.findMany({
            where: inArray(classRecords.classId, ids),
            columns: { classId: true, gradingPeriod: true, status: true },
          })
        : [];
      const ongoing = await this.db.execute<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM assessment_attempts t JOIN assessments a ON a.id=t.assessment_id JOIN classes c ON c.id=a.class_id WHERE c.school_year=${state.schoolYear} AND c.is_active=true AND t.is_submitted=false`,
      );
      const currentIndex = state.policy.periods.findIndex(
        (p) => p.key === state.quarter,
      );
      const details = activeClasses.map((cls) => ({
        classId: cls.id,
        subjectName: cls.subjectName,
        teacherId: cls.teacherId,
        currentStatus:
          records.find(
            (r) => r.classId === cls.id && r.gradingPeriod === state.quarter,
          )?.status ?? 'missing',
        targetStatus:
          records.find(
            (r) => r.classId === cls.id && r.gradingPeriod === targetQuarter,
          )?.status ?? 'missing',
      }));
      return {
        state,
        target: state.policy.periods[targetIndex],
        overrideRequired:
          targetQuarter !== state.quarter &&
          (currentIndex < 0 || targetIndex !== currentIndex + 1),
        alreadyActive: targetQuarter === state.quarter,
        currentOpenRecords: details.filter(
          (d) => d.currentStatus === 'draft' || d.currentStatus === 'missing',
        ).length,
        targetMissingRecords: details.filter(
          (d) => d.targetStatus === 'missing',
        ).length,
        ongoingAttempts: Number(ongoing.rows[0]?.count ?? 0),
        details,
        message:
          'Activation changes release eligibility only. Past draft records remain gradable, and already-started attempts can complete. No record is automatically finalized or reopened.',
      };
    });
  }

  async activate(
    dto: ActivateAcademicPeriodDto,
    actorId: string,
    roles: string[],
  ): Promise<ActivationResult> {
    if (!roles.includes('admin'))
      throw new ForbiddenException(
        'Only admins can activate an academic period',
      );
    const actor = await this.db.query.users.findFirst({
      where: eq(users.id, actorId),
      columns: { password: true },
    });
    if (!actor || !(await bcrypt.compare(dto.currentPassword, actor.password)))
      throw new ForbiddenException(
        'Step-up authentication failed: password did not match',
      );
    // Password verification is outside the academic lock; state and idempotency decisions are inside it.
    return this.databaseService.academicTransaction(async () => {
      const request = {
        expectedSchoolYear: dto.expectedSchoolYear,
        expectedQuarter: dto.expectedQuarter,
        expectedVersion: dto.expectedVersion,
        targetQuarter: dto.targetQuarter,
        override: Boolean(dto.override),
        reason: dto.reason?.trim() || null,
      };
      const requestHash = createHash('sha256')
        .update(JSON.stringify(request))
        .digest('hex');
      const previous = await this.db.query.auditLogs.findFirst({
        where: and(
          eq(auditLogs.action, 'academic.period.activated'),
          eq(auditLogs.actorId, actorId),
          sql`${auditLogs.metadata}->>'requestId' = ${dto.requestId}`,
        ),
      });
      if (previous) {
        const metadata = previous.metadata as {
          requestHash: string;
          result: ActivationResult;
        };
        if (metadata.requestHash !== requestHash)
          throw new ConflictException(
            'The request ID was already used for a different activation',
          );
        return { ...metadata.result, replayed: true };
      }
      const state = await this.policyService.currentState();
      const states = await this.db.query.academicSystemStates.findMany({
        columns: { id: true },
        limit: 2,
      });
      if (states.length > 1)
        throw new ConflictException(
          'Multiple academic state rows require administrative repair before activation',
        );
      if (
        state.schoolYear !== dto.expectedSchoolYear ||
        state.quarter !== dto.expectedQuarter ||
        state.version !== dto.expectedVersion
      )
        throw new ConflictException(
          'Academic state changed; refresh it before activating another period',
        );
      const targetIndex = state.policy.periods.findIndex(
        (p) => p.key === dto.targetQuarter,
      );
      const currentIndex = state.policy.periods.findIndex(
        (p) => p.key === state.quarter,
      );
      if (targetIndex < 0)
        throw new BadRequestException(
          'Target period is not part of this school year policy',
        );
      if (dto.targetQuarter === state.quarter)
        return { ...state, replayed: true };
      if (currentIndex < 0 || targetIndex !== currentIndex + 1) {
        if (!dto.override || !dto.reason?.trim())
          throw new BadRequestException(
            'A backward, skipped, or invalid-period correction requires an explicit override and reason',
          );
      }
      if (dto.override && !dto.reason?.trim())
        throw new BadRequestException('An override reason is required');
      const [updated] = await this.db
        .update(academicSystemStates)
        .set({
          quarter: dto.targetQuarter,
          version: state.version + 1,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(academicSystemStates.id, state.id),
            eq(academicSystemStates.version, state.version),
          ),
        )
        .returning();
      if (!updated)
        throw new ConflictException('Academic state changed during activation');
      const rosterObservation = await captureObservedPeriodParticipants(
        this.db,
        {
          schoolYear: state.schoolYear,
          period: dto.targetQuarter,
          actorId,
          source: 'period_activation',
        },
      );
      const result: ActivationResult = {
        ...updated,
        policy: state.policy,
        periods: state.policy.periods,
        replayed: false,
      };
      await this.auditService.log({
        actorId,
        action: 'academic.period.activated',
        targetType: 'academic_state',
        targetId: state.id,
        metadata: {
          requestId: dto.requestId,
          requestHash,
          ...request,
          result,
          rosterObservation,
          previous: {
            schoolYear: state.schoolYear,
            quarter: state.quarter,
            version: state.version,
          },
        },
      });
      return result;
    });
  }
}

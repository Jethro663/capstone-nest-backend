import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  classRecords,
  classes,
  schoolEvents,
  users,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { TransitionAcademicStateDto } from './DTO/transition-academic-state.dto';

type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface AcademicStateRow {
  id: string;
  schoolYear: string;
  quarter: QuarterKey;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AcademicStateService {
  static readonly TRANSITION_CONFIRMATION_TEXT =
    'CONFIRM ACADEMIC STATE TRANSITION';

  private readonly singletonStateId = '00000000-0000-0000-0000-000000000001';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private getDefaultSchoolYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const schoolYearStart = now.getMonth() >= 5 ? currentYear : currentYear - 1;
    return `${schoolYearStart}-${schoolYearStart + 1}`;
  }

  private assertValidSchoolYear(schoolYear: string) {
    const match = schoolYear.match(/^(\d{4})-(\d{4})$/);
    if (!match) {
      throw new BadRequestException(
        'schoolYear must follow YYYY-YYYY format',
      );
    }

    if (Number(match[2]) !== Number(match[1]) + 1) {
      throw new BadRequestException(
        'schoolYear must represent consecutive years (e.g. 2025-2026)',
      );
    }
  }

  private async verifyAdminPassword(userId: string, password: string) {
    const actor = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        password: true,
      },
    });

    if (!actor) {
      throw new ForbiddenException('Unable to validate step-up credentials');
    }

    const passwordMatches = await bcrypt.compare(password, actor.password);
    if (!passwordMatches) {
      throw new ForbiddenException(
        'Step-up authentication failed: password did not match',
      );
    }
  }

  private async ensureCurrentState(): Promise<AcademicStateRow> {
    const existing = await this.db.query.academicSystemStates.findFirst({
      orderBy: [desc(academicSystemStates.updatedAt)],
    });

    if (existing) {
      return existing as AcademicStateRow;
    }

    const [created] = await this.db
      .insert(academicSystemStates)
      .values({
        id: this.singletonStateId,
        schoolYear: this.getDefaultSchoolYear(),
        quarter: 'Q1',
        updatedBy: null,
      })
      .returning();

    return created as AcademicStateRow;
  }

  private async getTransitionTargets(
    fromState: AcademicStateRow,
    toState: { schoolYear: string; quarter: QuarterKey },
  ) {
    const noTransition =
      fromState.schoolYear === toState.schoolYear &&
      fromState.quarter === toState.quarter;
    if (noTransition) {
      return {
        classRecordIdsToFinalize: [] as string[],
        schoolEventIdsToArchive: [] as string[],
      };
    }

    const draftRecords = await this.db
      .select({ id: classRecords.id })
      .from(classRecords)
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(
        and(
          eq(classRecords.status, 'draft'),
          eq(classRecords.gradingPeriod, fromState.quarter),
          eq(classes.schoolYear, fromState.schoolYear),
        ),
      );

    const classRecordIdsToFinalize = draftRecords.map((record) => record.id);

    const schoolEventIdsToArchive =
      fromState.schoolYear === toState.schoolYear
        ? []
        : (
            await this.db
              .select({ id: schoolEvents.id })
              .from(schoolEvents)
              .where(
                and(
                  isNull(schoolEvents.archivedAt),
                  ne(schoolEvents.schoolYear, toState.schoolYear),
                ),
              )
          ).map((event) => event.id);

    return {
      classRecordIdsToFinalize,
      schoolEventIdsToArchive,
    };
  }

  async getCurrentState() {
    const state = await this.ensureCurrentState();
    return {
      schoolYear: state.schoolYear,
      quarter: state.quarter,
      updatedAt: state.updatedAt,
      updatedBy: state.updatedBy,
      transitionConfirmationText:
        AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
    };
  }

  async getImpactPreview(schoolYear: string, quarter: QuarterKey) {
    this.assertValidSchoolYear(schoolYear);
    const current = await this.ensureCurrentState();
    const target = {
      schoolYear,
      quarter,
    };
    const impact = await this.getTransitionTargets(current, target);

    return {
      current: {
        schoolYear: current.schoolYear,
        quarter: current.quarter,
      },
      target,
      impact: {
        classRecordsToFinalize: impact.classRecordIdsToFinalize.length,
        schoolEventsToArchive: impact.schoolEventIdsToArchive.length,
      },
      transitionConfirmationText:
        AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
    };
  }

  async transition(dto: TransitionAcademicStateDto, actorId: string) {
    this.assertValidSchoolYear(dto.schoolYear);

    if (
      dto.confirmationText !== AcademicStateService.TRANSITION_CONFIRMATION_TEXT
    ) {
      throw new BadRequestException(
        'confirmationText does not match the required transition phrase',
      );
    }

    await this.verifyAdminPassword(actorId, dto.currentPassword);

    const current = await this.ensureCurrentState();
    const target = {
      schoolYear: dto.schoolYear,
      quarter: dto.quarter,
    };
    const impactTargets = await this.getTransitionTargets(current, target);
    const now = new Date();

    await this.db.transaction(async (tx) => {
      if (impactTargets.classRecordIdsToFinalize.length > 0) {
        await tx
          .update(classRecords)
          .set({
            status: 'finalized',
            updatedAt: now,
          })
          .where(inArray(classRecords.id, impactTargets.classRecordIdsToFinalize));
      }

      if (impactTargets.schoolEventIdsToArchive.length > 0) {
        await tx
          .update(schoolEvents)
          .set({
            archivedAt: now,
            updatedAt: now,
          })
          .where(inArray(schoolEvents.id, impactTargets.schoolEventIdsToArchive));
      }

      await tx
        .insert(academicSystemStates)
        .values({
          id: this.singletonStateId,
          schoolYear: target.schoolYear,
          quarter: target.quarter,
          updatedBy: actorId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: academicSystemStates.id,
          set: {
            schoolYear: target.schoolYear,
            quarter: target.quarter,
            updatedBy: actorId,
            updatedAt: now,
          },
        });
    });

    await this.auditService.log({
      actorId,
      action: 'academic_state.transitioned',
      targetType: 'academic_state',
      targetId: this.singletonStateId,
      metadata: {
        fromSchoolYear: current.schoolYear,
        fromQuarter: current.quarter,
        toSchoolYear: target.schoolYear,
        toQuarter: target.quarter,
        classRecordsFinalized: impactTargets.classRecordIdsToFinalize.length,
        schoolEventsArchived: impactTargets.schoolEventIdsToArchive.length,
      },
    });

    return {
      state: await this.getCurrentState(),
      impact: {
        classRecordsFinalized: impactTargets.classRecordIdsToFinalize.length,
        schoolEventsArchived: impactTargets.schoolEventIdsToArchive.length,
      },
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  classes,
  enrollments,
  sections,
} from '../../drizzle/schema';
import type { PreviewSectionLifecycleDto } from './DTO/admin-lifecycle.dto';
import { buildAdminLifecycleManifest } from './admin-lifecycle.manifest';
import type {
  AdminLifecycleBlocker,
  AdminLifecycleEffect,
  AdminLifecycleManifest,
  AdminLifecycleWarning,
} from './admin-lifecycle.types';
import {
  StudentLifecycleService,
  type LifecycleClass,
  type LifecycleExecutionContext,
  type LifecycleSection,
  type StudentLifecyclePrepared,
} from './student-lifecycle.service';

type LifecycleDb = DatabaseService['db'];

interface LearnerPlanSummary {
  blockers: AdminLifecycleBlocker[];
  warnings: AdminLifecycleWarning[];
  effects: AdminLifecycleEffect[];
  preserved: string[];
  requiredConfirmations: string[];
  affectedUserIds: string[];
}

export interface SectionLifecycleSnapshot {
  academicState: {
    schoolYear: string;
    period: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    version: number;
  };
  section: LifecycleSection;
  linkedClasses: LifecycleClass[];
  activeStudentIds: string[];
  learnerPlans: Record<string, LearnerPlanSummary>;
  destinationCapacity?: Record<
    string,
    { currentStudents: number; capacity: number }
  >;
  evidence: { enrollments: number; linkedClasses: number };
}

export interface SectionLifecyclePlan extends LearnerPlanSummary {
  resolvedStudentIds: string[];
}

export interface SectionLifecyclePrepared {
  snapshot: SectionLifecycleSnapshot;
  plan: SectionLifecyclePlan;
  learnerPrepared: Record<string, StudentLifecyclePrepared>;
  manifest: AdminLifecycleManifest;
}

function sectionBlocker(code: string, message: string): AdminLifecycleBlocker {
  return { code, message, resolvable: false };
}

export function planSectionLifecycle(
  snapshot: SectionLifecycleSnapshot,
  dto: PreviewSectionLifecycleDto,
): SectionLifecyclePlan {
  const blockers: AdminLifecycleBlocker[] = [];
  const warnings: AdminLifecycleWarning[] = [];
  const effects: AdminLifecycleEffect[] = [];
  const preserved: string[] = [];
  const confirmations = new Set<string>(['PRESERVE_ACADEMIC_HISTORY']);
  const affectedUserIds = new Set<string>();
  const outcomeByStudent = new Map(
    dto.studentResolutions.map((entry) => [entry.studentId, entry]),
  );

  if (!snapshot.section.isActive) {
    blockers.push(
      sectionBlocker(
        'SECTION_ALREADY_ARCHIVED',
        'Section is already archived.',
      ),
    );
  }
  if (snapshot.section.schoolYear !== snapshot.academicState.schoolYear) {
    blockers.push(
      sectionBlocker(
        'SECTION_NOT_IN_ACTIVE_YEAR',
        'Historical sections must be handled through academic repair.',
      ),
    );
  }
  if (dto.effectivePeriod !== snapshot.academicState.period) {
    blockers.push(
      sectionBlocker(
        'EFFECTIVE_PERIOD_NOT_CURRENT',
        `Section closure must use the active period ${snapshot.academicState.period}.`,
      ),
    );
  }
  if (outcomeByStudent.size !== dto.studentResolutions.length) {
    blockers.push(
      sectionBlocker(
        'DUPLICATE_LEARNER_OUTCOME',
        'Each learner must have exactly one closure outcome.',
      ),
    );
  }

  const unresolved = snapshot.activeStudentIds.filter(
    (studentId) => !outcomeByStudent.has(studentId),
  );
  if (unresolved.length) {
    blockers.push({
      code: 'UNRESOLVED_SECTION_LEARNERS',
      message: `${unresolved.length} active learner(s) do not have a closure outcome.`,
      resolvable: true,
      resolutionOptions: [
        'WITHDRAW',
        'TRANSFER_SECTION',
        'USE_ACADEMIC_TRANSITION',
      ],
    });
  }

  const nonMembers = dto.studentResolutions.filter(
    (entry) => !snapshot.activeStudentIds.includes(entry.studentId),
  );
  if (nonMembers.length) {
    blockers.push(
      sectionBlocker(
        'OUTCOME_FOR_NON_MEMBER',
        `${nonMembers.length} supplied learner outcome(s) no longer belong to the section.`,
      ),
    );
  }

  const transfersByDestination = new Map<string, number>();
  for (const outcome of dto.studentResolutions) {
    if (
      outcome.resolution !== 'TRANSFER_SECTION' ||
      !outcome.destinationSectionId
    ) {
      continue;
    }
    transfersByDestination.set(
      outcome.destinationSectionId,
      (transfersByDestination.get(outcome.destinationSectionId) ?? 0) + 1,
    );
  }
  for (const [destinationId, transferCount] of transfersByDestination) {
    const destination = snapshot.destinationCapacity?.[destinationId];
    if (
      destination &&
      destination.currentStudents + transferCount > destination.capacity
    ) {
      blockers.push(
        sectionBlocker(
          'DESTINATION_GROUP_EXCEEDS_CAPACITY',
          `${transferCount} planned transfers would exceed the destination section capacity.`,
        ),
      );
    }
  }

  for (const studentId of snapshot.activeStudentIds) {
    const outcome = outcomeByStudent.get(studentId);
    if (!outcome) continue;
    affectedUserIds.add(studentId);
    confirmations.add(outcome.resolution);
    if (outcome.resolution === 'COMPLETE') {
      blockers.push(
        sectionBlocker(
          'USE_ACADEMIC_TRANSITION',
          'Normal year completion is governed by the academic transition workflow.',
        ),
      );
      continue;
    }
    const learnerPlan = snapshot.learnerPlans[studentId];
    if (!learnerPlan) {
      blockers.push(
        sectionBlocker(
          'LEARNER_PLAN_UNAVAILABLE',
          `Lifecycle evidence could not be prepared for learner ${studentId}.`,
        ),
      );
      continue;
    }
    blockers.push(...learnerPlan.blockers);
    warnings.push(...learnerPlan.warnings);
    effects.push(...learnerPlan.effects);
    preserved.push(...learnerPlan.preserved);
    learnerPlan.requiredConfirmations.forEach((value) =>
      confirmations.add(value),
    );
    learnerPlan.affectedUserIds.forEach((value) => affectedUserIds.add(value));
  }

  for (const linkedClass of snapshot.linkedClasses) {
    if (linkedClass.isActive) {
      effects.push({
        kind: 'archive',
        entityType: 'class',
        entityId: linkedClass.id,
        summary: `Archive linked ${linkedClass.subjectName} class`,
      });
    }
  }
  effects.push({
    kind: 'archive',
    entityType: 'section',
    entityId: snapshot.section.id,
    summary: 'Archive the section after every learner outcome succeeds',
  });
  preserved.push(
    'Section adviser, class teachers, and all historical academic evidence',
  );
  if (snapshot.section.adviserId)
    affectedUserIds.add(snapshot.section.adviserId);
  snapshot.linkedClasses.forEach((entry) => {
    if (entry.teacherId) affectedUserIds.add(entry.teacherId);
  });

  return {
    blockers,
    warnings,
    effects,
    preserved: [...new Set(preserved)],
    requiredConfirmations: [...confirmations],
    affectedUserIds: [...affectedUserIds],
    resolvedStudentIds: snapshot.activeStudentIds.filter((studentId) =>
      outcomeByStudent.has(studentId),
    ),
  };
}

@Injectable()
export class SectionLifecycleService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly studentLifecycleService: StudentLifecycleService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  async prepare(
    dto: PreviewSectionLifecycleDto,
    db: LifecycleDb = this.db,
  ): Promise<SectionLifecyclePrepared> {
    const state = await db.query.academicSystemStates.findFirst({
      orderBy: [desc(academicSystemStates.updatedAt)],
    });
    if (!state)
      throw new NotFoundException('Academic state is not initialized');
    const section = await db.query.sections.findFirst({
      where: eq(sections.id, dto.sectionId),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
        capacity: true,
        isActive: true,
        adviserId: true,
        updatedAt: true,
      },
    });
    if (!section) throw new NotFoundException('Section not found');
    const linkedClasses = await db.query.classes.findMany({
      where: eq(classes.sectionId, dto.sectionId),
      columns: {
        id: true,
        sectionId: true,
        subjectCode: true,
        subjectName: true,
        schoolYear: true,
        isActive: true,
        teacherId: true,
        updatedAt: true,
      },
    });
    const activeEnrollments = await db.query.enrollments.findMany({
      where: and(
        eq(enrollments.sectionId, dto.sectionId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { studentId: true },
    });
    const activeStudentIds = [
      ...new Set(activeEnrollments.map((entry) => entry.studentId)),
    ];
    const learnerPrepared: Record<string, StudentLifecyclePrepared> = {};
    const learnerPlans: Record<string, LearnerPlanSummary> = {};
    const destinationCapacity: NonNullable<
      SectionLifecycleSnapshot['destinationCapacity']
    > = {};

    for (const resolution of dto.studentResolutions) {
      if (!activeStudentIds.includes(resolution.studentId)) continue;
      if (resolution.resolution === 'COMPLETE') continue;
      const prepared = await this.studentLifecycleService.prepare(
        {
          studentId: resolution.studentId,
          sectionId: dto.sectionId,
          resolution:
            resolution.resolution === 'TRANSFER_SECTION'
              ? 'TRANSFER_SECTION'
              : 'WITHDRAW',
          destinationSectionId: resolution.destinationSectionId,
          effectivePeriod: dto.effectivePeriod,
        },
        db,
      );
      learnerPrepared[resolution.studentId] = prepared;
      learnerPlans[resolution.studentId] = prepared.plan;
      if (
        resolution.destinationSectionId &&
        prepared.snapshot.destinationSection
      ) {
        destinationCapacity[resolution.destinationSectionId] = {
          currentStudents: prepared.snapshot.destinationActiveStudentCount,
          capacity: prepared.snapshot.destinationSection.capacity ?? 0,
        };
      }
    }

    const snapshot: SectionLifecycleSnapshot = {
      academicState: {
        schoolYear: state.schoolYear,
        period: state.quarter,
        version: state.version,
      },
      section,
      linkedClasses,
      activeStudentIds,
      learnerPlans,
      destinationCapacity,
      evidence: {
        enrollments: activeEnrollments.length,
        linkedClasses: linkedClasses.length,
      },
    };
    const plan = planSectionLifecycle(snapshot, dto);
    const manifest = buildAdminLifecycleManifest({
      action: 'ARCHIVE_SECTION',
      targetType: 'section',
      targetId: dto.sectionId,
      request: { ...dto },
      academicState: snapshot.academicState,
      dependencyVersions: [
        {
          entityType: 'academic_state',
          entityId: state.id,
          version: state.version,
        },
        {
          entityType: 'section',
          entityId: section.id,
          version: section.updatedAt.toISOString(),
        },
        ...linkedClasses.map((entry) => ({
          entityType: 'class',
          entityId: entry.id,
          version: entry.updatedAt.toISOString(),
        })),
        ...Object.entries(learnerPrepared).map(([studentId, entry]) => ({
          entityType: 'learner_manifest',
          entityId: studentId,
          version: entry.manifest.manifestHash,
        })),
      ],
      effects: plan.effects,
      preserved: plan.preserved,
      evidence: snapshot.evidence,
      blockers: plan.blockers,
      warnings: plan.warnings,
      requiredConfirmations: plan.requiredConfirmations,
    });
    return { snapshot, plan, learnerPrepared, manifest };
  }

  async apply(
    dto: PreviewSectionLifecycleDto,
    prepared: SectionLifecyclePrepared,
    context: LifecycleExecutionContext,
  ) {
    const changed: Array<{
      entityType: string;
      entityId: string;
      outcome: string;
    }> = [];
    for (const resolution of dto.studentResolutions) {
      if (resolution.resolution === 'COMPLETE') continue;
      const child = prepared.learnerPrepared[resolution.studentId];
      if (!child) continue;
      const result = await this.studentLifecycleService.apply(
        {
          studentId: resolution.studentId,
          sectionId: dto.sectionId,
          resolution:
            resolution.resolution === 'TRANSFER_SECTION'
              ? 'TRANSFER_SECTION'
              : 'WITHDRAW',
          destinationSectionId: resolution.destinationSectionId,
          effectivePeriod: dto.effectivePeriod,
        },
        child,
        context,
      );
      changed.push(...result.changed);
    }
    const now = new Date();
    const activeClassIds = prepared.snapshot.linkedClasses
      .filter((entry) => entry.isActive)
      .map((entry) => entry.id);
    if (activeClassIds.length) {
      await this.db
        .update(classes)
        .set({ isActive: false, updatedAt: now })
        .where(eq(classes.sectionId, dto.sectionId));
      changed.push(
        ...activeClassIds.map((entityId) => ({
          entityType: 'class',
          entityId,
          outcome: 'archived',
        })),
      );
    }
    await this.db
      .update(sections)
      .set({
        isActive: false,
        isArchived: true,
        archivedAt: now,
        updatedAt: now,
      })
      .where(eq(sections.id, dto.sectionId));
    changed.push({
      entityType: 'section',
      entityId: dto.sectionId,
      outcome: 'archived',
    });
    return {
      changed,
      preserved: prepared.plan.preserved,
      affectedUserIds: prepared.plan.affectedUserIds,
    };
  }
}

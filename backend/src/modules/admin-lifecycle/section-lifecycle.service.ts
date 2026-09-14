import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  classes,
  enrollmentLifecycleEvents,
  enrollments,
  sections,
  users,
  type EnrollmentLifecycleOutcome,
} from '../../drizzle/schema';
import type { PreviewSectionLifecycleDto } from './DTO/admin-lifecycle.dto';
import { buildAdminLifecycleManifest } from './admin-lifecycle.manifest';
import type {
  AdminLifecycleBlocker,
  AdminLifecycleEffect,
  AdminLifecycleManifest,
  AdminLifecycleWarning,
  AdminArchiveNotificationRetirement,
} from './admin-lifecycle.types';
import {
  StudentLifecycleService,
  type LifecycleClass,
  type LifecycleEnrollment,
  type LifecycleExecutionContext,
  type LifecyclePerson,
  type LifecycleSection,
  type StudentLifecyclePrepared,
  type StudentLifecyclePlanningOptions,
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
  activeEnrollments: LifecycleEnrollment[];
  activeStudentIds: string[];
  students: LifecyclePerson[];
  learnerPlans: Record<string, LearnerPlanSummary>;
  destinationCapacity?: Record<
    string,
    { currentStudents: number; capacity: number }
  >;
  evidence: { enrollments: number; linkedClasses: number };
}

export interface SectionLifecyclePlan extends LearnerPlanSummary {
  resolvedStudentIds: string[];
  notificationUserIds: string[];
  notificationRetirement: AdminArchiveNotificationRetirement;
}

export interface SectionLifecyclePrepared {
  snapshot: SectionLifecycleSnapshot;
  plan: SectionLifecyclePlan;
  learnerPrepared: Record<string, StudentLifecyclePrepared>;
  manifest: AdminLifecycleManifest;
}

export type SectionLifecyclePlanningOptions = StudentLifecyclePlanningOptions;

function sectionBlocker(code: string, message: string): AdminLifecycleBlocker {
  return { code, message, resolvable: false };
}

export function planSectionLifecycle(
  snapshot: SectionLifecycleSnapshot,
  dto: PreviewSectionLifecycleDto,
  options: SectionLifecyclePlanningOptions = {},
): SectionLifecyclePlan {
  const blockers: AdminLifecycleBlocker[] = [];
  const warnings: AdminLifecycleWarning[] = [];
  const effects: AdminLifecycleEffect[] = [];
  const preserved: string[] = [];
  const confirmations = new Set<string>(['PRESERVE_ACADEMIC_HISTORY']);
  const affectedUserIds = new Set<string>();
  const staffRetirementUserIds = new Set<string>();
  const historicalRetirement = dto.lifecycleMode === 'HISTORICAL_RETIREMENT';
  const studentResolutions = dto.studentResolutions ?? [];
  const outcomeByStudent = new Map(
    studentResolutions.map((entry) => [entry.studentId, entry]),
  );
  if (historicalRetirement) confirmations.add('HISTORICAL_RETIREMENT');

  if (!snapshot.section.isActive) {
    blockers.push(
      sectionBlocker(
        'SECTION_ALREADY_ARCHIVED',
        'Section is already archived.',
      ),
    );
  }
  if (historicalRetirement) {
    if (snapshot.section.schoolYear === snapshot.academicState.schoolYear) {
      blockers.push(
        sectionBlocker(
          'HISTORICAL_MODE_NOT_APPLICABLE',
          'This section belongs to the active school year. Use the current section closure workflow.',
        ),
      );
    }
    if (snapshot.activeStudentIds.length > 0 && !dto.effectivePeriod) {
      blockers.push({
        code: 'HISTORICAL_EFFECTIVE_PERIOD_REQUIRED',
        message:
          'Choose the historical grading period for these learner outcomes.',
        resolvable: true,
      });
    }
  } else {
    if (snapshot.section.schoolYear !== snapshot.academicState.schoolYear) {
      blockers.push(
        sectionBlocker(
          'SECTION_NOT_IN_ACTIVE_YEAR',
          'This is a historical section. Start historical retirement from the section workspace.',
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
  }
  if (outcomeByStudent.size !== studentResolutions.length) {
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
      resolutionOptions: historicalRetirement
        ? ['WITHDRAW', 'TRANSFER_SECTION', 'COMPLETE']
        : ['WITHDRAW', 'TRANSFER_SECTION', 'USE_ACADEMIC_TRANSITION'],
    });
  }

  const nonMembers = studentResolutions.filter(
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
  for (const outcome of studentResolutions) {
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
      if (options.allowSectionCapacityOverride) {
        warnings.push({
          code: 'SECTION_CAPACITY',
          message: `${transferCount} planned transfers exceed destination capacity. Maintenance Access permits this reviewed over-capacity move.`,
        });
        confirmations.add('ACKNOWLEDGE_SECTION_CAPACITY');
      } else {
        blockers.push({
          code: 'DESTINATION_GROUP_EXCEEDS_CAPACITY',
          message: `${transferCount} planned transfers would exceed destination capacity. Turn on Maintenance Access to review the move.`,
          resolvable: true,
          resolutionOptions: ['OPEN_MAINTENANCE_ACCESS'],
        });
      }
    }
  }

  for (const studentId of snapshot.activeStudentIds) {
    const outcome = outcomeByStudent.get(studentId);
    if (!outcome) continue;
    affectedUserIds.add(studentId);
    confirmations.add(outcome.resolution);
    if (outcome.resolution === 'COMPLETE') {
      if (!historicalRetirement) {
        blockers.push(
          sectionBlocker(
            'USE_ACADEMIC_TRANSITION',
            'Normal year completion is governed by the academic transition workflow.',
          ),
        );
        continue;
      }
      snapshot.activeEnrollments
        .filter((entry) => entry.studentId === studentId)
        .forEach((entry) => {
          effects.push({
            kind: 'update',
            entityType: 'enrollment',
            entityId: entry.id,
            summary: 'Complete historical membership',
          });
          effects.push({
            kind: 'insert',
            entityType: 'enrollment_lifecycle_event',
            entityId: entry.id,
            summary: 'Append the reviewed historical completion event',
          });
        });
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
    learnerPlan.affectedUserIds.forEach((value) => {
      affectedUserIds.add(value);
      staffRetirementUserIds.add(value);
    });
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
  if (snapshot.section.adviserId) {
    affectedUserIds.add(snapshot.section.adviserId);
    staffRetirementUserIds.add(snapshot.section.adviserId);
  }
  snapshot.linkedClasses.forEach((entry) => {
    if (entry.teacherId) {
      affectedUserIds.add(entry.teacherId);
      staffRetirementUserIds.add(entry.teacherId);
    }
  });

  const choiceOnly = historicalRetirement && blockers.length > 0;
  return {
    blockers,
    warnings,
    effects: choiceOnly ? [] : effects,
    preserved: [...new Set(preserved)],
    requiredConfirmations: choiceOnly ? [] : [...confirmations],
    affectedUserIds: [...affectedUserIds],
    resolvedStudentIds: choiceOnly
      ? []
      : snapshot.activeStudentIds.filter((studentId) =>
          outcomeByStudent.has(studentId),
        ),
    notificationUserIds: choiceOnly
      ? []
      : snapshot.activeStudentIds.filter((studentId) =>
          outcomeByStudent.has(studentId),
        ),
    notificationRetirement: {
      userIds: [...staffRetirementUserIds],
      classIds: snapshot.linkedClasses.map((entry) => entry.id),
      sectionIds: [snapshot.section.id],
    },
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
    options: SectionLifecyclePlanningOptions = {},
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
      columns: {
        id: true,
        studentId: true,
        sectionId: true,
        classId: true,
        status: true,
        createdAt: true,
      },
    });
    const activeStudentIds = [
      ...new Set(activeEnrollments.map((entry) => entry.studentId)),
    ];
    const students = activeStudentIds.length
      ? await db.query.users.findMany({
          where: inArray(users.id, activeStudentIds),
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        })
      : [];
    const learnerPrepared: Record<string, StudentLifecyclePrepared> = {};
    const learnerPlans: Record<string, LearnerPlanSummary> = {};
    const destinationCapacity: NonNullable<
      SectionLifecycleSnapshot['destinationCapacity']
    > = {};

    const historicalRetirement = dto.lifecycleMode === 'HISTORICAL_RETIREMENT';
    for (const resolution of dto.studentResolutions ?? []) {
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
          effectivePeriod: dto.effectivePeriod!,
        },
        db,
        {
          ...options,
          allowHistoricalPeriod: historicalRetirement,
        },
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
      activeEnrollments,
      activeStudentIds,
      students,
      learnerPlans,
      destinationCapacity,
      evidence: {
        enrollments: activeEnrollments.length,
        linkedClasses: linkedClasses.length,
      },
    };
    const plan = planSectionLifecycle(snapshot, dto, options);
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
        ...activeEnrollments.map((entry) => ({
          entityType: 'enrollment',
          entityId: entry.id,
          version: `${entry.status}:${entry.createdAt.toISOString()}`,
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
    for (const resolution of dto.studentResolutions ?? []) {
      if (resolution.resolution === 'COMPLETE') {
        const completed = prepared.snapshot.activeEnrollments.filter(
          (entry) => entry.studentId === resolution.studentId,
        );
        const completedIds = completed.map((entry) => entry.id);
        if (completedIds.length) {
          await this.db
            .update(enrollments)
            .set({ status: 'completed' })
            .where(inArray(enrollments.id, completedIds));
          const studentById = new Map(
            prepared.snapshot.students.map((entry) => [entry.id, entry]),
          );
          const outcome: EnrollmentLifecycleOutcome = 'completed';
          await this.db.insert(enrollmentLifecycleEvents).values(
            completed.map((entry) => {
              const student = studentById.get(entry.studentId);
              return {
                operationId: context.operationId,
                enrollmentId: entry.id,
                studentId: entry.studentId,
                studentSnapshot: student
                  ? {
                      userId: student.id,
                      email: student.email,
                      firstName: student.firstName,
                      lastName: student.lastName,
                    }
                  : {
                      userId: entry.studentId,
                      email: 'retained-by-reference',
                      firstName: 'Learner',
                      lastName: 'Record',
                    },
                classId: entry.classId,
                sectionId: entry.sectionId,
                destinationClassId: null,
                destinationSectionId: null,
                fromStatus: entry.status,
                toStatus: 'completed' as const,
                outcome,
                effectivePeriod: dto.effectivePeriod!,
                reasonCode: context.reasonCode,
                notes: context.notes,
                actorId: context.actorId,
                actorSnapshot: context.actorSnapshot,
              };
            }),
          );
          changed.push(
            ...completed.map((entry) => ({
              entityType: 'enrollment',
              entityId: entry.id,
              outcome,
            })),
          );
        }
        continue;
      }
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
          effectivePeriod: dto.effectivePeriod!,
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
      notificationUserIds: prepared.plan.notificationUserIds,
      notificationRetirement: prepared.plan.notificationRetirement,
    };
  }
}

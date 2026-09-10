import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  assessmentAttempts,
  assessments,
  classes,
  classRecordItems,
  classRecordParticipants,
  classRecords,
  classRecordScores,
  enrollmentLifecycleEvents,
  enrollments,
  lessons,
  users,
  type EnrollmentLifecycleOutcome,
} from '../../drizzle/schema';
import type {
  AdminLifecyclePeriod,
  PreviewClassLifecycleDto,
} from './DTO/admin-lifecycle.dto';
import { buildAdminLifecycleManifest } from './admin-lifecycle.manifest';
import type {
  AdminLifecycleBlocker,
  AdminLifecycleEffect,
  AdminLifecycleManifest,
  AdminLifecycleWarning,
} from './admin-lifecycle.types';
import type {
  LifecycleClass,
  LifecycleEnrollment,
  LifecycleExecutionContext,
  LifecycleParticipant,
  LifecyclePerson,
} from './student-lifecycle.service';

type LifecycleDb = DatabaseService['db'];

export interface ClassLifecycleSnapshot {
  academicState: {
    schoolYear: string;
    period: AdminLifecyclePeriod;
    version: number;
  };
  classRecord: LifecycleClass;
  activeEnrollments: LifecycleEnrollment[];
  students?: LifecyclePerson[];
  participants: LifecycleParticipant[];
  evidence: {
    enrollments: number;
    classRecords: number;
    scores: number;
    attempts: number;
    assessments: number;
    lessons: number;
  };
  replacementClass: LifecycleClass | null;
  replacementStudentIds: string[];
}

export interface ClassLifecyclePlan {
  blockers: AdminLifecycleBlocker[];
  warnings: AdminLifecycleWarning[];
  effects: AdminLifecycleEffect[];
  preserved: string[];
  requiredConfirmations: string[];
  participantChanges: Array<{
    participantId: string;
    eligibility: 'withdrawn' | 'transferred';
  }>;
  affectedUserIds: string[];
}

export interface ClassLifecyclePrepared {
  snapshot: ClassLifecycleSnapshot;
  plan: ClassLifecyclePlan;
  manifest: AdminLifecycleManifest;
}

const PERIOD_INDEX: Record<AdminLifecyclePeriod, number> = {
  Q1: 0,
  Q2: 1,
  Q3: 2,
  Q4: 3,
};

function classBlocker(code: string, message: string): AdminLifecycleBlocker {
  return { code, message, resolvable: false };
}

function normalizedSubject(value: string): string {
  return value.trim().toUpperCase();
}

export function planClassLifecycle(
  snapshot: ClassLifecycleSnapshot,
  dto: PreviewClassLifecycleDto,
): ClassLifecyclePlan {
  const blockers: AdminLifecycleBlocker[] = [];
  const warnings: AdminLifecycleWarning[] = [];
  const effects: AdminLifecycleEffect[] = [];
  const participantChanges: ClassLifecyclePlan['participantChanges'] = [];
  const activeStudentIds = snapshot.activeEnrollments.map(
    (entry) => entry.studentId,
  );

  if (!snapshot.classRecord.isActive) {
    blockers.push(
      classBlocker('CLASS_ALREADY_ARCHIVED', 'Class is already archived.'),
    );
  }
  if (dto.effectivePeriod !== snapshot.academicState.period) {
    blockers.push(
      classBlocker(
        'EFFECTIVE_PERIOD_NOT_CURRENT',
        `Class closure must use the active period ${snapshot.academicState.period}.`,
      ),
    );
  }
  if (snapshot.classRecord.schoolYear !== snapshot.academicState.schoolYear) {
    blockers.push(
      classBlocker(
        'CLASS_NOT_IN_ACTIVE_YEAR',
        'Historical classes must be handled through academic repair.',
      ),
    );
  }

  if (
    dto.resolution === 'ARCHIVE_EMPTY' &&
    snapshot.activeEnrollments.length > 0
  ) {
    blockers.push({
      code: 'ACTIVE_CLASS_ENROLLMENTS',
      message: `${snapshot.activeEnrollments.length} active learner membership(s) require an explicit outcome.`,
      resolvable: true,
      resolutionOptions: ['COMPLETE', 'DROP', 'TRANSFER'],
    });
  }

  if (dto.resolution === 'TRANSFER') {
    const replacement = snapshot.replacementClass;
    if (!replacement) {
      blockers.push(
        classBlocker(
          'REPLACEMENT_CLASS_REQUIRED',
          'Choose a replacement class before transferring learners.',
        ),
      );
    } else {
      if (replacement.id === snapshot.classRecord.id) {
        blockers.push(
          classBlocker(
            'REPLACEMENT_IS_SOURCE',
            'The replacement class must be different from the source class.',
          ),
        );
      }
      if (!replacement.isActive) {
        blockers.push(
          classBlocker(
            'REPLACEMENT_INACTIVE',
            'Replacement class is archived.',
          ),
        );
      }
      if (replacement.schoolYear !== snapshot.classRecord.schoolYear) {
        blockers.push(
          classBlocker(
            'REPLACEMENT_SCHOOL_YEAR_MISMATCH',
            'Replacement class must use the same school year.',
          ),
        );
      }
      if (replacement.sectionId !== snapshot.classRecord.sectionId) {
        blockers.push(
          classBlocker(
            'REPLACEMENT_SECTION_MISMATCH',
            'Replacement class must belong to the same section; use section transfer to move learners between sections.',
          ),
        );
      }
      if (
        normalizedSubject(replacement.subjectCode) !==
        normalizedSubject(snapshot.classRecord.subjectCode)
      ) {
        blockers.push(
          classBlocker(
            'REPLACEMENT_SUBJECT_MISMATCH',
            'Replacement class must represent the same subject.',
          ),
        );
      }
      const duplicateCount = activeStudentIds.filter((studentId) =>
        snapshot.replacementStudentIds.includes(studentId),
      ).length;
      if (duplicateCount > 0) {
        blockers.push(
          classBlocker(
            'REPLACEMENT_ALREADY_ENROLLS_STUDENT',
            `${duplicateCount} learner(s) already have an active replacement-class membership.`,
          ),
        );
      }
    }
  }

  for (const enrollment of snapshot.activeEnrollments) {
    if (dto.resolution === 'ARCHIVE_EMPTY') continue;
    effects.push({
      kind: 'update',
      entityType: 'enrollment',
      entityId: enrollment.id,
      summary:
        dto.resolution === 'COMPLETE'
          ? 'Complete class membership'
          : dto.resolution === 'TRANSFER'
            ? 'Transfer class membership'
            : 'Drop class membership',
    });
    if (dto.resolution === 'TRANSFER' && snapshot.replacementClass) {
      effects.push({
        kind: 'insert',
        entityType: 'enrollment',
        entityId: `${enrollment.studentId}:${snapshot.replacementClass.id}`,
        summary: 'Create replacement class membership',
      });
    }
  }
  effects.push({
    kind: 'archive',
    entityType: 'class',
    entityId: snapshot.classRecord.id,
    summary: 'Archive class while preserving its historical ownership and work',
  });

  if (dto.resolution === 'DROP' || dto.resolution === 'TRANSFER') {
    const eligibility: 'transferred' | 'withdrawn' =
      dto.resolution === 'TRANSFER' ? 'transferred' : 'withdrawn';
    participantChanges.push(
      ...snapshot.participants
        .filter(
          (participant) =>
            participant.recordStatus === 'draft' &&
            activeStudentIds.includes(participant.studentId) &&
            PERIOD_INDEX[participant.gradingPeriod] >=
              PERIOD_INDEX[dto.effectivePeriod],
        )
        .map((participant) => ({
          participantId: participant.id,
          eligibility,
        })),
    );
  }

  const preserved = [
    `${snapshot.evidence.classRecords} class record(s)`,
    `${snapshot.evidence.scores} class record score(s)`,
    `${snapshot.evidence.attempts} assessment attempt(s)`,
    `${snapshot.evidence.assessments} assessment(s)`,
    `${snapshot.evidence.lessons} lesson(s)`,
    'Teacher, schedule, and class identity',
  ];
  if (snapshot.evidence.classRecords > 0) {
    warnings.push({
      code: 'HISTORICAL_EVIDENCE_PRESERVED',
      message:
        'Existing academic evidence remains attached to the archived class.',
    });
  }

  return {
    blockers,
    warnings,
    effects,
    preserved,
    requiredConfirmations: ['PRESERVE_ACADEMIC_HISTORY', dto.resolution],
    participantChanges,
    affectedUserIds: [
      ...new Set(
        [
          ...activeStudentIds,
          snapshot.classRecord.teacherId,
          snapshot.replacementClass?.teacherId,
        ].filter((value): value is string => Boolean(value)),
      ),
    ],
  };
}

@Injectable()
export class ClassLifecycleService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async prepare(
    dto: PreviewClassLifecycleDto,
    db: LifecycleDb = this.db,
  ): Promise<ClassLifecyclePrepared> {
    const state = await db.query.academicSystemStates.findFirst({
      orderBy: [desc(academicSystemStates.updatedAt)],
    });
    if (!state)
      throw new NotFoundException('Academic state is not initialized');

    const classRecord = await db.query.classes.findFirst({
      where: eq(classes.id, dto.classId),
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
    if (!classRecord) throw new NotFoundException('Class not found');

    const activeEnrollments = await db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, dto.classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: {
        id: true,
        studentId: true,
        classId: true,
        sectionId: true,
        status: true,
        createdAt: true,
      },
    });
    const studentIds = [
      ...new Set(activeEnrollments.map((entry) => entry.studentId)),
    ];
    const students = studentIds.length
      ? await db.query.users.findMany({
          where: inArray(users.id, studentIds),
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        })
      : [];
    const records = await db.query.classRecords.findMany({
      where: eq(classRecords.classId, dto.classId),
      columns: {
        id: true,
        classId: true,
        gradingPeriod: true,
        status: true,
        revision: true,
        updatedAt: true,
      },
    });
    const recordIds = records.map((entry) => entry.id);
    const participantRows = recordIds.length
      ? await db.query.classRecordParticipants.findMany({
          where: inArray(classRecordParticipants.classRecordId, recordIds),
          columns: {
            id: true,
            classRecordId: true,
            studentId: true,
            eligibility: true,
          },
        })
      : [];
    const recordById = new Map(records.map((entry) => [entry.id, entry]));
    const participants: LifecycleParticipant[] = participantRows.flatMap(
      (entry) => {
        const record = recordById.get(entry.classRecordId);
        return record
          ? [
              {
                id: entry.id,
                studentId: entry.studentId,
                classId: record.classId,
                gradingPeriod: record.gradingPeriod,
                recordStatus: record.status,
                eligibility: entry.eligibility,
              },
            ]
          : [];
      },
    );
    const items = recordIds.length
      ? await db.query.classRecordItems.findMany({
          where: inArray(classRecordItems.classRecordId, recordIds),
          columns: { id: true },
        })
      : [];
    const itemIds = items.map((entry) => entry.id);
    const scores = itemIds.length
      ? await db.query.classRecordScores.findMany({
          where: inArray(classRecordScores.classRecordItemId, itemIds),
          columns: { id: true },
        })
      : [];
    const classAssessments = await db.query.assessments.findMany({
      where: eq(assessments.classId, dto.classId),
      columns: { id: true },
    });
    const assessmentIds = classAssessments.map((entry) => entry.id);
    const attempts = assessmentIds.length
      ? await db.query.assessmentAttempts.findMany({
          where: inArray(assessmentAttempts.assessmentId, assessmentIds),
          columns: { id: true },
        })
      : [];
    const classLessons = await db.query.lessons.findMany({
      where: eq(lessons.classId, dto.classId),
      columns: { id: true },
    });

    const replacementClass = dto.replacementClassId
      ? ((await db.query.classes.findFirst({
          where: eq(classes.id, dto.replacementClassId),
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
        })) ?? null)
      : null;
    const replacementEnrollments = replacementClass
      ? await db.query.enrollments.findMany({
          where: and(
            eq(enrollments.classId, replacementClass.id),
            eq(enrollments.status, 'enrolled'),
          ),
          columns: { studentId: true },
        })
      : [];

    const snapshot: ClassLifecycleSnapshot = {
      academicState: {
        schoolYear: state.schoolYear,
        period: state.quarter,
        version: state.version,
      },
      classRecord,
      activeEnrollments,
      students,
      participants,
      evidence: {
        enrollments: activeEnrollments.length,
        classRecords: records.length,
        scores: scores.length,
        attempts: attempts.length,
        assessments: classAssessments.length,
        lessons: classLessons.length,
      },
      replacementClass,
      replacementStudentIds: replacementEnrollments.map(
        (entry) => entry.studentId,
      ),
    };
    const plan = planClassLifecycle(snapshot, dto);
    const manifest = buildAdminLifecycleManifest({
      action: 'ARCHIVE_CLASS',
      targetType: 'class',
      targetId: dto.classId,
      request: { ...dto },
      academicState: snapshot.academicState,
      dependencyVersions: [
        {
          entityType: 'academic_state',
          entityId: state.id,
          version: state.version,
        },
        {
          entityType: 'class',
          entityId: classRecord.id,
          version: classRecord.updatedAt.toISOString(),
        },
        ...activeEnrollments.map((entry) => ({
          entityType: 'enrollment',
          entityId: entry.id,
          version: `${entry.status}:${entry.createdAt.toISOString()}`,
        })),
        ...(replacementClass
          ? [
              {
                entityType: 'replacement_class',
                entityId: replacementClass.id,
                version: replacementClass.updatedAt.toISOString(),
              },
            ]
          : []),
      ],
      effects: plan.effects,
      preserved: plan.preserved,
      evidence: snapshot.evidence,
      blockers: plan.blockers,
      warnings: plan.warnings,
      requiredConfirmations: plan.requiredConfirmations,
    });

    return { snapshot, plan, manifest };
  }

  async apply(
    dto: PreviewClassLifecycleDto,
    prepared: ClassLifecyclePrepared,
    context: LifecycleExecutionContext,
  ) {
    const sourceEnrollments = prepared.snapshot.activeEnrollments;
    if (dto.resolution === 'TRANSFER') {
      const replacement = prepared.snapshot.replacementClass!;
      if (sourceEnrollments.length) {
        await this.db.insert(enrollments).values(
          sourceEnrollments.map((entry) => ({
            studentId: entry.studentId,
            sectionId: replacement.sectionId,
            classId: replacement.id,
            status: 'enrolled' as const,
          })),
        );
      }
    }

    const sourceStatus =
      dto.resolution === 'COMPLETE' ? 'completed' : 'dropped';
    if (sourceEnrollments.length) {
      await this.db
        .update(enrollments)
        .set({ status: sourceStatus })
        .where(
          inArray(
            enrollments.id,
            sourceEnrollments.map((entry) => entry.id),
          ),
        );
    }
    for (const eligibility of ['withdrawn', 'transferred'] as const) {
      const ids = prepared.plan.participantChanges
        .filter((entry) => entry.eligibility === eligibility)
        .map((entry) => entry.participantId);
      if (!ids.length) continue;
      await this.db
        .update(classRecordParticipants)
        .set({
          eligibility,
          reason: `${dto.resolution} effective ${dto.effectivePeriod}`,
          updatedBy: context.actorId,
          updatedAt: new Date(),
        })
        .where(inArray(classRecordParticipants.id, ids));
    }

    await this.db
      .update(classes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(classes.id, dto.classId));

    const outcome: EnrollmentLifecycleOutcome =
      dto.resolution === 'COMPLETE'
        ? 'completed'
        : dto.resolution === 'TRANSFER'
          ? 'transferred_class'
          : 'withdrawn';
    const studentById = new Map(
      (prepared.snapshot.students ?? []).map((entry) => [entry.id, entry]),
    );
    if (sourceEnrollments.length) {
      await this.db.insert(enrollmentLifecycleEvents).values(
        sourceEnrollments.map((entry) => {
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
            destinationClassId: prepared.snapshot.replacementClass?.id ?? null,
            destinationSectionId:
              prepared.snapshot.replacementClass?.sectionId ?? null,
            fromStatus: entry.status,
            toStatus: sourceStatus,
            outcome,
            effectivePeriod: dto.effectivePeriod,
            reasonCode: context.reasonCode,
            notes: context.notes,
            actorId: context.actorId,
            actorSnapshot: context.actorSnapshot,
          };
        }),
      );
    }

    return {
      changed: [
        ...sourceEnrollments.map((entry) => ({
          entityType: 'enrollment',
          entityId: entry.id,
          outcome,
        })),
        { entityType: 'class', entityId: dto.classId, outcome: 'archived' },
      ],
      preserved: prepared.plan.preserved,
      affectedUserIds: prepared.plan.affectedUserIds,
    };
  }
}

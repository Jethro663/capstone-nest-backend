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
  sections,
  users,
  type LifecycleActorSnapshot,
  type EnrollmentLifecycleOutcome,
} from '../../drizzle/schema';
import type {
  AdminLifecyclePeriod,
  PreviewStudentLifecycleDto,
} from './DTO/admin-lifecycle.dto';
import type {
  AdminLifecycleBlocker,
  AdminLifecycleEffect,
  AdminLifecycleWarning,
} from './admin-lifecycle.types';
import { buildAdminLifecycleManifest } from './admin-lifecycle.manifest';
import type { AdminLifecycleManifest } from './admin-lifecycle.types';

type EnrollmentStatus = 'enrolled' | 'dropped' | 'completed';
type ParticipantEligibility =
  | 'eligible'
  | 'not_enrolled'
  | 'transferred'
  | 'withdrawn';

export interface LifecyclePerson {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface LifecycleSection {
  id: string;
  name: string;
  gradeLevel: string;
  schoolYear: string;
  capacity?: number;
  isActive: boolean;
  adviserId: string | null;
  updatedAt: Date;
}

export interface LifecycleClass {
  id: string;
  sectionId: string;
  subjectCode: string;
  subjectName: string;
  schoolYear: string;
  isActive: boolean;
  teacherId: string | null;
  updatedAt: Date;
}

export interface LifecycleEnrollment {
  id: string;
  studentId: string;
  sectionId: string;
  classId: string | null;
  status: EnrollmentStatus;
  createdAt: Date;
}

export interface LifecycleParticipant {
  id: string;
  studentId: string;
  classId: string;
  gradingPeriod: AdminLifecyclePeriod;
  recordStatus: 'draft' | 'finalized' | 'locked';
  eligibility: ParticipantEligibility;
}

export interface StudentLifecycleSnapshot {
  academicState: {
    schoolYear: string;
    period: AdminLifecyclePeriod;
    version: number;
  };
  student: LifecyclePerson;
  sourceSection: LifecycleSection;
  sourceEnrollments: LifecycleEnrollment[];
  sourceClasses: LifecycleClass[];
  participants: LifecycleParticipant[];
  evidence: {
    draftParticipants: number;
    finalizedParticipants: number;
    scores: number;
    attempts: number;
  };
  destinationSection: LifecycleSection | null;
  destinationClasses: LifecycleClass[];
  destinationActiveStudentCount: number;
  destinationExistingEnrollment: boolean;
  destinationClassExistingEnrollment: boolean;
}

export interface StudentParticipantChange {
  participantId: string;
  eligibility: Exclude<ParticipantEligibility, 'eligible'>;
}

export interface StudentLifecyclePlan {
  blockers: AdminLifecycleBlocker[];
  warnings: AdminLifecycleWarning[];
  effects: AdminLifecycleEffect[];
  preserved: string[];
  requiredConfirmations: string[];
  participantChanges: StudentParticipantChange[];
  destinationClassMap: Record<string, string>;
  affectedUserIds: string[];
}

const PERIOD_INDEX: Record<AdminLifecyclePeriod, number> = {
  Q1: 0,
  Q2: 1,
  Q3: 2,
  Q4: 3,
};

function normalizedSubjectCode(value: string) {
  return value.trim().toUpperCase();
}

function blocker(code: string, message: string): AdminLifecycleBlocker {
  return { code, message, resolvable: false };
}

function currentAndFutureDraftParticipants(
  snapshot: StudentLifecycleSnapshot,
  effectivePeriod: AdminLifecyclePeriod,
  eligibility: StudentParticipantChange['eligibility'],
  classIds?: Set<string>,
): StudentParticipantChange[] {
  return snapshot.participants
    .filter(
      (participant) =>
        participant.recordStatus === 'draft' &&
        PERIOD_INDEX[participant.gradingPeriod] >=
          PERIOD_INDEX[effectivePeriod] &&
        (!classIds || classIds.has(participant.classId)),
    )
    .map((participant) => ({
      participantId: participant.id,
      eligibility,
    }));
}

export function planStudentLifecycle(
  snapshot: StudentLifecycleSnapshot,
  dto: PreviewStudentLifecycleDto,
): StudentLifecyclePlan {
  const blockers: AdminLifecycleBlocker[] = [];
  const warnings: AdminLifecycleWarning[] = [];
  const effects: AdminLifecycleEffect[] = [];
  const preserved = snapshot.participants
    .filter((participant) => participant.recordStatus !== 'draft')
    .map(
      (participant) =>
        `${participant.recordStatus === 'finalized' ? 'Finalized' : 'Locked'} ${participant.gradingPeriod} class record`,
    );
  const destinationClassMap: Record<string, string> = {};

  if (dto.effectivePeriod !== snapshot.academicState.period) {
    blockers.push(
      blocker(
        'EFFECTIVE_PERIOD_NOT_CURRENT',
        `Lifecycle resolution must use the active period ${snapshot.academicState.period}; use academic repair for historical periods.`,
      ),
    );
  }

  if (snapshot.sourceEnrollments.length === 0) {
    blockers.push(
      blocker(
        'SOURCE_ENROLLMENT_NOT_FOUND',
        'The learner has no active enrollment in the selected source.',
      ),
    );
  }

  const sourceClassIds = new Set(
    dto.resolution === 'TRANSFER_CLASS' && dto.classId
      ? [dto.classId]
      : snapshot.sourceClasses.map((entry) => entry.id),
  );
  const affectedEnrollments = snapshot.sourceEnrollments.filter((entry) =>
    dto.resolution === 'TRANSFER_CLASS' ? entry.classId === dto.classId : true,
  );

  if (dto.resolution === 'CORRECT_ENROLLMENT') {
    const evidenceCount =
      snapshot.evidence.finalizedParticipants +
      snapshot.evidence.scores +
      snapshot.evidence.attempts;
    if (evidenceCount > 0) {
      blockers.push({
        code: 'CORRECTION_HAS_ACADEMIC_EVIDENCE',
        message:
          'This enrollment has retained academic evidence and cannot be treated as an error.',
        resolvable: false,
        resolutionOptions: ['WITHDRAW', 'TRANSFER_SECTION', 'ACADEMIC_REPAIR'],
      });
    }
  }

  if (dto.resolution === 'TRANSFER_SECTION') {
    const destination = snapshot.destinationSection;
    if (!dto.destinationSectionId || !destination) {
      blockers.push(
        blocker(
          'DESTINATION_SECTION_REQUIRED',
          'Select an active destination section.',
        ),
      );
    } else {
      if (!destination.isActive) {
        blockers.push(
          blocker(
            'DESTINATION_INACTIVE',
            'The destination section is archived.',
          ),
        );
      } else if (destination.schoolYear !== snapshot.sourceSection.schoolYear) {
        blockers.push(
          blocker(
            'DESTINATION_SCHOOL_YEAR_MISMATCH',
            'The destination section must belong to the same school year.',
          ),
        );
      } else if (destination.gradeLevel !== snapshot.sourceSection.gradeLevel) {
        blockers.push(
          blocker(
            'DESTINATION_GRADE_MISMATCH',
            'The destination section must use the same grade level.',
          ),
        );
      } else if (
        snapshot.destinationActiveStudentCount >= destination.capacity!
      ) {
        blockers.push(
          blocker(
            'DESTINATION_AT_CAPACITY',
            'The destination section has reached capacity.',
          ),
        );
      } else if (snapshot.destinationExistingEnrollment) {
        blockers.push(
          blocker(
            'DESTINATION_ALREADY_ENROLLED',
            'The learner already has an active destination membership.',
          ),
        );
      } else {
        for (const sourceClass of snapshot.sourceClasses) {
          const matches = snapshot.destinationClasses.filter(
            (entry) =>
              entry.isActive &&
              entry.schoolYear === sourceClass.schoolYear &&
              normalizedSubjectCode(entry.subjectCode) ===
                normalizedSubjectCode(sourceClass.subjectCode),
          );
          if (matches.length === 0) {
            blockers.push(
              blocker(
                'DESTINATION_CLASS_MISSING',
                `No active ${sourceClass.subjectCode} class exists in the destination section.`,
              ),
            );
          } else if (matches.length > 1) {
            blockers.push(
              blocker(
                'DESTINATION_CLASS_AMBIGUOUS',
                `More than one active ${sourceClass.subjectCode} class exists in the destination section.`,
              ),
            );
          } else {
            destinationClassMap[sourceClass.id] = matches[0].id;
          }
        }
      }
    }
  }

  if (dto.resolution === 'TRANSFER_CLASS') {
    const sourceClass = snapshot.sourceClasses.find(
      (entry) => entry.id === dto.classId,
    );
    const destination = snapshot.destinationClasses.find(
      (entry) => entry.id === dto.destinationClassId,
    );
    if (!dto.classId || !sourceClass) {
      blockers.push(
        blocker('SOURCE_CLASS_REQUIRED', 'Select an enrolled source class.'),
      );
    } else if (!dto.destinationClassId || !destination) {
      blockers.push(
        blocker(
          'DESTINATION_CLASS_REQUIRED',
          'Select an active destination class.',
        ),
      );
    } else if (!destination.isActive) {
      blockers.push(
        blocker(
          'DESTINATION_CLASS_INACTIVE',
          'The destination class is archived.',
        ),
      );
    } else if (destination.schoolYear !== sourceClass.schoolYear) {
      blockers.push(
        blocker(
          'DESTINATION_CLASS_YEAR_MISMATCH',
          'The destination class must belong to the same school year.',
        ),
      );
    } else if (destination.sectionId !== sourceClass.sectionId) {
      blockers.push(
        blocker(
          'DESTINATION_CLASS_SECTION_MISMATCH',
          "A class-only transfer must stay in the learner's current section; use section transfer to move sections.",
        ),
      );
    } else if (
      normalizedSubjectCode(destination.subjectCode) !==
      normalizedSubjectCode(sourceClass.subjectCode)
    ) {
      blockers.push(
        blocker(
          'DESTINATION_CLASS_SUBJECT_MISMATCH',
          'The destination class must represent the same subject.',
        ),
      );
    } else if (snapshot.destinationClassExistingEnrollment) {
      blockers.push(
        blocker(
          'DESTINATION_CLASS_ALREADY_ENROLLED',
          'The learner already has an active destination class membership.',
        ),
      );
    } else {
      destinationClassMap[sourceClass.id] = destination.id;
    }
  }

  for (const enrollment of affectedEnrollments) {
    effects.push({
      kind: 'update',
      entityType: 'enrollment',
      entityId: enrollment.id,
      summary:
        dto.resolution === 'CORRECT_ENROLLMENT'
          ? 'Mark erroneous enrollment as dropped'
          : dto.resolution === 'WITHDRAW'
            ? 'Close enrollment as withdrawn'
            : 'Close source enrollment for transfer',
    });
  }

  const eligibility =
    dto.resolution === 'CORRECT_ENROLLMENT'
      ? 'not_enrolled'
      : dto.resolution === 'WITHDRAW'
        ? 'withdrawn'
        : 'transferred';
  const participantChanges = currentAndFutureDraftParticipants(
    snapshot,
    dto.effectivePeriod,
    eligibility,
    dto.resolution === 'TRANSFER_CLASS' ? sourceClassIds : undefined,
  );

  if (snapshot.evidence.attempts || snapshot.evidence.scores) {
    warnings.push({
      code: 'ACADEMIC_EVIDENCE_PRESERVED',
      message: 'Existing attempts and recorded scores remain unchanged.',
    });
  }

  const affectedUserIds = [
    snapshot.sourceSection.adviserId,
    ...snapshot.sourceClasses.map((entry) => entry.teacherId),
    snapshot.destinationSection?.adviserId,
    ...snapshot.destinationClasses.map((entry) => entry.teacherId),
  ].filter((value): value is string => Boolean(value));

  return {
    blockers,
    warnings,
    effects,
    preserved: [...new Set(preserved)],
    requiredConfirmations: ['PRESERVE_ACADEMIC_HISTORY', dto.resolution],
    participantChanges,
    destinationClassMap,
    affectedUserIds: [...new Set(affectedUserIds)],
  };
}

type LifecycleDb = DatabaseService['db'];

export interface StudentLifecyclePrepared {
  snapshot: StudentLifecycleSnapshot;
  plan: StudentLifecyclePlan;
  manifest: AdminLifecycleManifest;
}

export interface LifecycleExecutionContext {
  operationId: string;
  actorId: string;
  actorSnapshot: LifecycleActorSnapshot;
  reasonCode: string;
  notes: string;
}

@Injectable()
export class StudentLifecycleService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async prepare(
    dto: PreviewStudentLifecycleDto,
    db: LifecycleDb = this.db,
  ): Promise<StudentLifecyclePrepared> {
    const state = await db.query.academicSystemStates.findFirst({
      orderBy: [desc(academicSystemStates.updatedAt)],
    });
    if (!state) {
      throw new NotFoundException('Academic state is not initialized');
    }

    const student = await db.query.users.findFirst({
      where: eq(users.id, dto.studentId),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const sourceSection = await db.query.sections.findFirst({
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
    if (!sourceSection) throw new NotFoundException('Source section not found');

    const sourceEnrollments = await db.query.enrollments.findMany({
      where: and(
        eq(enrollments.studentId, dto.studentId),
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
    const sourceClassIds = [
      ...new Set(
        sourceEnrollments
          .map((entry) => entry.classId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const sourceClasses = sourceClassIds.length
      ? await db.query.classes.findMany({
          where: inArray(classes.id, sourceClassIds),
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
        })
      : [];
    const records = sourceClassIds.length
      ? await db.query.classRecords.findMany({
          where: inArray(classRecords.classId, sourceClassIds),
          columns: {
            id: true,
            classId: true,
            gradingPeriod: true,
            status: true,
            revision: true,
            updatedAt: true,
          },
        })
      : [];
    const recordIds = records.map((entry) => entry.id);
    const participantRows = recordIds.length
      ? await db.query.classRecordParticipants.findMany({
          where: and(
            eq(classRecordParticipants.studentId, dto.studentId),
            inArray(classRecordParticipants.classRecordId, recordIds),
          ),
          columns: {
            id: true,
            classRecordId: true,
            eligibility: true,
          },
        })
      : [];
    const recordById = new Map(records.map((entry) => [entry.id, entry]));
    const participants: LifecycleParticipant[] = participantRows.flatMap(
      (participant) => {
        const record = recordById.get(participant.classRecordId);
        return record
          ? [
              {
                id: participant.id,
                studentId: dto.studentId,
                classId: record.classId,
                gradingPeriod: record.gradingPeriod,
                recordStatus: record.status,
                eligibility: participant.eligibility,
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
          where: and(
            eq(classRecordScores.studentId, dto.studentId),
            inArray(classRecordScores.classRecordItemId, itemIds),
          ),
          columns: { id: true },
        })
      : [];
    const classAssessments = sourceClassIds.length
      ? await db.query.assessments.findMany({
          where: inArray(assessments.classId, sourceClassIds),
          columns: { id: true },
        })
      : [];
    const assessmentIds = classAssessments.map((entry) => entry.id);
    const attempts = assessmentIds.length
      ? await db.query.assessmentAttempts.findMany({
          where: and(
            eq(assessmentAttempts.studentId, dto.studentId),
            inArray(assessmentAttempts.assessmentId, assessmentIds),
          ),
          columns: { id: true },
        })
      : [];

    let destinationSection: LifecycleSection | null = null;
    let destinationClasses: LifecycleClass[] = [];
    let destinationActiveStudentCount = 0;
    let destinationExistingEnrollment = false;
    let destinationClassExistingEnrollment = false;

    if (dto.resolution === 'TRANSFER_SECTION' && dto.destinationSectionId) {
      destinationSection =
        (await db.query.sections.findFirst({
          where: eq(sections.id, dto.destinationSectionId),
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
        })) ?? null;
      if (destinationSection) {
        destinationClasses = await db.query.classes.findMany({
          where: and(
            eq(classes.sectionId, destinationSection.id),
            eq(classes.isActive, true),
          ),
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
        const destinationEnrollments = await db.query.enrollments.findMany({
          where: and(
            eq(enrollments.sectionId, destinationSection.id),
            eq(enrollments.status, 'enrolled'),
          ),
          columns: { studentId: true, classId: true },
        });
        destinationActiveStudentCount = new Set(
          destinationEnrollments.map((entry) => entry.studentId),
        ).size;
        destinationExistingEnrollment = destinationEnrollments.some(
          (entry) => entry.studentId === dto.studentId,
        );
      }
    }

    if (dto.resolution === 'TRANSFER_CLASS' && dto.destinationClassId) {
      const destinationClass = await db.query.classes.findFirst({
        where: eq(classes.id, dto.destinationClassId),
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
      destinationClasses = destinationClass ? [destinationClass] : [];
      destinationClassExistingEnrollment = Boolean(
        destinationClass &&
        (await db.query.enrollments.findFirst({
          where: and(
            eq(enrollments.studentId, dto.studentId),
            eq(enrollments.classId, destinationClass.id),
            eq(enrollments.status, 'enrolled'),
          ),
          columns: { id: true },
        })),
      );
    }

    const snapshot: StudentLifecycleSnapshot = {
      academicState: {
        schoolYear: state.schoolYear,
        period: state.quarter,
        version: state.version,
      },
      student,
      sourceSection,
      sourceEnrollments,
      sourceClasses,
      participants,
      evidence: {
        draftParticipants: participants.filter(
          (entry) => entry.recordStatus === 'draft',
        ).length,
        finalizedParticipants: participants.filter(
          (entry) => entry.recordStatus !== 'draft',
        ).length,
        scores: scores.length,
        attempts: attempts.length,
      },
      destinationSection,
      destinationClasses,
      destinationActiveStudentCount,
      destinationExistingEnrollment,
      destinationClassExistingEnrollment,
    };
    const plan = planStudentLifecycle(snapshot, dto);
    const manifest = buildAdminLifecycleManifest({
      action: 'STUDENT_RESOLUTION',
      targetType: 'student',
      targetId: dto.studentId,
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
          entityId: sourceSection.id,
          version: sourceSection.updatedAt.toISOString(),
        },
        ...sourceClasses.map((entry) => ({
          entityType: 'class',
          entityId: entry.id,
          version: entry.updatedAt.toISOString(),
        })),
        ...sourceEnrollments.map((entry) => ({
          entityType: 'enrollment',
          entityId: entry.id,
          version: `${entry.status}:${entry.createdAt.toISOString()}`,
        })),
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
    dto: PreviewStudentLifecycleDto,
    prepared: StudentLifecyclePrepared,
    context: LifecycleExecutionContext,
  ) {
    const affectedIds = new Set(
      prepared.plan.effects
        .filter((effect) => effect.entityType === 'enrollment')
        .map((effect) => effect.entityId),
    );
    const affectedEnrollments = prepared.snapshot.sourceEnrollments.filter(
      (entry) => affectedIds.has(entry.id),
    );

    if (dto.resolution === 'TRANSFER_SECTION') {
      const destination = prepared.snapshot.destinationSection!;
      await this.db.insert(enrollments).values([
        {
          studentId: dto.studentId,
          sectionId: destination.id,
          classId: null,
          status: 'enrolled',
        },
        ...Object.values(prepared.plan.destinationClassMap).map((classId) => ({
          studentId: dto.studentId,
          sectionId: destination.id,
          classId,
          status: 'enrolled' as const,
        })),
      ]);
    }

    if (dto.resolution === 'TRANSFER_CLASS') {
      const destinationClass = prepared.snapshot.destinationClasses.find(
        (entry) => entry.id === dto.destinationClassId,
      )!;
      await this.db.insert(enrollments).values({
        studentId: dto.studentId,
        sectionId: destinationClass.sectionId,
        classId: destinationClass.id,
        status: 'enrolled',
      });
    }

    if (affectedEnrollments.length) {
      await this.db
        .update(enrollments)
        .set({ status: 'dropped' })
        .where(
          inArray(
            enrollments.id,
            affectedEnrollments.map((entry) => entry.id),
          ),
        );
    }
    if (prepared.plan.participantChanges.length) {
      for (const eligibility of [
        'not_enrolled',
        'withdrawn',
        'transferred',
      ] as const) {
        const participantIds = prepared.plan.participantChanges
          .filter((entry) => entry.eligibility === eligibility)
          .map((entry) => entry.participantId);
        if (!participantIds.length) continue;
        await this.db
          .update(classRecordParticipants)
          .set({
            eligibility,
            reason: `${dto.resolution} effective ${dto.effectivePeriod}`,
            updatedBy: context.actorId,
            updatedAt: new Date(),
          })
          .where(inArray(classRecordParticipants.id, participantIds));
      }
    }

    const outcome: EnrollmentLifecycleOutcome =
      dto.resolution === 'CORRECT_ENROLLMENT'
        ? 'corrected'
        : dto.resolution === 'WITHDRAW'
          ? 'withdrawn'
          : dto.resolution === 'TRANSFER_SECTION'
            ? 'transferred_section'
            : 'transferred_class';
    if (affectedEnrollments.length) {
      await this.db.insert(enrollmentLifecycleEvents).values(
        affectedEnrollments.map((entry) => ({
          operationId: context.operationId,
          enrollmentId: entry.id,
          studentId: dto.studentId,
          studentSnapshot: {
            userId: prepared.snapshot.student.id,
            email: prepared.snapshot.student.email,
            firstName: prepared.snapshot.student.firstName,
            lastName: prepared.snapshot.student.lastName,
          },
          classId: entry.classId,
          sectionId: entry.sectionId,
          destinationClassId: entry.classId
            ? (prepared.plan.destinationClassMap[entry.classId] ?? null)
            : null,
          destinationSectionId: dto.destinationSectionId ?? null,
          fromStatus: entry.status,
          toStatus: 'dropped',
          outcome,
          effectivePeriod: dto.effectivePeriod,
          reasonCode: context.reasonCode,
          notes: context.notes,
          actorId: context.actorId,
          actorSnapshot: context.actorSnapshot,
        })),
      );
    }

    return {
      changed: affectedEnrollments.map((entry) => ({
        entityType: 'enrollment',
        entityId: entry.id,
        outcome,
      })),
      preserved: prepared.plan.preserved,
      affectedUserIds: prepared.plan.affectedUserIds,
    };
  }
}

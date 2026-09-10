import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, inArray, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessmentAttempts,
  assessments,
  classes,
  classRecordItems,
  classRecords,
  classRecordScores,
  enrollmentLifecycleEvents,
  enrollments,
  lessons,
  sections,
} from '../../drizzle/schema';
import type { PreviewPurgeLifecycleDto } from './DTO/admin-lifecycle.dto';
import {
  classifyLifecycleEvidence,
  type LifecycleEvidenceInput,
} from './admin-lifecycle.evidence';
import { buildAdminLifecycleManifest } from './admin-lifecycle.manifest';
import type {
  AdminLifecycleBlocker,
  AdminLifecycleEffect,
  AdminLifecycleManifest,
  AdminLifecycleWarning,
} from './admin-lifecycle.types';
import type { LifecycleExecutionContext } from './student-lifecycle.service';

type LifecycleDb = DatabaseService['db'];

export interface PurgeLifecycleSnapshot {
  targetType: 'CLASS' | 'SECTION';
  targetId: string;
  targetName: string;
  isActive: boolean;
  version: string;
  evidence: LifecycleEvidenceInput;
}

export interface PurgeLifecyclePlan {
  blockers: AdminLifecycleBlocker[];
  warnings: AdminLifecycleWarning[];
  effects: AdminLifecycleEffect[];
  preserved: string[];
  requiredConfirmations: string[];
  affectedUserIds: string[];
}

export interface PurgeLifecyclePrepared {
  snapshot: PurgeLifecycleSnapshot;
  plan: PurgeLifecyclePlan;
  manifest: AdminLifecycleManifest;
}

export function planPurgeLifecycle(
  snapshot: PurgeLifecycleSnapshot,
): PurgeLifecyclePlan {
  const blockers: AdminLifecycleBlocker[] = [];
  const inventory = classifyLifecycleEvidence(snapshot.evidence, {
    purpose: 'purge',
  });
  if (snapshot.isActive) {
    blockers.push({
      code: 'TARGET_NOT_ARCHIVED',
      message: `${snapshot.targetType === 'CLASS' ? 'Class' : 'Section'} must be archived before permanent deletion.`,
      resolvable: false,
    });
  }
  if (inventory.hasRetainedEvidence) {
    blockers.push({
      code: 'RETAINED_EVIDENCE',
      message: `Permanent deletion is blocked by retained evidence: ${inventory.blockingCategories.join(', ')}.`,
      resolvable: false,
    });
  }
  return {
    blockers,
    warnings: [
      {
        code: 'PERMANENT_ACTION',
        message:
          'Permanent deletion cannot be undone and has no evidence override.',
      },
    ],
    effects: [
      {
        kind: 'purge',
        entityType: snapshot.targetType.toLowerCase(),
        entityId: snapshot.targetId,
        summary: `Permanently delete empty archived ${snapshot.targetName}`,
      },
    ],
    preserved: ['Lifecycle operation and audit evidence'],
    requiredConfirmations: [
      'PERMANENT_DELETE',
      'NO_RETAINED_ACADEMIC_EVIDENCE',
    ],
    affectedUserIds: [],
  };
}

async function collectClassEvidence(db: LifecycleDb, classId: string) {
  const enrollmentRows = await db.query.enrollments.findMany({
    where: eq(enrollments.classId, classId),
    columns: { id: true },
  });
  const eventRows = await db.query.enrollmentLifecycleEvents.findMany({
    where: or(
      eq(enrollmentLifecycleEvents.classId, classId),
      eq(enrollmentLifecycleEvents.destinationClassId, classId),
    ),
    columns: { id: true },
  });
  const recordRows = await db.query.classRecords.findMany({
    where: eq(classRecords.classId, classId),
    columns: { id: true },
  });
  const recordIds = recordRows.map((entry) => entry.id);
  const itemRows = recordIds.length
    ? await db.query.classRecordItems.findMany({
        where: inArray(classRecordItems.classRecordId, recordIds),
        columns: { id: true },
      })
    : [];
  const itemIds = itemRows.map((entry) => entry.id);
  const scoreRows = itemIds.length
    ? await db.query.classRecordScores.findMany({
        where: inArray(classRecordScores.classRecordItemId, itemIds),
        columns: { id: true },
      })
    : [];
  const assessmentRows = await db.query.assessments.findMany({
    where: eq(assessments.classId, classId),
    columns: { id: true },
  });
  const assessmentIds = assessmentRows.map((entry) => entry.id);
  const attemptRows = assessmentIds.length
    ? await db.query.assessmentAttempts.findMany({
        where: inArray(assessmentAttempts.assessmentId, assessmentIds),
        columns: { id: true },
      })
    : [];
  const lessonRows = await db.query.lessons.findMany({
    where: eq(lessons.classId, classId),
    columns: { id: true },
  });
  return {
    enrollmentHistory: enrollmentRows.length,
    lifecycleEvents: eventRows.length,
    classRecords: recordRows.length,
    scores: scoreRows.length,
    attempts: attemptRows.length,
    assessments: assessmentRows.length,
    lessons: lessonRows.length,
    linkedClasses: 0,
  } satisfies LifecycleEvidenceInput;
}

export async function collectPurgeLifecycleSnapshot(
  db: LifecycleDb,
  dto: PreviewPurgeLifecycleDto,
): Promise<PurgeLifecycleSnapshot> {
  if (dto.targetType === 'CLASS') {
    const target = await db.query.classes.findFirst({
      where: eq(classes.id, dto.targetId),
      columns: {
        id: true,
        subjectName: true,
        subjectCode: true,
        isActive: true,
        updatedAt: true,
      },
    });
    if (!target) throw new NotFoundException('Class not found');
    return {
      targetType: dto.targetType,
      targetId: target.id,
      targetName: `${target.subjectCode} ${target.subjectName}`.trim(),
      isActive: target.isActive,
      version: target.updatedAt.toISOString(),
      evidence: await collectClassEvidence(db, target.id),
    };
  }

  const target = await db.query.sections.findFirst({
    where: eq(sections.id, dto.targetId),
    columns: {
      id: true,
      name: true,
      isActive: true,
      updatedAt: true,
    },
  });
  if (!target) throw new NotFoundException('Section not found');
  const linkedClasses = await db.query.classes.findMany({
    where: eq(classes.sectionId, target.id),
    columns: { id: true },
  });
  const enrollmentRows = await db.query.enrollments.findMany({
    where: eq(enrollments.sectionId, target.id),
    columns: { id: true },
  });
  const eventRows = await db.query.enrollmentLifecycleEvents.findMany({
    where: or(
      eq(enrollmentLifecycleEvents.sectionId, target.id),
      eq(enrollmentLifecycleEvents.destinationSectionId, target.id),
    ),
    columns: { id: true },
  });
  let nested: LifecycleEvidenceInput = {};
  for (const linkedClass of linkedClasses) {
    const inventory = await collectClassEvidence(db, linkedClass.id);
    nested = {
      classRecords: (nested.classRecords ?? 0) + (inventory.classRecords ?? 0),
      scores: (nested.scores ?? 0) + (inventory.scores ?? 0),
      attempts: (nested.attempts ?? 0) + (inventory.attempts ?? 0),
      assessments: (nested.assessments ?? 0) + (inventory.assessments ?? 0),
      lessons: (nested.lessons ?? 0) + (inventory.lessons ?? 0),
    };
  }
  return {
    targetType: dto.targetType,
    targetId: target.id,
    targetName: target.name,
    isActive: target.isActive,
    version: target.updatedAt.toISOString(),
    evidence: {
      enrollmentHistory: enrollmentRows.length,
      lifecycleEvents: eventRows.length,
      linkedClasses: linkedClasses.length,
      ...nested,
    },
  };
}

@Injectable()
export class PurgeLifecycleService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async prepare(
    dto: PreviewPurgeLifecycleDto,
    db: LifecycleDb = this.db,
  ): Promise<PurgeLifecyclePrepared> {
    const snapshot = await collectPurgeLifecycleSnapshot(db, dto);
    const plan = planPurgeLifecycle(snapshot);
    const manifest = buildAdminLifecycleManifest({
      action: dto.targetType === 'CLASS' ? 'PURGE_CLASS' : 'PURGE_SECTION',
      targetType: dto.targetType.toLowerCase(),
      targetId: dto.targetId,
      request: { ...dto },
      academicState: {
        schoolYear: 'not-applicable',
        period: 'not-applicable',
        version: 0,
      },
      dependencyVersions: [
        {
          entityType: dto.targetType.toLowerCase(),
          entityId: dto.targetId,
          version: snapshot.version,
        },
      ],
      effects: plan.effects,
      preserved: plan.preserved,
      evidence: classifyLifecycleEvidence(snapshot.evidence).counts,
      blockers: plan.blockers,
      warnings: plan.warnings,
      requiredConfirmations: plan.requiredConfirmations,
    });
    return { snapshot, plan, manifest };
  }

  async apply(
    dto: PreviewPurgeLifecycleDto,
    prepared: PurgeLifecyclePrepared,
    _context: LifecycleExecutionContext,
  ) {
    if (dto.targetType === 'CLASS') {
      await this.db.delete(classes).where(eq(classes.id, dto.targetId));
    } else {
      await this.db.delete(sections).where(eq(sections.id, dto.targetId));
    }
    return {
      changed: [
        {
          entityType: dto.targetType.toLowerCase(),
          entityId: dto.targetId,
          outcome: 'purged',
        },
      ],
      preserved: prepared.plan.preserved,
      affectedUserIds: prepared.plan.affectedUserIds,
    };
  }
}

import { assessmentAcademicCapabilities } from '../academic-state/assessment-academic-capabilities';
import { preserveLegacyGradeEvidence } from '../academic-state/academic-legacy-evidence';
import { captureObservedPeriodParticipants } from '../academic-state/academic-roster-observation';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { AcademicMutation } from '../../database/academic-transaction';
import { ClassRecordReadinessService } from './class-record-readiness.service';
import { ClassRecordRosterService } from './class-record-roster.service';
import { AnnualGradesService } from '../academic-state/annual-grades.service';
import {
  getSubjectWeights,
  normalizeSubjectCode,
} from '../academic-state/academic-policy';
import {
  classRecords,
  classRecordParticipants,
  academicPeriodGradeRevisions,
  academicLegacyGradeEvidence,
  classRecordCategories,
  classRecordItems,
  classRecordScores,
  classRecordFinalGrades,
  classes,
  sections,
  enrollments,
  users,
} from '../../drizzle/schema';
import { ClassRecordComputationService } from './class-record-computation.service';
import { ClassRecordSyncService } from './class-record-sync.service';
import { ClassRecordScoresUpdatedEvent } from '../../common/events';
import { CreateClassRecordDto } from './DTO/create-class-record.dto';
import { RecordScoreDto } from './DTO/record-score.dto';
import { BulkRecordScoresDto } from './DTO/bulk-record-scores.dto';
import { UpdateClassRecordItemDto } from './DTO/update-class-record-item.dto';
import { AuditService } from '../audit/audit.service';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import { calculateStudentRecord } from './class-record-calculation';
import { calculateBoundedScore } from '../academic-state/academic-score';

/** DepEd default category configuration and fallback profile */
const DEFAULT_DEPED_PROFILE = {
  writtenWork: 30,
  performanceTask: 50,
  quarterlyAssessment: 20,
} as const;

const DEFAULT_CATEGORIES = [
  { name: 'Written Works', prefix: 'WW', slots: 10 },
  { name: 'Performance Tasks', prefix: 'PT', slots: 10 },
  { name: 'Quarterly Assessment', prefix: 'QA', slots: 1 },
] as const;

const CATEGORY_NAME_TO_KEY = {
  'Written Works': 'written_work',
  'Performance Tasks': 'performance_task',
  'Quarterly Assessment': 'quarterly_assessment',
} as const;

function getDefaultItemTitle(categoryName: string, itemOrder: number) {
  const category = DEFAULT_CATEGORIES.find(
    (entry) => entry.name === categoryName,
  );
  return `${category?.prefix ?? 'ITEM'}${itemOrder}`;
}

@Injectable()
export class ClassRecordService {
  private readonly logger = new Logger(ClassRecordService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly computationService: ClassRecordComputationService,
    private readonly syncService: ClassRecordSyncService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly academicPolicyService: AcademicPolicyService,
    private readonly readinessService: ClassRecordReadinessService,
    private readonly rosterService: ClassRecordRosterService,
    private readonly annualGradesService: AnnualGradesService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private isAdmin(roles: string[]): boolean {
    return roles.includes('admin');
  }

  private async assertClassOwnership(
    classId: string,
    userId: string,
    roles: string[],
  ) {
    if (this.isAdmin(roles)) {
      return;
    }

    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, teacherId: true },
    });

    if (!cls) {
      throw new NotFoundException(`Class "${classId}" not found`);
    }

    if (cls.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async assertClassRecord(
    classRecordId: string,
    userId: string,
    roles: string[],
    requireOwnership = true,
  ) {
    const record = await this.db.query.classRecords.findFirst({
      where: eq(classRecords.id, classRecordId),
    });

    if (!record) {
      throw new NotFoundException(`Class record "${classRecordId}" not found`);
    }

    if (requireOwnership) {
      await this.assertClassOwnership(record.classId, userId, roles);
    }

    return record;
  }

  private assertEditable(record: { status: string }, allowFinalized = false) {
    if (record.status === 'locked') {
      throw new ConflictException(
        'This class record is locked and cannot be edited',
      );
    }
    if (!allowFinalized && record.status === 'finalized') {
      throw new ConflictException('This class record is already finalized');
    }
  }

  // ── Auto-Generation ──────────────────────────────────────────────────────

  /**
   * Generate a DepEd-standard class record for a class + grading period.
   * Auto-creates 3 fixed categories (WW 30%, PT 50%, QA 20%) with
   * pre-allocated item slots (10 for WW, 10 for PT, 1 for QA).
   */
  @AcademicMutation()
  async generateClassRecord(
    dto: CreateClassRecordDto,
    userId: string,
    roles: string[],
  ) {
    await this.academicPolicyService.assertAssessmentAction(
      { classId: dto.classId, quarter: dto.gradingPeriod },
      'prepare',
    );
    const { cls, policy } = await this.academicPolicyService.forClass(
      dto.classId,
    );
    const policyWeights = getSubjectWeights(
      policy,
      cls.subjectCode,
      cls.subjectName,
      cls.academicWeightProfile,
    );
    if (policy.gradeMethod !== 'legacy_transmutation' && !policyWeights)
      throw new BadRequestException(
        'Admin must classify this subject grading profile before generating a workbook',
      );

    if (!this.isAdmin(roles) && cls.teacherId !== userId) {
      throw new ForbiddenException(
        'Access denied: you are not the teacher of this class',
      );
    }

    // Check uniqueness
    const existing = await this.db.query.classRecords.findFirst({
      where: and(
        eq(classRecords.classId, dto.classId),
        eq(classRecords.gradingPeriod, dto.gradingPeriod),
      ),
    });

    if (existing) {
      throw new ConflictException(
        `A class record for ${dto.gradingPeriod} already exists for this class`,
      );
    }

    // Create the class record
    const [record] = await this.db
      .insert(classRecords)
      .values({
        classId: dto.classId,
        teacherId: cls.teacherId,
        gradingPeriod: dto.gradingPeriod,
        status: 'draft',
      })
      .returning();

    const currentState = await this.academicPolicyService.currentState();
    if (
      cls.schoolYear === currentState.schoolYear &&
      dto.gradingPeriod === currentState.quarter
    )
      await captureObservedPeriodParticipants(this.db, {
        schoolYear: cls.schoolYear,
        period: dto.gradingPeriod,
        actorId: userId,
        source: 'record_creation',
        classRecordId: record.id,
      });

    const gradingProfile = {
      writtenWork: Number(
        policyWeights?.writtenWork ??
          cls.writtenWorkGradingWeight ??
          DEFAULT_DEPED_PROFILE.writtenWork,
      ),
      performanceTask: Number(
        policyWeights?.performanceTask ??
          cls.performanceTaskGradingWeight ??
          DEFAULT_DEPED_PROFILE.performanceTask,
      ),
      quarterlyAssessment: Number(
        policyWeights?.examination ??
          cls.quarterlyAssessmentGradingWeight ??
          DEFAULT_DEPED_PROFILE.quarterlyAssessment,
      ),
    };

    const effectiveCategories = [
      {
        name: 'Written Works',
        prefix: 'WW',
        slots: 10,
        weight: Number.isFinite(gradingProfile.writtenWork)
          ? gradingProfile.writtenWork
          : DEFAULT_DEPED_PROFILE.writtenWork,
      },
      {
        name: 'Performance Tasks',
        prefix: 'PT',
        slots: 10,
        weight: Number.isFinite(gradingProfile.performanceTask)
          ? gradingProfile.performanceTask
          : DEFAULT_DEPED_PROFILE.performanceTask,
      },
      {
        name: 'Quarterly Assessment',
        prefix: 'QA',
        slots: policy.examComponents.length || 1,
        weight: Number.isFinite(gradingProfile.quarterlyAssessment)
          ? gradingProfile.quarterlyAssessment
          : DEFAULT_DEPED_PROFILE.quarterlyAssessment,
      },
    ];

    for (const cat of effectiveCategories) {
      const [category] = await this.db
        .insert(classRecordCategories)
        .values({
          classRecordId: record.id,
          name: cat.name,
          weightPercentage: `${cat.weight.toFixed(2)}`,
        })
        .returning();

      // Pre-create empty item slots
      const itemValues = Array.from({ length: cat.slots }, (_, i) => ({
        classRecordId: record.id,
        categoryId: category.id,
        title:
          cat.prefix === 'QA' && policy.examComponents.length
            ? policy.examComponents[i].key
            : `${cat.prefix}${i + 1}`,
        examComponent:
          cat.prefix === 'QA' && policy.examComponents.length
            ? policy.examComponents[i].key
            : null,
        maxScore: '0',
        itemOrder: i + 1,
      }));

      await this.db.insert(classRecordItems).values(itemValues);
    }

    this.logger.log(
      `Generated class record for class "${dto.classId}", period ${dto.gradingPeriod}`,
    );

    await this.auditService.log({
      actorId: userId,
      action: 'class_record.generated',
      targetType: 'class_record',
      targetId: record.id,
      metadata: {
        classId: dto.classId,
        gradingPeriod: dto.gradingPeriod,
        categoryCount: DEFAULT_CATEGORIES.length,
      },
    });

    return this.getClassRecord(record.id, userId, roles);
  }

  /** Keep observed membership before removable enrollment rows disappear; do not infer earlier periods. */
  @AcademicMutation()
  async captureClassEnrollment(
    classId: string,
    studentIds: string[],
    event: 'joined' | 'left',
    actorId: string,
    roles: string[],
  ) {
    await this.assertClassOwnership(classId, actorId, roles);
    const { cls, policy } = await this.academicPolicyService.forClass(classId);
    const state = await this.academicPolicyService.currentState();
    const period =
      cls.schoolYear === state.schoolYear
        ? state.quarter
        : policy.periods[0].key;
    await this.academicPolicyService.assertAssessmentAction(
      { classId, quarter: period },
      'prepare',
    );
    let current = await this.db.query.classRecords.findFirst({
      where: and(
        eq(classRecords.classId, classId),
        eq(classRecords.gradingPeriod, period),
      ),
    });
    if (!current)
      current = await this.generateClassRecord(
        { classId, gradingPeriod: period },
        actorId,
        roles,
      );
    this.assertEditable(current);
    const records = await this.db.query.classRecords.findMany({
      where: eq(classRecords.classId, classId),
    });
    const affected = records.filter(
      (record) =>
        policy.periods.findIndex((p) => p.key === record.gradingPeriod) >=
        policy.periods.findIndex((p) => p.key === period),
    );
    for (const record of affected) {
      this.assertEditable(record);
      if (record.gradingPeriod === period || event === 'joined') {
        for (const studentId of [...new Set(studentIds)]) {
          await this.db
            .insert(classRecordParticipants)
            .values({
              classRecordId: record.id,
              studentId,
              eligibility: 'eligible',
              source: `enrollment_${event}`,
              reason: `Class enrollment ${event} during ${period}; teacher confirmation required`,
              updatedBy: actorId,
            })
            .onConflictDoNothing();
        }
      }
      await this.db
        .update(classRecords)
        .set({
          rosterConfirmedAt: null,
          rosterConfirmedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(classRecords.id, record.id));
    }
    await this.auditService.log({
      actorId,
      action: `class_record.enrollment.${event}`,
      targetType: 'class_record',
      targetId: current.id,
      metadata: {
        classId,
        schoolYear: cls.schoolYear,
        period,
        studentIds,
        affectedRecordIds: affected.map((record) => record.id),
      },
    });
  }

  // ── Class Record CRUD ────────────────────────────────────────────────────

  async getClassRecord(id: string, userId: string, roles: string[]) {
    const record = await this.db.query.classRecords.findFirst({
      where: eq(classRecords.id, id),
      with: {
        categories: {
          with: {
            items: {
              with: { scores: true },
              orderBy: (i, { asc }) => [asc(i.itemOrder)],
            },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Class record "${id}" not found`);
    }

    await this.assertClassOwnership(record.classId, userId, roles);

    return record;
  }

  async listForClass(classId: string, userId: string, roles: string[]) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { teacherId: true },
    });

    if (!cls) {
      throw new NotFoundException(`Class "${classId}" not found`);
    }

    if (!this.isAdmin(roles) && cls.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.db.query.classRecords.findMany({
      where: eq(classRecords.classId, classId),
      with: { categories: true },
      orderBy: (g, { asc }) => [asc(g.gradingPeriod)],
    });
  }

  async getSlotOverview(
    classId: string,
    gradingPeriod: CreateClassRecordDto['gradingPeriod'],
    userId: string,
    roles: string[],
    assessmentId?: string,
  ) {
    if (!gradingPeriod) {
      throw new BadRequestException('gradingPeriod is required');
    }

    const record = await this.db.query.classRecords.findFirst({
      where: and(
        eq(classRecords.classId, classId),
        eq(classRecords.gradingPeriod, gradingPeriod),
      ),
      with: {
        categories: {
          with: {
            items: {
              with: {
                assessment: {
                  columns: {
                    id: true,
                    title: true,
                  },
                },
                scores: {
                  columns: {
                    id: true,
                  },
                },
              },
              orderBy: (items, { asc }) => [asc(items.itemOrder)],
            },
          },
          orderBy: (categories, { asc }) => [asc(categories.createdAt)],
        },
      },
    });

    if (!record) {
      throw new NotFoundException(
        `No class record exists for ${gradingPeriod}. Create the workbook first.`,
      );
    }

    await this.assertClassOwnership(record.classId, userId, roles);

    return {
      classRecordId: record.id,
      gradingPeriod: record.gradingPeriod,
      status: record.status,
      categories: record.categories.map((category) => ({
        id: category.id,
        key:
          CATEGORY_NAME_TO_KEY[
            category.name as keyof typeof CATEGORY_NAME_TO_KEY
          ] ?? 'written_work',
        label: category.name,
        slots: category.items.map((item) => {
          const maxScore = parseFloat(item.maxScore);
          const scoreCount = item.scores.length;
          const status = item.assessmentId
            ? item.assessmentId === assessmentId
              ? 'linked_self'
              : 'linked_other'
            : scoreCount > 0 || maxScore > 0
              ? 'manual'
              : 'empty';

          return {
            itemId: item.id,
            title: item.title,
            order: item.itemOrder,
            maxScore,
            assessmentId: item.assessmentId ?? null,
            assessmentTitle: item.assessment?.title ?? null,
            scoreCount,
            status,
            isSelectable: status === 'empty' || status === 'linked_self',
          };
        }),
      })),
    };
  }

  // ── Spreadsheet Data Endpoint ────────────────────────────────────────────

  /**
   * Returns the full spreadsheet data for a class record.
   * Includes header info, student list (alphabetical), all items with HPS,
   * scores, and computed columns (Total, PS, WS, Initial Grade, Quarterly Grade).
   */
  async getSpreadsheet(classRecordId: string, userId: string, roles: string[]) {
    const record = await this.assertClassRecord(classRecordId, userId, roles);

    // Load class with section info for header
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, record.classId),
      with: {
        section: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
    });

    if (!cls) throw new NotFoundException('Class not found');

    // Load active class participants (alphabetical by lastName, firstName)
    const activeStudents = await this.db
      .select({
        studentId: enrollments.studentId,
        firstName: users.firstName,
        lastName: users.lastName,
        middleName: users.middleName,
        email: users.email,
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .where(
        and(
          eq(enrollments.classId, record.classId),
          eq(enrollments.status, 'enrolled'),
        ),
      )
      .orderBy(users.lastName, users.firstName);

    const historicalScoreRows = await this.db
      .select({ studentId: classRecordScores.studentId })
      .from(classRecordScores)
      .innerJoin(
        classRecordItems,
        eq(classRecordItems.id, classRecordScores.classRecordItemId),
      )
      .where(eq(classRecordItems.classRecordId, classRecordId));

    const historicalFinalRows = await this.db
      .select({
        studentId: classRecordFinalGrades.studentId,
        finalPercentage: classRecordFinalGrades.finalPercentage,
        remarks: classRecordFinalGrades.remarks,
      })
      .from(classRecordFinalGrades)
      .where(eq(classRecordFinalGrades.classRecordId, classRecordId));

    const periodParticipants =
      await this.db.query.classRecordParticipants.findMany({
        where: eq(classRecordParticipants.classRecordId, classRecordId),
      });
    const activeStudentIdSet = new Set(
      activeStudents.map((student) => student.studentId),
    );
    const removedStudentIds = [
      ...new Set(
        [
          ...periodParticipants.map((entry) => entry.studentId),
          ...historicalScoreRows.map((entry) => entry.studentId),
          ...historicalFinalRows.map((entry) => entry.studentId),
        ].filter((studentId) => !activeStudentIdSet.has(studentId)),
      ),
    ];

    const removedStudents =
      removedStudentIds.length > 0
        ? await this.db
            .select({
              studentId: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              middleName: users.middleName,
              email: users.email,
            })
            .from(users)
            .where(inArray(users.id, removedStudentIds))
            .orderBy(users.lastName, users.firstName)
        : [];

    const finalGradeByStudentId = new Map(
      historicalFinalRows.map((entry) => [
        entry.studentId,
        {
          finalPercentage: parseFloat(entry.finalPercentage),
          remarks: entry.remarks,
        },
      ]),
    );

    const participants = [
      ...activeStudents.map((student) => ({
        ...student,
        enrollmentState: 'active' as const,
      })),
      ...removedStudents.map((student) => ({
        ...student,
        enrollmentState: 'removed' as const,
      })),
    ];

    // Load categories + items + scores
    const categories = await this.db.query.classRecordCategories.findMany({
      where: eq(classRecordCategories.classRecordId, classRecordId),
      with: {
        items: {
          with: { scores: true },
          orderBy: (i, { asc }) => [asc(i.itemOrder)],
        },
      },
    });

    const { policy } = await this.academicPolicyService.forClass(
      record.classId,
    );
    const items = categories.flatMap((category) =>
      category.items.map((item) => ({ ...item, categoryId: category.id })),
    );
    const studentRows = participants.map((student) => {
      const calculation = calculateStudentRecord(
        student.studentId,
        policy,
        categories,
        items,
      );
      const snapshot = finalGradeByStudentId.get(student.studentId);
      const eligibility =
        periodParticipants.find((p) => p.studentId === student.studentId)
          ?.eligibility ?? null;
      const excluded = eligibility !== null && eligibility !== 'eligible';
      const official = record.status !== 'draft' && snapshot;
      return {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        email: student.email ?? undefined,
        eligibility,
        eligibilityReason:
          periodParticipants.find((p) => p.studentId === student.studentId)
            ?.reason ?? null,
        isRemoved: student.enrollmentState === 'removed',
        enrollmentState: student.enrollmentState,
        categories: categories.map((category) => {
          const breakdown = calculation.categoryBreakdown.find(
            (c) => c.categoryId === category.id,
          )!;
          const scoreRows = category.items.map((item) =>
            item.scores.find((score) => score.studentId === student.studentId),
          );
          return {
            categoryId: category.id,
            scores: scoreRows.map((row) =>
              row?.score == null ? null : Number(row.score),
            ),
            bonusPoints: scoreRows.map((row) => Number(row?.bonusPoints ?? 0)),
            bonusReasons: scoreRows.map((row) => row?.bonusReason ?? null),
            effectiveScores: scoreRows.map((row, index) => {
              if (row?.score == null || row.status === 'excused') return null;
              return calculateBoundedScore({
                basePoints: Number(row.score),
                bonusPoints: Number(row.bonusPoints ?? 0),
                bonusReason: row.bonusReason,
                possiblePoints: Number(category.items[index].maxScore),
              }).effectivePoints;
            }),
            scorePercents: scoreRows.map((row, index) => {
              if (row?.score == null || row.status === 'excused') return null;
              return calculateBoundedScore({
                basePoints: Number(row.score),
                bonusPoints: Number(row.bonusPoints ?? 0),
                bonusReason: row.bonusReason,
                possiblePoints: Number(category.items[index].maxScore),
              }).scorePercent;
            }),
            scoreStatuses: scoreRows.map((row) => row?.status ?? 'missing'),
            scoreReasons: scoreRows.map((row) => row?.reason ?? null),
            total: breakdown.totalRaw,
            ps: breakdown.percentageScore,
            ws: breakdown.weightedScore,
          };
        }),
        initialGrade: excluded ? null : calculation.initialGrade,
        quarterlyGrade: official
          ? snapshot.finalPercentage
          : excluded
            ? null
            : calculation.quarterlyGrade,
        remarks: official
          ? snapshot.remarks
          : excluded
            ? 'Not graded'
            : calculation.remarks,
        provisional: !official,
        gradeProvenance: official
          ? record.revision > 0
            ? 'verified_revision'
            : 'legacy_unverified'
          : 'provisional',
        blockers: excluded ? [] : calculation.blockers,
      };
    });

    const current = await this.academicPolicyService.currentState();
    const academicCapabilities = assessmentAcademicCapabilities({
      policy,
      schoolYear: cls.schoolYear,
      activeSchoolYear: current.schoolYear,
      quarter: record.gradingPeriod,
      activeQuarter: current.quarter,
      classActive: cls.isActive,
      workbookStatus: record.status,
      published: false,
    });
    return {
      classRecord: {
        id: record.id,
        classId: record.classId,
        gradingPeriod: record.gradingPeriod,
        status: record.status,
        revision: record.revision,
        rosterConfirmedAt: record.rosterConfirmedAt,
      },
      policy,
      academicCapabilities,
      canReopen:
        record.status === 'finalized' &&
        cls.isActive &&
        cls.schoolYear === current.schoolYear &&
        policy.periods.some((p) => p.key === record.gradingPeriod) &&
        policy.periods.findIndex((p) => p.key === record.gradingPeriod) <=
          policy.periods.findIndex((p) => p.key === current.quarter),
      header: {
        schoolYear: cls?.schoolYear,
        periodLabel:
          policy.periods.find((period) => period.key === record.gradingPeriod)
            ?.label ?? record.gradingPeriod,
        quarter: record.gradingPeriod as string,
        gradeLevel: cls?.section?.gradeLevel ?? undefined,
        section: cls?.section?.name ?? undefined,
        subject: cls?.subjectName ?? undefined,
        teacher: cls?.teacher
          ? `${cls.teacher.lastName}, ${cls.teacher.firstName}${cls.teacher.middleName ? ` ${cls.teacher.middleName.charAt(0)}.` : ''}`
          : undefined,
      },
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        weight: parseFloat(c.weightPercentage),
        items: c.items.map((item) => ({
          id: item.id,
          title: item.title,
          hps: parseFloat(item.maxScore),
          assessmentId: item.assessmentId ?? undefined,
          order: item.itemOrder,
          examComponent: item.examComponent,
        })),
      })),
      students: studentRows,
    };
  }

  // ── Scores ────────────────────────────────────────────────────────────────

  @AcademicMutation()
  async updateClassRecordItem(
    itemId: string,
    dto: UpdateClassRecordItemDto,
    userId: string,
    roles: string[],
  ) {
    const item = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.id, itemId),
      with: {
        classRecord: true,
        category: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Class record item "${itemId}" not found`);
    }

    await this.assertClassOwnership(item.classRecord.classId, userId, roles);

    this.assertEditable(item.classRecord);
    await this.academicPolicyService.assertAssessmentAction(
      {
        classId: item.classRecord.classId,
        quarter: item.classRecord.gradingPeriod,
      },
      'prepare',
    );

    if (item.assessmentId) {
      throw new BadRequestException(
        'Linked assessment slots must be updated from assessment settings',
      );
    }

    const existingScores = await this.db.query.classRecordScores.findMany({
      where: eq(classRecordScores.classRecordItemId, itemId),
    });
    if (
      existingScores.some(
        (score) => score.score !== null && Number(score.score) > dto.maxScore,
      )
    )
      throw new BadRequestException(
        'Highest possible score cannot be lower than an existing recorded score',
      );
    const [updated] = await this.db
      .update(classRecordItems)
      .set({
        maxScore: dto.maxScore.toString(),
        title:
          item.examComponent ??
          getDefaultItemTitle(item.category.name, item.itemOrder),
      })
      .where(eq(classRecordItems.id, itemId))
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: 'class_record.item.updated',
      targetType: 'class_record_item',
      targetId: itemId,
      metadata: {
        classRecordId: item.classRecord.id,
        classId: item.classRecord.classId,
        maxScore: dto.maxScore,
      },
    });

    return updated;
  }

  @AcademicMutation()
  async recordScore(
    itemId: string,
    dto: RecordScoreDto,
    userId: string,
    roles: string[],
  ) {
    const result = await this.bulkRecordScores(
      itemId,
      { scores: [dto] },
      userId,
      roles,
      'manual_single',
    );
    return result.scores[0];
  }

  @AcademicMutation()
  async bulkRecordScores(
    itemId: string,
    dto: BulkRecordScoresDto,
    userId: string,
    roles: string[],
    triggerSource: 'manual_single' | 'manual_bulk' = 'manual_bulk',
  ) {
    const item = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.id, itemId),
      with: { classRecord: true },
    });
    if (!item) throw new NotFoundException('Class record item not found');
    await this.assertClassOwnership(item.classRecord.classId, userId, roles);
    this.assertEditable(item.classRecord);
    await this.academicPolicyService.assertAssessmentAction(
      {
        classId: item.classRecord.classId,
        quarter: item.classRecord.gradingPeriod,
      },
      'grade',
    );
    await this.rosterService.assertEligible(
      item.classRecord.id,
      dto.scores.map((s) => s.studentId),
    );
    const maxScore = Number(item.maxScore);
    if (maxScore <= 0)
      throw new BadRequestException(
        'Set highest possible score first before recording student scores',
      );
    if (
      !dto.scores.length ||
      new Set(dto.scores.map((s) => s.studentId)).size !== dto.scores.length
    )
      throw new BadRequestException('Provide one score per student');
    const values = dto.scores.map((entry) => {
      const status = entry.status ?? 'recorded';
      if (status === 'excused') {
        if (
          entry.score != null ||
          (entry.bonusPoints ?? 0) !== 0 ||
          !entry.reason?.trim()
        )
          throw new BadRequestException(
            'Excused items require a reason and no score or bonus points',
          );
      } else if (
        status !== 'recorded' ||
        entry.score == null ||
        !Number.isFinite(entry.score) ||
        entry.score < 0 ||
        entry.score > maxScore
      ) {
        throw new BadRequestException(
          `Recorded score must be between 0 and max score of ${maxScore}`,
        );
      }
      if (item.assessmentId && status === 'recorded')
        throw new BadRequestException(
          'Grade linked assessments in assessment grading, then synchronize the result',
        );
      if (status === 'recorded') {
        try {
          calculateBoundedScore({
            basePoints: entry.score!,
            bonusPoints: entry.bonusPoints,
            bonusReason: entry.bonusReason,
            possiblePoints: maxScore,
          });
        } catch (error) {
          throw new BadRequestException(
            error instanceof Error
              ? error.message
              : 'Score adjustment is invalid',
          );
        }
      }
      return {
        classRecordItemId: itemId,
        studentId: entry.studentId,
        score: status === 'excused' ? null : String(entry.score),
        bonusPoints:
          status === 'excused' ? '0' : String(entry.bonusPoints ?? 0),
        bonusReason:
          status === 'excused' ? null : entry.bonusReason?.trim() || null,
        status,
        reason: entry.reason?.trim() || null,
        sourceAttemptId: null,
        updatedAt: new Date(),
      };
    });
    const results = await this.db
      .insert(classRecordScores)
      .values(values)
      .onConflictDoUpdate({
        target: [
          classRecordScores.classRecordItemId,
          classRecordScores.studentId,
        ],
        set: {
          score: sql`excluded.score`,
          bonusPoints: sql`excluded.bonus_points`,
          bonusReason: sql`excluded.bonus_reason`,
          status: sql`excluded.status`,
          reason: sql`excluded.reason`,
          sourceAttemptId: null,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning();
    await this.auditService.log({
      actorId: userId,
      action: 'class_record.scores.bulk_recorded',
      targetType: 'class_record_item',
      targetId: itemId,
      metadata: {
        classRecordId: item.classRecord.id,
        classId: item.classRecord.classId,
        scores: values,
      },
    });
    await this.databaseService.afterAcademicCommit(() => {
      this.eventEmitter.emit(
        ClassRecordScoresUpdatedEvent.eventName,
        new ClassRecordScoresUpdatedEvent({
          classId: item.classRecord.classId,
          studentIds: values.map((v) => v.studentId),
          triggerSource,
        }),
      );
    });
    return { saved: results.length, scores: results };
  }

  @AcademicMutation()
  async syncScoresFromAssessment(
    itemId: string,
    userId: string,
    roles: string[],
  ) {
    const item = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.id, itemId),
      with: { classRecord: true },
    });

    if (!item) {
      throw new NotFoundException(`Class record item "${itemId}" not found`);
    }

    await this.assertClassOwnership(item.classRecord.classId, userId, roles);

    const result = await this.syncService.syncFromAssessment(
      itemId,
      userId,
      roles,
    );

    await this.auditService.log({
      actorId: userId,
      action: 'class_record.scores.synced_assessment',
      targetType: 'class_record_item',
      targetId: itemId,
      metadata: {
        classRecordId: item.classRecord.id,
        classId: item.classRecord.classId,
        assessmentId: item.assessmentId,
        synced: result.synced,
      },
    });

    return result;
  }

  @AcademicMutation()
  async restoreAssessmentEvidence(
    itemId: string,
    studentId: string,
    reason: string,
    userId: string,
    roles: string[],
  ) {
    const item = await this.db.query.classRecordItems.findFirst({
      where: eq(classRecordItems.id, itemId),
      with: { classRecord: true },
    });
    if (!item) throw new NotFoundException('Class record item not found');
    await this.assertClassOwnership(item.classRecord.classId, userId, roles);
    this.assertEditable(item.classRecord);
    await this.academicPolicyService.assertAssessmentAction(
      {
        classId: item.classRecord.classId,
        quarter: item.classRecord.gradingPeriod,
      },
      'grade',
    );
    await this.rosterService.assertEligible(item.classRecord.id, [studentId]);
    if (!item.assessmentId || !reason.trim())
      throw new BadRequestException(
        'A linked assessment and correction reason are required',
      );
    const previous = await this.db.query.classRecordScores.findFirst({
      where: and(
        eq(classRecordScores.classRecordItemId, itemId),
        eq(classRecordScores.studentId, studentId),
      ),
    });
    if (previous?.status !== 'excused')
      throw new BadRequestException(
        'Only an excused assessment score can be restored',
      );
    await this.db
      .delete(classRecordScores)
      .where(eq(classRecordScores.id, previous.id));
    const result = await this.syncScoresFromAssessment(itemId, userId, roles);
    await this.auditService.log({
      actorId: userId,
      action: 'class_record.exemption.restored_assessment',
      targetType: 'class_record_item',
      targetId: itemId,
      metadata: {
        classRecordId: item.classRecord.id,
        studentId,
        reason: reason.trim(),
        previous,
        synced: result.synced,
      },
    });
    await this.databaseService.afterAcademicCommit(() => {
      this.eventEmitter.emit(
        ClassRecordScoresUpdatedEvent.eventName,
        new ClassRecordScoresUpdatedEvent({
          classId: item.classRecord.classId,
          studentIds: [studentId],
          triggerSource: 'manual_sync',
        }),
      );
    });
    return { restored: true, synced: result.synced };
  }

  // ── Grade Preview & Finalization ──────────────────────────────────────────

  async previewGrades(classRecordId: string, userId: string, roles: string[]) {
    await this.assertClassRecord(classRecordId, userId, roles);
    const readiness = await this.readinessService.getReadiness(classRecordId);
    const results = await this.computationService.computeGrades(
      classRecordId,
      undefined,
      readiness.eligibleStudentIds,
    );
    return {
      classRecordId,
      readiness,
      preview: [...results.values()],
      interventionCount: [...results.values()].filter(
        (r) => r.remarks === 'For Intervention',
      ).length,
    };
  }

  async getReadiness(classRecordId: string, userId: string, roles: string[]) {
    await this.assertClassRecord(classRecordId, userId, roles);
    return this.readinessService.getReadiness(classRecordId);
  }

  /** Internal canonical grade projection shared by standing and performance. */
  async getCanonicalStudentStanding(classRecordId: string, studentId: string) {
    const record = await this.db.query.classRecords.findFirst({
      where: eq(classRecords.id, classRecordId),
    });
    if (!record) throw new NotFoundException('Class record not found');

    const [categories, finalGrade, { policy }] = await Promise.all([
      this.db.query.classRecordCategories.findMany({
        where: eq(classRecordCategories.classRecordId, classRecordId),
        with: { items: { with: { scores: true } } },
      }),
      this.db.query.classRecordFinalGrades.findFirst({
        where: and(
          eq(classRecordFinalGrades.classRecordId, classRecordId),
          eq(classRecordFinalGrades.studentId, studentId),
        ),
      }),
      this.academicPolicyService.forClass(record.classId),
    ]);
    const calculation = calculateStudentRecord(
      studentId,
      policy,
      categories,
      categories.flatMap((category) => category.items),
    );
    const official = record.status !== 'draft' && finalGrade;

    return {
      classRecordId,
      classId: record.classId,
      gradingPeriod: record.gradingPeriod,
      status: record.status,
      complete: calculation.blockers.length === 0,
      official: Boolean(official),
      overallGradePercent: official
        ? Number(finalGrade.finalPercentage)
        : calculation.quarterlyGrade,
      initialGradePercent: calculation.initialGrade,
      categoryBreakdown: calculation.categoryBreakdown,
      blockers: calculation.blockers,
    };
  }

  @AcademicMutation()
  async finalizeClassRecord(
    classRecordId: string,
    userId: string,
    roles: string[],
  ) {
    const record = await this.assertClassRecord(classRecordId, userId, roles);
    this.assertEditable(record);
    const readiness = await this.readinessService.getReadiness(classRecordId);
    if (!readiness.ready)
      throw new UnprocessableEntityException({
        message: 'Class record is incomplete; resolve the listed blockers',
        ...readiness,
      });
    const { policy, cls } = await this.academicPolicyService.forClass(
      record.classId,
    );
    const gradeLevel = cls.subjectGradeLevel ?? cls.section?.gradeLevel;
    if (!gradeLevel || !['7', '8', '9', '10'].includes(gradeLevel))
      throw new BadRequestException('Class grade level must be 7 to 10');
    const participants = await this.db.query.classRecordParticipants.findMany({
      where: eq(classRecordParticipants.classRecordId, classRecordId),
    });
    const categories = await this.db.query.classRecordCategories.findMany({
      where: eq(classRecordCategories.classRecordId, classRecordId),
      with: { items: { with: { scores: true } } },
    });
    const items = categories.flatMap((category) => category.items);
    const revision = record.revision + 1;
    const grades = readiness.eligibleStudentIds.map((studentId) =>
      calculateStudentRecord(studentId, policy, categories, items),
    );
    // This compatibility projection is replaceable; immutable revisions below are the source of truth.
    await preserveLegacyGradeEvidence(this.db, classRecordId);
    await this.db
      .delete(classRecordFinalGrades)
      .where(eq(classRecordFinalGrades.classRecordId, classRecordId));
    if (grades.length) {
      await this.db.insert(academicPeriodGradeRevisions).values(
        grades.map((grade) => ({
          classRecordId,
          classId: record.classId,
          studentId: grade.studentId,
          schoolYear: cls.schoolYear,
          subjectCode: normalizeSubjectCode(cls.subjectCode),
          gradeLevel,
          period: record.gradingPeriod,
          revision,
          grade: grade.quarterlyGrade!,
          computedBy: userId,
          evidence: {
            policy,
            initialGrade: grade.initialGrade,
            categories: categories.map((category) => ({
              ...category,
              items: category.items.map((item) => ({
                ...item,
                scores: item.scores.filter(
                  (s) => s.studentId === grade.studentId,
                ),
              })),
            })),
            participant: participants.find(
              (p) => p.studentId === grade.studentId,
            )!,
          },
        })),
      );
      await this.db.insert(classRecordFinalGrades).values(
        grades.map((grade) => ({
          classRecordId,
          studentId: grade.studentId,
          finalPercentage: String(grade.quarterlyGrade),
          remarks:
            grade.quarterlyGrade! < policy.passingGrade
              ? ('For Intervention' as const)
              : ('Passed' as const),
          revision,
          computedAt: new Date(),
        })),
      );
    }
    const [updated] = await this.db
      .update(classRecords)
      .set({ status: 'finalized', revision, updatedAt: new Date() })
      .where(eq(classRecords.id, classRecordId))
      .returning();
    const annual = await this.annualGradesService.refreshForClass(
      record.classId,
      userId,
    );
    await this.auditService.log({
      actorId: userId,
      action: 'class_record.finalized',
      targetType: 'class_record',
      targetId: classRecordId,
      metadata: {
        classId: record.classId,
        revision,
        gradeCount: grades.length,
        policyId: policy.id,
        eligibleStudentIds: readiness.eligibleStudentIds,
      },
    });
    return { classRecord: updated, gradeCount: grades.length, annual };
  }

  @AcademicMutation()
  async reopenClassRecord(
    classRecordId: string,
    userId: string,
    roles: string[],
    reason: string,
  ) {
    const record = await this.assertClassRecord(classRecordId, userId, roles);
    if (!reason?.trim())
      throw new BadRequestException('A correction reason is required');
    if (record.status !== 'finalized')
      throw new ConflictException(
        'Only finalized class records can be reopened; locked records cannot be reopened',
      );
    await this.academicPolicyService.assertAssessmentAction(
      { classId: record.classId, quarter: record.gradingPeriod },
      'grade',
    );
    await this.annualGradesService.invalidateRecordSources(
      classRecordId,
      userId,
      reason,
    );
    await preserveLegacyGradeEvidence(this.db, classRecordId);
    await this.db
      .delete(classRecordFinalGrades)
      .where(eq(classRecordFinalGrades.classRecordId, classRecordId));
    const [updated] = await this.db
      .update(classRecords)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(classRecords.id, classRecordId))
      .returning();
    await this.auditService.log({
      actorId: userId,
      action: 'class_record.reopened',
      targetType: 'class_record',
      targetId: classRecordId,
      metadata: {
        classId: record.classId,
        reason,
        revision: record.revision,
        previousStatus: record.status,
      },
    });
    return updated;
  }

  // ── Final Grade Reads ─────────────────────────────────────────────────────

  async getPeriodHistory(
    classRecordId: string,
    userId: string,
    roles: string[],
  ) {
    await this.assertClassRecord(classRecordId, userId, roles);
    const revisions = await this.db.query.academicPeriodGradeRevisions.findMany(
      {
        where: eq(academicPeriodGradeRevisions.classRecordId, classRecordId),
        orderBy: (r, { desc }) => [desc(r.revision), desc(r.computedAt)],
      },
    );
    const legacyEvidence =
      await this.db.query.academicLegacyGradeEvidence.findMany({
        where: eq(academicLegacyGradeEvidence.classRecordId, classRecordId),
      });
    return { revisions, legacyEvidence };
  }

  async getFinalGrades(classRecordId: string, userId: string, roles: string[]) {
    await this.assertClassRecord(classRecordId, userId, roles);

    return this.db.query.classRecordFinalGrades.findMany({
      where: eq(classRecordFinalGrades.classRecordId, classRecordId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
          },
        },
      },
      orderBy: (fg, { asc }) => [asc(fg.finalPercentage)],
    });
  }

  async getStudentGrade(
    classRecordId: string,
    studentId: string,
    userId: string,
    roles: string[],
  ) {
    const isAdmin = this.isAdmin(roles);
    const isTeacher = roles.includes('teacher');
    const isStudentSelf = userId === studentId;

    if (!isAdmin && !isTeacher && !isStudentSelf) {
      throw new ForbiddenException('Students may only view their own grade');
    }

    // Teachers can only view grades for class records they own.
    if (isAdmin || isTeacher) {
      await this.assertClassRecord(classRecordId, userId, roles);
    }

    const grade = await this.db.query.classRecordFinalGrades.findFirst({
      where: and(
        eq(classRecordFinalGrades.classRecordId, classRecordId),
        eq(classRecordFinalGrades.studentId, studentId),
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException(
        `No final grade found for student "${studentId}" in this class record`,
      );
    }

    return grade;
  }

  // ── Adviser Section View ──────────────────────────────────────────────────

  async listAdviserSection(
    sectionId: string,
    adviserId: string,
    roles: string[],
  ) {
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
      columns: { adviserId: true, name: true },
    });

    if (!section) {
      throw new NotFoundException(`Section "${sectionId}" not found`);
    }

    if (!this.isAdmin(roles) && section.adviserId !== adviserId) {
      throw new ForbiddenException(
        'Access denied: you are not the adviser for this section',
      );
    }

    const sectionClasses = await this.db.query.classes.findMany({
      where: eq(classes.sectionId, sectionId),
      columns: { id: true, subjectName: true, subjectCode: true },
    });

    if (sectionClasses.length === 0) return [];

    const classIds = sectionClasses.map((c) => c.id);

    const records = await this.db.query.classRecords.findMany({
      where: inArray(classRecords.classId, classIds),
      with: { finalGrades: true },
      orderBy: (g, { asc }) => [asc(g.gradingPeriod)],
    });
    const recordsByClassId = new Map(
      classIds.map((classId) => [classId, [] as typeof records]),
    );
    for (const record of records) {
      recordsByClassId.get(record.classId)?.push(record);
    }
    const results = classIds.map((classId) => ({
      classId,
      classRecords: recordsByClassId.get(classId) ?? [],
    }));

    return {
      sectionId,
      sectionName: section.name,
      classes: results,
    };
  }

  // ── Reports ──────────────────────────────────────────────────────────────

  async getClassAverage(
    classRecordId: string,
    userId: string,
    roles: string[],
  ) {
    await this.assertClassRecord(classRecordId, userId, roles);

    const grades = await this.db.query.classRecordFinalGrades.findMany({
      where: eq(classRecordFinalGrades.classRecordId, classRecordId),
      columns: { finalPercentage: true, remarks: true },
    });

    if (grades.length === 0) {
      return {
        classRecordId,
        average: 0,
        count: 0,
        interventionCount: 0,
      };
    }

    const avg =
      grades.reduce((sum, g) => sum + parseFloat(g.finalPercentage), 0) /
      grades.length;

    return {
      classRecordId,
      average: Math.round(avg * 1000) / 1000,
      count: grades.length,
      interventionCount: grades.filter((g) => g.remarks === 'For Intervention')
        .length,
    };
  }

  async getGradeDistribution(
    classRecordId: string,
    userId: string,
    roles: string[],
  ) {
    await this.assertClassRecord(classRecordId, userId, roles);

    const grades = await this.db.query.classRecordFinalGrades.findMany({
      where: eq(classRecordFinalGrades.classRecordId, classRecordId),
      columns: { finalPercentage: true },
    });

    const bands: Record<string, number> = {
      '90-100': 0,
      '80-89': 0,
      '75-79': 0,
      '65-74': 0,
      'Below 65': 0,
    };

    for (const g of grades) {
      const pct = parseFloat(g.finalPercentage);
      if (pct >= 90) bands['90-100']++;
      else if (pct >= 80) bands['80-89']++;
      else if (pct >= 75) bands['75-79']++;
      else if (pct >= 65) bands['65-74']++;
      else bands['Below 65']++;
    }

    return { classRecordId, distribution: bands, total: grades.length };
  }

  async getInterventionList(
    classRecordId: string,
    userId: string,
    roles: string[],
  ) {
    await this.assertClassRecord(classRecordId, userId, roles);

    return this.db.query.classRecordFinalGrades.findMany({
      where: and(
        eq(classRecordFinalGrades.classRecordId, classRecordId),
        eq(classRecordFinalGrades.remarks, 'For Intervention'),
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
          },
        },
      },
      orderBy: (fg, { asc }) => [asc(fg.finalPercentage)],
    });
  }
}

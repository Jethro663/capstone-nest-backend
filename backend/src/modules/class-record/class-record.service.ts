import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  classRecords,
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

/** DepEd default category configuration */
const DEPED_CATEGORIES = [
  { name: 'Written Works', weight: '30.00', prefix: 'WW', slots: 10 },
  { name: 'Performance Tasks', weight: '50.00', prefix: 'PT', slots: 10 },
  { name: 'Quarterly Assessment', weight: '20.00', prefix: 'QA', slots: 1 },
] as const;

const CATEGORY_NAME_TO_KEY = {
  'Written Works': 'written_work',
  'Performance Tasks': 'performance_task',
  'Quarterly Assessment': 'quarterly_assessment',
} as const;

function getDefaultItemTitle(categoryName: string, itemOrder: number) {
  const category = DEPED_CATEGORIES.find((entry) => entry.name === categoryName);
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
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private isAdmin(roles: string[]): boolean {
    return roles.includes('admin');
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

    if (
      requireOwnership &&
      !this.isAdmin(roles) &&
      record.teacherId !== userId
    ) {
      throw new ForbiddenException(
        'Access denied: you do not own this class record',
      );
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
  async generateClassRecord(
    dto: CreateClassRecordDto,
    userId: string,
    roles: string[],
  ) {
    // Verify class exists & teacher owns it
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, dto.classId),
      columns: { id: true, teacherId: true },
    });

    if (!cls) {
      throw new NotFoundException(`Class "${dto.classId}" not found`);
    }

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
        teacherId: userId,
        gradingPeriod: dto.gradingPeriod,
        status: 'draft',
      })
      .returning();

    // Create DepEd categories with pre-allocated item slots
    for (const cat of DEPED_CATEGORIES) {
      const [category] = await this.db
        .insert(classRecordCategories)
        .values({
          classRecordId: record.id,
          name: cat.name,
          weightPercentage: cat.weight,
        })
        .returning();

      // Pre-create empty item slots
      const itemValues = Array.from({ length: cat.slots }, (_, i) => ({
        classRecordId: record.id,
        categoryId: category.id,
        title: `${cat.prefix}${i + 1}`,
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
        categoryCount: DEPED_CATEGORIES.length,
      },
    });

    return this.getClassRecord(record.id, userId, roles);
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

    if (!this.isAdmin(roles) && record.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

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

    if (!this.isAdmin(roles) && record.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

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

    const activeStudentIdSet = new Set(
      activeStudents.map((student) => student.studentId),
    );
    const removedStudentIds = [
      ...new Set(
        [
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

    // Build spreadsheet data per student
    const studentRows = participants.map((student) => {
      const categoryData = categories.map((category) => {
        const weight = parseFloat(category.weightPercentage);
        const items = category.items;

        let totalRaw = 0;
        let totalHPS = 0;

        const itemScores = items.map((item) => {
          const maxScore = parseFloat(item.maxScore);
          const scoreRecord = item.scores.find(
            (s) => s.studentId === student.studentId,
          );
          const score = scoreRecord ? parseFloat(scoreRecord.score) : null;

          if (maxScore > 0) {
            totalHPS += maxScore;
            totalRaw += score ?? 0;
          }

          return {
            itemId: item.id,
            score,
          };
        });

        const percentageScore = totalHPS > 0 ? (totalRaw / totalHPS) * 100 : 0;
        const weightedScore = percentageScore * (weight / 100);

        return {
          categoryId: category.id,
          scores: itemScores.map((s) => s.score),
          total: Math.round(totalRaw * 100) / 100,
          ps: Math.round(percentageScore * 1000) / 1000,
          ws: Math.round(weightedScore * 1000) / 1000,
        };
      });

      const initialGrade = categoryData.reduce((sum, c) => sum + c.ws, 0);
      const computedQuarterlyGrade = this.computationService.transmute(initialGrade);
      const historicalFinal = finalGradeByStudentId.get(student.studentId);
      const hasHistoricalQuarterly =
        historicalFinal && Number.isFinite(historicalFinal.finalPercentage);
      const quarterlyGrade =
        student.enrollmentState === 'removed' && hasHistoricalQuarterly
          ? historicalFinal.finalPercentage
          : computedQuarterlyGrade;
      const remarks =
        student.enrollmentState === 'removed' && hasHistoricalQuarterly
          ? historicalFinal.remarks
          : quarterlyGrade < 75
            ? ('For Intervention' as const)
            : ('Passed' as const);

      return {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        email: student.email ?? undefined,
        isRemoved: student.enrollmentState === 'removed',
        enrollmentState: student.enrollmentState,
        categories: categoryData,
        initialGrade: Math.round(initialGrade * 1000) / 1000,
        quarterlyGrade,
        remarks,
      };
    });

    return {
      classRecord: {
        id: record.id,
        gradingPeriod: record.gradingPeriod,
        status: record.status,
      },
      header: {
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
        })),
      })),
      students: studentRows,
    };
  }

  // ── Scores ────────────────────────────────────────────────────────────────

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

    if (!this.isAdmin(roles) && item.classRecord.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(item.classRecord);

    if (item.assessmentId) {
      throw new BadRequestException(
        'Linked assessment slots must be updated from assessment settings',
      );
    }

    const [updated] = await this.db
      .update(classRecordItems)
      .set({
        maxScore: dto.maxScore.toString(),
        title: getDefaultItemTitle(item.category.name, item.itemOrder),
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

  async recordScore(
    itemId: string,
    dto: RecordScoreDto,
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

    if (!this.isAdmin(roles) && item.classRecord.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(item.classRecord);

    const maxScore = parseFloat(item.maxScore);
    if (maxScore <= 0) {
      throw new BadRequestException(
        'Set highest possible score first before recording student scores',
      );
    }
    if (dto.score > maxScore) {
      throw new BadRequestException(
        `Score ${dto.score} exceeds max score of ${maxScore}`,
      );
    }

    const [score] = await this.db
      .insert(classRecordScores)
      .values({
        classRecordItemId: itemId,
        studentId: dto.studentId,
        score: dto.score.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          classRecordScores.classRecordItemId,
          classRecordScores.studentId,
        ],
        set: {
          score: dto.score.toString(),
          updatedAt: new Date(),
        },
      })
      .returning();

    this.eventEmitter.emit(
      ClassRecordScoresUpdatedEvent.eventName,
      new ClassRecordScoresUpdatedEvent({
        classId: item.classRecord.classId,
        studentIds: [dto.studentId],
        triggerSource: 'manual_single',
      }),
    );

    await this.auditService.log({
      actorId: userId,
      action: 'class_record.score.recorded',
      targetType: 'class_record_item',
      targetId: itemId,
      metadata: {
        studentId: dto.studentId,
        classRecordId: item.classRecord.id,
        classId: item.classRecord.classId,
        score: dto.score,
      },
    });

    return score;
  }

  async bulkRecordScores(
    itemId: string,
    dto: BulkRecordScoresDto,
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

    if (!this.isAdmin(roles) && item.classRecord.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(item.classRecord);

    const maxScore = parseFloat(item.maxScore);
    if (maxScore <= 0) {
      throw new BadRequestException(
        'Set highest possible score first before recording student scores',
      );
    }
    for (const entry of dto.scores) {
      if (entry.score > maxScore) {
        throw new BadRequestException(
          `Score ${entry.score} for student "${entry.studentId}" exceeds max score of ${maxScore}`,
        );
      }
    }

    const results = await Promise.all(
      dto.scores.map(async (entry) => {
        const [score] = await this.db
          .insert(classRecordScores)
          .values({
            classRecordItemId: itemId,
            studentId: entry.studentId,
            score: entry.score.toString(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              classRecordScores.classRecordItemId,
              classRecordScores.studentId,
            ],
            set: {
              score: entry.score.toString(),
              updatedAt: new Date(),
            },
          })
          .returning();
        return score;
      }),
    );

    this.eventEmitter.emit(
      ClassRecordScoresUpdatedEvent.eventName,
      new ClassRecordScoresUpdatedEvent({
        classId: item.classRecord.classId,
        studentIds: [...new Set(dto.scores.map((entry) => entry.studentId))],
        triggerSource: 'manual_bulk',
      }),
    );

    await this.auditService.log({
      actorId: userId,
      action: 'class_record.scores.bulk_recorded',
      targetType: 'class_record_item',
      targetId: itemId,
      metadata: {
        classRecordId: item.classRecord.id,
        classId: item.classRecord.classId,
        studentIds: [...new Set(dto.scores.map((entry) => entry.studentId))],
        saved: results.length,
      },
    });

    return { saved: results.length, scores: results };
  }

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

    if (!this.isAdmin(roles) && item.classRecord.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const result = await this.syncService.syncFromAssessment(itemId, userId);

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

  // ── Grade Preview & Finalization ──────────────────────────────────────────

  async previewGrades(classRecordId: string, userId: string, roles: string[]) {
    await this.assertClassRecord(classRecordId, userId, roles);
    const results = await this.computationService.computeGrades(classRecordId);
    return {
      classRecordId,
      preview: [...results.values()],
      interventionCount: [...results.values()].filter(
        (r) => r.remarks === 'For Intervention',
      ).length,
    };
  }

  async finalizeClassRecord(
    classRecordId: string,
    userId: string,
    roles: string[],
  ) {
    const record = await this.assertClassRecord(classRecordId, userId, roles);

    if (record.status === 'locked') {
      throw new ConflictException('Class record is already locked');
    }
    if (record.status === 'finalized') {
      throw new ConflictException('Class record is already finalized');
    }

    const result = await this.db.transaction(async (tx) => {
      await this.computationService.validateCategoryWeights(
        classRecordId,
        tx as any,
      );

      const grades = await this.computationService.computeGrades(
        classRecordId,
        tx as any,
      );

      await tx
        .delete(classRecordFinalGrades)
        .where(eq(classRecordFinalGrades.classRecordId, classRecordId));

      const insertValues = [...grades.values()].map((g) => ({
        classRecordId,
        studentId: g.studentId,
        finalPercentage: g.quarterlyGrade.toString(),
        remarks: g.remarks,
        computedAt: new Date(),
      }));

      await tx.insert(classRecordFinalGrades).values(insertValues);

      const [updated] = await tx
        .update(classRecords)
        .set({ status: 'finalized', updatedAt: new Date() })
        .where(eq(classRecords.id, classRecordId))
        .returning();

      return { classRecord: updated, gradeCount: grades.size };
    });

    this.logger.log(
      `Class record "${classRecordId}" finalized. ${result.gradeCount} grades computed.`,
    );

    await this.auditService.log({
      actorId: userId,
      action: 'class_record.finalized',
      targetType: 'class_record',
      targetId: classRecordId,
      metadata: {
        classId: record.classId,
        gradeCount: result.gradeCount,
      },
    });

    return result;
  }

  async reopenClassRecord(
    classRecordId: string,
    userId: string,
    roles: string[],
  ) {
    const record = await this.assertClassRecord(classRecordId, userId, roles);

    if (record.status === 'locked') {
      throw new ConflictException('Locked class records cannot be reopened');
    }

    if (record.status !== 'finalized') {
      throw new ConflictException('Only finalized class records can be reopened');
    }

    const result = await this.db.transaction(async (tx) => {
      await tx
        .delete(classRecordFinalGrades)
        .where(eq(classRecordFinalGrades.classRecordId, classRecordId));

      const [updated] = await tx
        .update(classRecords)
        .set({ status: 'draft', updatedAt: new Date() })
        .where(eq(classRecords.id, classRecordId))
        .returning();

      return updated;
    });

    await this.auditService.log({
      actorId: userId,
      action: 'class_record.reopened',
      targetType: 'class_record',
      targetId: classRecordId,
      metadata: {
        classId: record.classId,
        previousStatus: 'finalized',
        nextStatus: 'draft',
      },
    });

    return result;
  }

  // ── Final Grade Reads ─────────────────────────────────────────────────────

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

    const results = await Promise.all(
      classIds.map(async (classId) => {
        const records = await this.db.query.classRecords.findMany({
          where: eq(classRecords.classId, classId),
          with: { finalGrades: true },
          orderBy: (g, { asc }) => [asc(g.gradingPeriod)],
        });
        return { classId, classRecords: records };
      }),
    );

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

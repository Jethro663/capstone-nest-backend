import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  gradebooks,
  gradebookCategories,
  gradebookItems,
  gradebookScores,
  gradebookFinalGrades,
  classes,
  sections,
  enrollments,
  users,
} from '../../drizzle/schema';
import { GradebookComputationService } from './gradebook-computation.service';
import { GradebookSyncService } from './gradebook-sync.service';
import { CreateGradebookDto } from './DTO/create-gradebook.dto';
import { CreateCategoryDto } from './DTO/create-category.dto';
import { UpdateCategoryDto } from './DTO/update-category.dto';
import { CreateItemDto } from './DTO/create-item.dto';
import { UpdateItemDto } from './DTO/update-item.dto';
import { RecordScoreDto } from './DTO/record-score.dto';
import { BulkRecordScoresDto } from './DTO/bulk-record-scores.dto';

@Injectable()
export class GradebookService {
  private readonly logger = new Logger(GradebookService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly computationService: GradebookComputationService,
    private readonly syncService: GradebookSyncService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private isAdmin(roles: string[]): boolean {
    return roles.includes('admin');
  }

  /**
   * Load and verify a gradebook exists; optionally verify ownership.
   */
  private async assertGradebook(
    gradebookId: string,
    userId: string,
    roles: string[],
    requireOwnership = true,
  ) {
    const gradebook = await this.db.query.gradebooks.findFirst({
      where: eq(gradebooks.id, gradebookId),
    });

    if (!gradebook) {
      throw new NotFoundException(`Gradebook "${gradebookId}" not found`);
    }

    if (requireOwnership && !this.isAdmin(roles) && gradebook.teacherId !== userId) {
      throw new ForbiddenException(
        'Access denied: you do not own this gradebook',
      );
    }

    return gradebook;
  }

  /**
   * Throws if the gradebook is locked (prevents edits after lock).
   */
  private assertEditable(
    gradebook: { status: string },
    allowFinalized = false,
  ) {
    if (gradebook.status === 'locked') {
      throw new ConflictException('This gradebook is locked and cannot be edited');
    }
    if (!allowFinalized && gradebook.status === 'finalized') {
      throw new ConflictException(
        'This gradebook is already finalized. Lock or re-finalize to update',
      );
    }
  }

  // ── Gradebook CRUD ───────────────────────────────────────────────────────

  /**
   * Create a new gradebook for a class + grading period.
   * Teacher must be assigned to the class.
   */
  async createGradebook(dto: CreateGradebookDto, userId: string, roles: string[]) {
    // Verify class exists & teacher owns it (unless admin)
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
    const existing = await this.db.query.gradebooks.findFirst({
      where: and(
        eq(gradebooks.classId, dto.classId),
        eq(gradebooks.gradingPeriod, dto.gradingPeriod),
      ),
    });

    if (existing) {
      throw new ConflictException(
        `A gradebook for ${dto.gradingPeriod} already exists for this class`,
      );
    }

    const [gradebook] = await this.db
      .insert(gradebooks)
      .values({
        classId: dto.classId,
        teacherId: userId,
        gradingPeriod: dto.gradingPeriod,
        status: 'draft',
      })
      .returning();

    return gradebook;
  }

  async getGradebook(id: string, userId: string, roles: string[]) {
    const gradebook = await this.db.query.gradebooks.findFirst({
      where: eq(gradebooks.id, id),
      with: {
        categories: {
          with: { items: { with: { scores: true } } },
        },
      },
    });

    if (!gradebook) {
      throw new NotFoundException(`Gradebook "${id}" not found`);
    }

    // Check access: owner, admin, or adviser (adviser guard is applied at controller level)
    if (!this.isAdmin(roles) && gradebook.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return gradebook;
  }

  async listGradebooksForClass(classId: string, userId: string, roles: string[]) {
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

    return this.db.query.gradebooks.findMany({
      where: eq(gradebooks.classId, classId),
      with: { categories: true },
      orderBy: (g, { asc }) => [asc(g.gradingPeriod)],
    });
  }

  // ── Categories ───────────────────────────────────────────────────────────

  async addCategory(
    gradebookId: string,
    dto: CreateCategoryDto,
    userId: string,
    roles: string[],
  ) {
    const gradebook = await this.assertGradebook(gradebookId, userId, roles);
    this.assertEditable(gradebook);

    const [category] = await this.db
      .insert(gradebookCategories)
      .values({
        gradebookId,
        name: dto.name,
        weightPercentage: dto.weightPercentage.toString(),
      })
      .returning();

    // Update gradebook timestamp
    await this.db
      .update(gradebooks)
      .set({ updatedAt: new Date() })
      .where(eq(gradebooks.id, gradebookId));

    return category;
  }

  async updateCategory(
    categoryId: string,
    dto: UpdateCategoryDto,
    userId: string,
    roles: string[],
  ) {
    const category = await this.db.query.gradebookCategories.findFirst({
      where: eq(gradebookCategories.id, categoryId),
      with: { gradebook: true },
    });

    if (!category) {
      throw new NotFoundException(`Category "${categoryId}" not found`);
    }

    if (
      !this.isAdmin(roles) &&
      category.gradebook.teacherId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(category.gradebook);

    const updateData: Partial<{ name: string; weightPercentage: string }> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.weightPercentage !== undefined)
      updateData.weightPercentage = dto.weightPercentage.toString();

    const [updated] = await this.db
      .update(gradebookCategories)
      .set(updateData)
      .where(eq(gradebookCategories.id, categoryId))
      .returning();

    await this.db
      .update(gradebooks)
      .set({ updatedAt: new Date() })
      .where(eq(gradebooks.id, category.gradebookId));

    return updated;
  }

  async deleteCategory(categoryId: string, userId: string, roles: string[]) {
    const category = await this.db.query.gradebookCategories.findFirst({
      where: eq(gradebookCategories.id, categoryId),
      with: { gradebook: true },
    });

    if (!category) {
      throw new NotFoundException(`Category "${categoryId}" not found`);
    }

    if (
      !this.isAdmin(roles) &&
      category.gradebook.teacherId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(category.gradebook);

    await this.db
      .delete(gradebookCategories)
      .where(eq(gradebookCategories.id, categoryId));

    return { deleted: true, id: categoryId };
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  async addItem(
    gradebookId: string,
    dto: CreateItemDto,
    userId: string,
    roles: string[],
  ) {
    const gradebook = await this.assertGradebook(gradebookId, userId, roles);
    this.assertEditable(gradebook);

    // Verify category belongs to this gradebook
    const category = await this.db.query.gradebookCategories.findFirst({
      where: and(
        eq(gradebookCategories.id, dto.categoryId),
        eq(gradebookCategories.gradebookId, gradebookId),
      ),
    });

    if (!category) {
      throw new NotFoundException(
        `Category "${dto.categoryId}" not found in this gradebook`,
      );
    }

    const [item] = await this.db
      .insert(gradebookItems)
      .values({
        gradebookId,
        categoryId: dto.categoryId,
        assessmentId: dto.assessmentId ?? null,
        title: dto.title,
        maxScore: dto.maxScore.toString(),
        dateGiven: dto.dateGiven ?? null,
      })
      .returning();

    await this.db
      .update(gradebooks)
      .set({ updatedAt: new Date() })
      .where(eq(gradebooks.id, gradebookId));

    return item;
  }

  async updateItem(
    itemId: string,
    dto: UpdateItemDto,
    userId: string,
    roles: string[],
  ) {
    const item = await this.db.query.gradebookItems.findFirst({
      where: eq(gradebookItems.id, itemId),
      with: { gradebook: true },
    });

    if (!item) {
      throw new NotFoundException(`Gradebook item "${itemId}" not found`);
    }

    if (!this.isAdmin(roles) && item.gradebook.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(item.gradebook);

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.maxScore !== undefined) updateData.maxScore = dto.maxScore.toString();
    if (dto.dateGiven !== undefined) updateData.dateGiven = dto.dateGiven;
    if ('assessmentId' in dto) updateData.assessmentId = dto.assessmentId ?? null;

    const [updated] = await this.db
      .update(gradebookItems)
      .set(updateData)
      .where(eq(gradebookItems.id, itemId))
      .returning();

    await this.db
      .update(gradebooks)
      .set({ updatedAt: new Date() })
      .where(eq(gradebooks.id, item.gradebookId));

    return updated;
  }

  async deleteItem(itemId: string, userId: string, roles: string[]) {
    const item = await this.db.query.gradebookItems.findFirst({
      where: eq(gradebookItems.id, itemId),
      with: { gradebook: true },
    });

    if (!item) {
      throw new NotFoundException(`Gradebook item "${itemId}" not found`);
    }

    if (!this.isAdmin(roles) && item.gradebook.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(item.gradebook);

    await this.db
      .delete(gradebookItems)
      .where(eq(gradebookItems.id, itemId));

    return { deleted: true, id: itemId };
  }

  // ── Scores ────────────────────────────────────────────────────────────────

  async recordScore(
    itemId: string,
    dto: RecordScoreDto,
    userId: string,
    roles: string[],
  ) {
    const item = await this.db.query.gradebookItems.findFirst({
      where: eq(gradebookItems.id, itemId),
      with: { gradebook: true },
    });

    if (!item) {
      throw new NotFoundException(`Gradebook item "${itemId}" not found`);
    }

    if (!this.isAdmin(roles) && item.gradebook.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(item.gradebook);

    // Validate score ≤ maxScore
    const maxScore = parseFloat(item.maxScore);
    if (dto.score > maxScore) {
      throw new BadRequestException(
        `Score ${dto.score} exceeds max score of ${maxScore}`,
      );
    }

    const [score] = await this.db
      .insert(gradebookScores)
      .values({
        gradebookItemId: itemId,
        studentId: dto.studentId,
        score: dto.score.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [gradebookScores.gradebookItemId, gradebookScores.studentId],
        set: {
          score: dto.score.toString(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return score;
  }

  async bulkRecordScores(
    itemId: string,
    dto: BulkRecordScoresDto,
    userId: string,
    roles: string[],
  ) {
    const item = await this.db.query.gradebookItems.findFirst({
      where: eq(gradebookItems.id, itemId),
      with: { gradebook: true },
    });

    if (!item) {
      throw new NotFoundException(`Gradebook item "${itemId}" not found`);
    }

    if (!this.isAdmin(roles) && item.gradebook.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    this.assertEditable(item.gradebook);

    const maxScore = parseFloat(item.maxScore);

    // Validate all scores
    for (const entry of dto.scores) {
      if (entry.score > maxScore) {
        throw new BadRequestException(
          `Score ${entry.score} for student "${entry.studentId}" exceeds max score of ${maxScore}`,
        );
      }
    }

    // Upsert each score
    const results = await Promise.all(
      dto.scores.map(async (entry) => {
        const [score] = await this.db
          .insert(gradebookScores)
          .values({
            gradebookItemId: itemId,
            studentId: entry.studentId,
            score: entry.score.toString(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [gradebookScores.gradebookItemId, gradebookScores.studentId],
            set: {
              score: entry.score.toString(),
              updatedAt: new Date(),
            },
          })
          .returning();
        return score;
      }),
    );

    return { saved: results.length, scores: results };
  }

  async syncScoresFromAssessment(itemId: string, userId: string, roles: string[]) {
    const item = await this.db.query.gradebookItems.findFirst({
      where: eq(gradebookItems.id, itemId),
      with: { gradebook: true },
    });

    if (!item) {
      throw new NotFoundException(`Gradebook item "${itemId}" not found`);
    }

    if (!this.isAdmin(roles) && item.gradebook.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.syncService.syncFromAssessment(itemId, userId);
  }

  // ── Grade Preview ─────────────────────────────────────────────────────────

  async previewGrades(gradebookId: string, userId: string, roles: string[]) {
    await this.assertGradebook(gradebookId, userId, roles);
    const results = await this.computationService.computeGrades(gradebookId);
    return {
      gradebookId,
      preview: [...results.values()],
      interventionCount: [...results.values()].filter(
        (r) => r.remarks === 'For Intervention',
      ).length,
    };
  }

  // ── Finalization ──────────────────────────────────────────────────────────

  /**
   * Finalize: compute grades, persist final grade snapshots, lock edits.
   * All operations run inside a single DB transaction.
   */
  async finalizeGradebook(gradebookId: string, userId: string, roles: string[]) {
    const gradebook = await this.assertGradebook(gradebookId, userId, roles);

    if (gradebook.status === 'locked') {
      throw new ConflictException('Gradebook is already locked');
    }
    if (gradebook.status === 'finalized') {
      throw new ConflictException(
        'Gradebook is already finalized. Re-finalize is not supported — contact admin to unlock',
      );
    }

    const result = await this.db.transaction(async (tx) => {
      // Step 1: Validate weights sum to 100%
      await this.computationService.validateCategoryWeights(gradebookId, tx as any);

      // Step 2: Compute grades
      const grades = await this.computationService.computeGrades(gradebookId, tx as any);

      // Step 3: Delete existing snapshots (idempotent re-finalize safety)
      await tx
        .delete(gradebookFinalGrades)
        .where(eq(gradebookFinalGrades.gradebookId, gradebookId));

      // Step 4: Bulk insert final grades
      const insertValues = [...grades.values()].map((g) => ({
        gradebookId,
        studentId: g.studentId,
        finalPercentage: g.finalPercentage.toString(),
        remarks: g.remarks as 'Passed' | 'For Intervention',
        computedAt: new Date(),
      }));

      await tx.insert(gradebookFinalGrades).values(insertValues);

      // Step 5: Mark gradebook as finalized
      const [updated] = await tx
        .update(gradebooks)
        .set({ status: 'finalized', updatedAt: new Date() })
        .where(eq(gradebooks.id, gradebookId))
        .returning();

      return { gradebook: updated, gradeCount: grades.size };
    });

    // Post-transaction: log intervention summary
    const finalGrades = await this.db.query.gradebookFinalGrades.findMany({
      where: eq(gradebookFinalGrades.gradebookId, gradebookId),
      columns: { remarks: true },
    });

    const interventionCount = finalGrades.filter(
      (g) => g.remarks === 'For Intervention',
    ).length;

    this.logger.log(
      `Gradebook "${gradebookId}" finalized. ` +
        `${result.gradeCount} grades computed. ` +
        `${interventionCount} students flagged for intervention.`,
    );

    return {
      ...result,
      interventionCount,
    };
  }

  // ── Final Grade Reads ─────────────────────────────────────────────────────

  async getFinalGrades(gradebookId: string, userId: string, roles: string[]) {
    // Access: teacher (owner), admin — adviser handled by controller guard separately
    await this.assertGradebook(gradebookId, userId, roles);

    return this.db.query.gradebookFinalGrades.findMany({
      where: eq(gradebookFinalGrades.gradebookId, gradebookId),
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
    gradebookId: string,
    studentId: string,
    userId: string,
    roles: string[],
  ) {
    // Teacher/admin can view any; student can only view own
    if (
      !this.isAdmin(roles) &&
      !roles.includes('teacher') &&
      userId !== studentId
    ) {
      throw new ForbiddenException(
        'Students may only view their own grade',
      );
    }

    const grade = await this.db.query.gradebookFinalGrades.findFirst({
      where: and(
        eq(gradebookFinalGrades.gradebookId, gradebookId),
        eq(gradebookFinalGrades.studentId, studentId),
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
        `No final grade found for student "${studentId}" in gradebook "${gradebookId}"`,
      );
    }

    return grade;
  }

  // ── Adviser Section View ──────────────────────────────────────────────────

  /**
   * Returns all gradebooks for classes in the adviser's section.
   * Access control enforced by AdviserSectionGuard at the controller level.
   */
  async listAdviserSection(sectionId: string, adviserId: string, roles: string[]) {
    // Verify the section belongs to this adviser (or admin)
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

    // Get all classes in this section
    const sectionClasses = await this.db.query.classes.findMany({
      where: eq(classes.sectionId, sectionId),
      columns: { id: true, subjectName: true, subjectCode: true },
    });

    if (sectionClasses.length === 0) return [];

    const classIds = sectionClasses.map((c) => c.id);

    // Fetch gradebooks for those classes (read-only: final grades only, no scores)
    const results = await Promise.all(
      classIds.map(async (classId) => {
        const gradebookList = await this.db.query.gradebooks.findMany({
          where: eq(gradebooks.classId, classId),
          with: { finalGrades: true },
          orderBy: (g, { asc }) => [asc(g.gradingPeriod)],
        });
        return { classId, gradebooks: gradebookList };
      }),
    );

    return {
      sectionId,
      sectionName: section.name,
      classes: results,
    };
  }

  // ── Reports ──────────────────────────────────────────────────────────────

  async getClassAverage(gradebookId: string, userId: string, roles: string[]) {
    await this.assertGradebook(gradebookId, userId, roles);

    const grades = await this.db.query.gradebookFinalGrades.findMany({
      where: eq(gradebookFinalGrades.gradebookId, gradebookId),
      columns: { finalPercentage: true, remarks: true },
    });

    if (grades.length === 0) {
      return { gradebookId, average: 0, count: 0, interventionCount: 0 };
    }

    const avg =
      grades.reduce((sum, g) => sum + parseFloat(g.finalPercentage), 0) /
      grades.length;

    return {
      gradebookId,
      average: Math.round(avg * 1000) / 1000,
      count: grades.length,
      interventionCount: grades.filter((g) => g.remarks === 'For Intervention').length,
    };
  }

  async getGradeDistribution(gradebookId: string, userId: string, roles: string[]) {
    await this.assertGradebook(gradebookId, userId, roles);

    const grades = await this.db.query.gradebookFinalGrades.findMany({
      where: eq(gradebookFinalGrades.gradebookId, gradebookId),
      columns: { finalPercentage: true },
    });

    const bands = {
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

    return { gradebookId, distribution: bands, total: grades.length };
  }

  async getInterventionList(gradebookId: string, userId: string, roles: string[]) {
    await this.assertGradebook(gradebookId, userId, roles);

    return this.db.query.gradebookFinalGrades.findMany({
      where: and(
        eq(gradebookFinalGrades.gradebookId, gradebookId),
        eq(gradebookFinalGrades.remarks, 'For Intervention'),
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

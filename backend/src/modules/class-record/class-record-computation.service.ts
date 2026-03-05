import {
  Injectable,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  classRecords,
  classRecordCategories,
  classRecordItems,
  classRecordScores,
  enrollments,
} from '../../drizzle/schema';

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  weightPercentage: number;
  /** Total raw score for this student in this category */
  totalRaw: number;
  /** Total HPS across all items in this category */
  totalHPS: number;
  /** Percentage Score = (totalRaw / totalHPS) × 100 */
  percentageScore: number;
  /** Weighted Score = PS × (weight / 100) */
  weightedScore: number;
}

export interface StudentGradeResult {
  studentId: string;
  /** Sum of all weighted scores */
  initialGrade: number;
  /** DepEd transmuted quarterly grade = max(60, round(IG × 0.4 + 60)) */
  quarterlyGrade: number;
  remarks: 'Passed' | 'For Intervention';
  categoryBreakdown: CategoryBreakdown[];
}

@Injectable()
export class ClassRecordComputationService {
  private readonly logger = new Logger(ClassRecordComputationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Validates that the sum of category weights equals 100 (±0.001 tolerance).
   */
  async validateCategoryWeights(
    classRecordId: string,
    tx?: typeof this.db,
  ): Promise<void> {
    const conn = (tx ?? this.db) as typeof this.db;

    const result = await conn
      .select({
        total: sql<string>`COALESCE(SUM(${classRecordCategories.weightPercentage}), 0)`,
      })
      .from(classRecordCategories)
      .where(eq(classRecordCategories.classRecordId, classRecordId));

    const total = parseFloat(result[0]?.total ?? '0');

    if (Math.abs(total - 100) > 0.001) {
      throw new UnprocessableEntityException(
        `Category weights must sum to 100%. Current total: ${total.toFixed(2)}%`,
      );
    }
  }

  /**
   * DepEd transmutation formula.
   * Quarterly Grade = max(60, round(Initial Grade × 0.4 + 60))
   */
  transmute(initialGrade: number): number {
    return Math.max(60, Math.round(initialGrade * 0.4 + 60));
  }

  /**
   * Computes DepEd-standard grades for all enrolled students.
   *
   * Formula:
   *   PS (Percentage Score) = (total raw / total HPS) × 100
   *   WS (Weighted Score)   = PS × (weight / 100)
   *   Initial Grade         = sum(WS across all categories)
   *   Quarterly Grade       = max(60, round(IG × 0.4 + 60))
   *
   * Missing scores are treated as 0. Items with no HPS are skipped.
   */
  async computeGrades(
    classRecordId: string,
    tx?: typeof this.db,
  ): Promise<Map<string, StudentGradeResult>> {
    const conn = (tx ?? this.db) as typeof this.db;

    // 1. Load class record to get classId
    const record = await conn.query.classRecords.findFirst({
      where: eq(classRecords.id, classRecordId),
      columns: { classId: true },
    });

    if (!record) {
      throw new UnprocessableEntityException(
        `Class record "${classRecordId}" not found`,
      );
    }

    // 2. Load enrolled students
    const enrolled = await conn
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, record.classId),
          eq(enrollments.status, 'enrolled'),
        ),
      );

    if (enrolled.length === 0) {
      throw new UnprocessableEntityException(
        'No enrolled students found for this class',
      );
    }

    const studentIds = enrolled.map((e) => e.studentId);

    // 3. Load categories
    const categories = await conn.query.classRecordCategories.findMany({
      where: eq(classRecordCategories.classRecordId, classRecordId),
    });

    // 4. Load items with scores
    const items = await conn.query.classRecordItems.findMany({
      where: eq(classRecordItems.classRecordId, classRecordId),
      with: { scores: true },
    });

    // Index: categoryId → items
    const itemsByCategory = new Map<string, typeof items>();
    for (const item of items) {
      if (!itemsByCategory.has(item.categoryId)) {
        itemsByCategory.set(item.categoryId, []);
      }
      itemsByCategory.get(item.categoryId)!.push(item);
    }

    // 5. Compute per-student grades using DepEd formula
    const results = new Map<string, StudentGradeResult>();

    for (const studentId of studentIds) {
      const categoryBreakdown: CategoryBreakdown[] = [];
      let initialGrade = 0;

      for (const category of categories) {
        const categoryItems = itemsByCategory.get(category.id) ?? [];
        const weight = parseFloat(category.weightPercentage);

        // Only consider items that have a valid HPS (maxScore > 0)
        const validItems = categoryItems.filter(
          (item) => parseFloat(item.maxScore) > 0,
        );

        if (validItems.length === 0) {
          categoryBreakdown.push({
            categoryId: category.id,
            categoryName: category.name,
            weightPercentage: weight,
            totalRaw: 0,
            totalHPS: 0,
            percentageScore: 0,
            weightedScore: 0,
          });
          continue;
        }

        // Sum raw scores and HPS across all items in this category
        let totalRaw = 0;
        let totalHPS = 0;

        for (const item of validItems) {
          const maxScore = parseFloat(item.maxScore);
          totalHPS += maxScore;

          const scoreRecord = item.scores.find(
            (s: { studentId: string }) => s.studentId === studentId,
          );
          const score = scoreRecord ? parseFloat(scoreRecord.score) : 0;
          totalRaw += score;
        }

        // PS = (totalRaw / totalHPS) × 100
        const percentageScore =
          totalHPS > 0 ? (totalRaw / totalHPS) * 100 : 0;

        // WS = PS × (weight / 100)
        const weightedScore = percentageScore * (weight / 100);

        categoryBreakdown.push({
          categoryId: category.id,
          categoryName: category.name,
          weightPercentage: weight,
          totalRaw: Math.round(totalRaw * 100) / 100,
          totalHPS: Math.round(totalHPS * 100) / 100,
          percentageScore: Math.round(percentageScore * 1000) / 1000,
          weightedScore: Math.round(weightedScore * 1000) / 1000,
        });

        initialGrade += weightedScore;
      }

      initialGrade = Math.round(initialGrade * 1000) / 1000;
      const quarterlyGrade = this.transmute(initialGrade);

      const remarks: 'Passed' | 'For Intervention' =
        quarterlyGrade < 75 ? 'For Intervention' : 'Passed';

      results.set(studentId, {
        studentId,
        initialGrade,
        quarterlyGrade,
        remarks,
        categoryBreakdown,
      });
    }

    this.logger.debug(
      `Computed grades for ${results.size} students in class record ${classRecordId}. ` +
        `Intervention: ${[...results.values()].filter((r) => r.remarks === 'For Intervention').length}`,
    );

    return results;
  }
}

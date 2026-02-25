import {
  Injectable,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  gradebooks,
  gradebookCategories,
  gradebookItems,
  gradebookScores,
  enrollments,
} from '../../drizzle/schema';

export interface StudentGradeResult {
  studentId: string;
  finalPercentage: number;
  remarks: 'Passed' | 'For Intervention';
  categoryBreakdown: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  weightPercentage: number;
  categoryAverage: number;
  weightedScore: number;
}

const INTERVENTION_THRESHOLD = 74;

@Injectable()
export class GradebookComputationService {
  private readonly logger = new Logger(GradebookComputationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Validates that the sum of category weights equals 100 (±0.001 tolerance).
   * Throws UnprocessableEntityException if not.
   */
  async validateCategoryWeights(
    gradebookId: string,
    tx?: typeof this.db,
  ): Promise<void> {
    const conn = (tx ?? this.db) as typeof this.db;

    const result = await conn
      .select({
        total: sql<string>`COALESCE(SUM(${gradebookCategories.weightPercentage}), 0)`,
      })
      .from(gradebookCategories)
      .where(eq(gradebookCategories.gradebookId, gradebookId));

    const total = parseFloat(result[0]?.total ?? '0');

    if (Math.abs(total - 100) > 0.001) {
      throw new UnprocessableEntityException(
        `Category weights must sum to 100%. Current total: ${total.toFixed(2)}%`,
      );
    }
  }

  /**
   * Computes final grades for all enrolled students in a gradebook.
   *
   * Formula:
   *   item_percentage   = (score / max_score) * 100   (missing score = 0)
   *   category_average  = mean(item_percentages)
   *   weighted_score    = category_average * (weight / 100)
   *   final_percentage  = sum(weighted_scores across all categories)
   *
   * Returns a map keyed by studentId.
   */
  async computeGrades(
    gradebookId: string,
    tx?: typeof this.db,
  ): Promise<Map<string, StudentGradeResult>> {
    const conn = (tx ?? this.db) as typeof this.db;

    // ── 1. Load gradebook to get classId ──────────────────────────────────
    const gradebook = await conn.query.gradebooks.findFirst({
      where: eq(gradebooks.id, gradebookId),
      columns: { classId: true },
    });

    if (!gradebook) {
      throw new UnprocessableEntityException(`Gradebook "${gradebookId}" not found`);
    }

    // ── 2. Load enrolled students for this class ──────────────────────────
    const enrolled = await conn
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, gradebook.classId),
          eq(enrollments.status, 'enrolled'),
        ),
      );

    if (enrolled.length === 0) {
      throw new UnprocessableEntityException(
        'No enrolled students found for this class',
      );
    }

    const studentIds = enrolled.map((e) => e.studentId);

    // ── 3. Load categories ────────────────────────────────────────────────
    const categories = await conn.query.gradebookCategories.findMany({
      where: eq(gradebookCategories.gradebookId, gradebookId),
    });

    // ── 4. Load items and their scores ────────────────────────────────────
    const items = await conn.query.gradebookItems.findMany({
      where: eq(gradebookItems.gradebookId, gradebookId),
      with: {
        scores: true,
      },
    });

    // Index: categoryId → items
    const itemsByCategory = new Map<string, typeof items>();
    for (const item of items) {
      if (!itemsByCategory.has(item.categoryId)) {
        itemsByCategory.set(item.categoryId, []);
      }
      itemsByCategory.get(item.categoryId)!.push(item);
    }

    // ── 5. Compute per-student grades ─────────────────────────────────────
    const results = new Map<string, StudentGradeResult>();

    for (const studentId of studentIds) {
      const categoryBreakdown: CategoryBreakdown[] = [];
      let finalPercentage = 0;

      for (const category of categories) {
        const categoryItems = itemsByCategory.get(category.id) ?? [];
        const weight = parseFloat(category.weightPercentage);

        if (categoryItems.length === 0) {
          // No items yet — contributes 0 to this category
          categoryBreakdown.push({
            categoryId: category.id,
            categoryName: category.name,
            weightPercentage: weight,
            categoryAverage: 0,
            weightedScore: 0,
          });
          continue;
        }

        // item_percentage = (score / max_score) * 100; missing score = 0
        const itemPercentages = categoryItems.map((item) => {
          const scoreRecord = item.scores.find(
            (s: { studentId: string }) => s.studentId === studentId,
          );
          const score = scoreRecord ? parseFloat(scoreRecord.score) : 0;
          const maxScore = parseFloat(item.maxScore);
          return maxScore > 0 ? (score / maxScore) * 100 : 0;
        });

        const categoryAverage =
          itemPercentages.reduce((sum, p) => sum + p, 0) /
          itemPercentages.length;

        const weightedScore = categoryAverage * (weight / 100);

        categoryBreakdown.push({
          categoryId: category.id,
          categoryName: category.name,
          weightPercentage: weight,
          categoryAverage: Math.round(categoryAverage * 1000) / 1000,
          weightedScore: Math.round(weightedScore * 1000) / 1000,
        });

        finalPercentage += weightedScore;
      }

      // Round to 3 decimal places
      finalPercentage = Math.round(finalPercentage * 1000) / 1000;

      const remarks: 'Passed' | 'For Intervention' =
        finalPercentage < INTERVENTION_THRESHOLD
          ? 'For Intervention'
          : 'Passed';

      results.set(studentId, {
        studentId,
        finalPercentage,
        remarks,
        categoryBreakdown,
      });
    }

    this.logger.debug(
      `Computed grades for ${results.size} students in gradebook ${gradebookId}. ` +
        `Intervention count: ${[...results.values()].filter((r) => r.remarks === 'For Intervention').length}`,
    );

    return results;
  }
}

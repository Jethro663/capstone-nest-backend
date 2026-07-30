import {
  Injectable,
  UnprocessableEntityException,
  Logger,
  Optional,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { TransmutationService } from './transmutation.service';
import { TransmutationBand } from '../../drizzle/schema/transmutation.schema';
import {
  classRecords,
  classRecordCategories,
  classRecordItems,
  classRecordFinalGrades,
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
  /** Percentage Score = (totalRaw / totalHPS) x 100 */
  percentageScore: number;
  /** Weighted Score = percentageScore x (weightPercentage / 100) */
  weightedScore: number;
}

export interface StudentGradeResult {
  studentId: string;
  /** Sum of all weighted scores */
  initialGrade: number;
  /** DepEd transmuted quarterly grade from the official transmutation table */
  quarterlyGrade: number;
  remarks: 'Passed' | 'For Intervention';
  categoryBreakdown: CategoryBreakdown[];
}

interface DepEdTransmutationBand {
  minInitialGrade: number;
  transmutedGrade: number;
}

const DEPED_TRANSMUTATION_TABLE: readonly DepEdTransmutationBand[] = [
  { minInitialGrade: 100, transmutedGrade: 100 },
  { minInitialGrade: 98.4, transmutedGrade: 99 },
  { minInitialGrade: 96.8, transmutedGrade: 98 },
  { minInitialGrade: 95.2, transmutedGrade: 97 },
  { minInitialGrade: 93.6, transmutedGrade: 96 },
  { minInitialGrade: 92, transmutedGrade: 95 },
  { minInitialGrade: 90.4, transmutedGrade: 94 },
  { minInitialGrade: 88.8, transmutedGrade: 93 },
  { minInitialGrade: 87.2, transmutedGrade: 92 },
  { minInitialGrade: 85.6, transmutedGrade: 91 },
  { minInitialGrade: 84, transmutedGrade: 90 },
  { minInitialGrade: 82.4, transmutedGrade: 89 },
  { minInitialGrade: 80.8, transmutedGrade: 88 },
  { minInitialGrade: 79.2, transmutedGrade: 87 },
  { minInitialGrade: 77.6, transmutedGrade: 86 },
  { minInitialGrade: 76, transmutedGrade: 85 },
  { minInitialGrade: 74.4, transmutedGrade: 84 },
  { minInitialGrade: 72.8, transmutedGrade: 83 },
  { minInitialGrade: 71.2, transmutedGrade: 82 },
  { minInitialGrade: 69.6, transmutedGrade: 81 },
  { minInitialGrade: 68, transmutedGrade: 80 },
  { minInitialGrade: 66.4, transmutedGrade: 79 },
  { minInitialGrade: 64.8, transmutedGrade: 78 },
  { minInitialGrade: 63.2, transmutedGrade: 77 },
  { minInitialGrade: 61.6, transmutedGrade: 76 },
  { minInitialGrade: 60, transmutedGrade: 75 },
  { minInitialGrade: 56, transmutedGrade: 74 },
  { minInitialGrade: 52, transmutedGrade: 73 },
  { minInitialGrade: 48, transmutedGrade: 72 },
  { minInitialGrade: 44, transmutedGrade: 71 },
  { minInitialGrade: 40, transmutedGrade: 70 },
  { minInitialGrade: 36, transmutedGrade: 69 },
  { minInitialGrade: 32, transmutedGrade: 68 },
  { minInitialGrade: 28, transmutedGrade: 67 },
  { minInitialGrade: 24, transmutedGrade: 66 },
  { minInitialGrade: 20, transmutedGrade: 65 },
  { minInitialGrade: 16, transmutedGrade: 64 },
  { minInitialGrade: 12, transmutedGrade: 63 },
  { minInitialGrade: 8, transmutedGrade: 62 },
  { minInitialGrade: 4, transmutedGrade: 61 },
  { minInitialGrade: 0, transmutedGrade: 60 },
];

@Injectable()
export class ClassRecordComputationService {
  private readonly logger = new Logger(ClassRecordComputationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() private readonly transmutationService?: TransmutationService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Validates that the sum of category weights equals 100 (+/-0.001 tolerance).
   */
  async validateCategoryWeights(
    classRecordId: string,
    tx?: typeof this.db,
  ): Promise<void> {
    const conn = tx ?? this.db;

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
   * Converts initial grade to transmuted grade based on official active transmutation table.
   */
  transmute(initialGrade: number, customBands?: TransmutationBand[]): number {
    const safeInitialGrade = Number.isFinite(initialGrade) ? initialGrade : 0;
    const normalizedInitialGrade = Math.min(100, Math.max(0, safeInitialGrade));
    const epsilon = 1e-9;

    const activeBands = customBands;

    if (activeBands && activeBands.length > 0) {
      for (const band of activeBands) {
        const minVal = band.minInitialGrade;
        const maxVal = band.maxInitialGrade ?? minVal;
        if (
          normalizedInitialGrade + epsilon >= minVal &&
          normalizedInitialGrade <= maxVal + epsilon
        ) {
          return band.transmutedGrade;
        }
      }
      // Fallback matching if between bands
      for (const band of activeBands) {
        if (normalizedInitialGrade + epsilon >= band.minInitialGrade) {
          return band.transmutedGrade;
        }
      }
    }

    for (const band of DEPED_TRANSMUTATION_TABLE) {
      if (normalizedInitialGrade + epsilon >= band.minInitialGrade) {
        return band.transmutedGrade;
      }
    }

    return 60;
  }

  /**
   * Computes DepEd-standard grades for all active students plus removed students
   * who already have class-record history (scores and/or finalized grades).
   *
   * Formula:
   *   PS (Percentage Score) = (total raw / total HPS) x 100
   *   WS (Weighted Score)   = PS x (weight / 100)
   *   Initial Grade         = sum(WS across all categories)
   *   Quarterly Grade       = DepEd transmuted value from table
   *
   * Missing scores are treated as 0. Items with no HPS are skipped.
   */
  async computeGrades(
    classRecordId: string,
    tx?: typeof this.db,
  ): Promise<Map<string, StudentGradeResult>> {
    const conn = tx ?? this.db;

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

    // 2. Load active class participants
    const enrolled = await conn
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, record.classId),
          eq(enrollments.status, 'enrolled'),
        ),
      );

    const historicalScoreRows = await conn
      .select({ studentId: classRecordScores.studentId })
      .from(classRecordScores)
      .innerJoin(
        classRecordItems,
        eq(classRecordItems.id, classRecordScores.classRecordItemId),
      )
      .where(eq(classRecordItems.classRecordId, classRecordId));

    const historicalFinalRows = await conn
      .select({ studentId: classRecordFinalGrades.studentId })
      .from(classRecordFinalGrades)
      .where(eq(classRecordFinalGrades.classRecordId, classRecordId));

    const participantIds = new Set<string>();
    enrolled.forEach((entry) => participantIds.add(entry.studentId));
    historicalScoreRows.forEach((entry) => participantIds.add(entry.studentId));
    historicalFinalRows.forEach((entry) => participantIds.add(entry.studentId));

    if (participantIds.size === 0) {
      throw new UnprocessableEntityException(
        'No class-record participants found for this class',
      );
    }
    const studentIds = [...participantIds];

    // 3. Load categories
    const categories = await conn.query.classRecordCategories.findMany({
      where: eq(classRecordCategories.classRecordId, classRecordId),
    });

    // 4. Load items with scores
    const items = await conn.query.classRecordItems.findMany({
      where: eq(classRecordItems.classRecordId, classRecordId),
      with: { scores: true },
    });

    // Index: categoryId -> items
    const itemsByCategory = new Map<string, typeof items>();
    for (const item of items) {
      if (!itemsByCategory.has(item.categoryId)) {
        itemsByCategory.set(item.categoryId, []);
      }
      itemsByCategory.get(item.categoryId)!.push(item);
    }

    // 5. Compute per-student grades using DepEd formula and active transmutation table
    const activeBands = this.transmutationService ? await this.transmutationService.getActiveBands() : undefined;
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

        // PS = (totalRaw / totalHPS) x 100
        const percentageScore = totalHPS > 0 ? (totalRaw / totalHPS) * 100 : 0;

        // WS = PS x (weight / 100)
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
      const quarterlyGrade = this.transmute(initialGrade, activeBands);

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

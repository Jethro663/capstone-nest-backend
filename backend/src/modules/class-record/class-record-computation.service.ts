import {
  Injectable,
  UnprocessableEntityException,
  Logger,
  Optional,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { TransmutationService } from './transmutation.service';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import { LEGACY_BANDS } from '../academic-state/academic-policy';
import { calculateStudentRecord } from './class-record-calculation';
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

const DEPED_TRANSMUTATION_TABLE = LEGACY_BANDS;

@Injectable()
export class ClassRecordComputationService {
  private readonly logger = new Logger(ClassRecordComputationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly academicPolicyService: AcademicPolicyService,
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
   * Missing scores block computation. Explicit exemptions exclude individual HPS.
   */
  async computeGrades(
    classRecordId: string,
    tx?: typeof this.db,
    eligibleStudentIds?: string[],
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

    if (eligibleStudentIds === undefined && participantIds.size === 0) {
      throw new UnprocessableEntityException(
        'No class-record participants found for this class',
      );
    }
    const studentIds = eligibleStudentIds ?? [...participantIds];

    // 3. Load categories
    const categories = await conn.query.classRecordCategories.findMany({
      where: eq(classRecordCategories.classRecordId, classRecordId),
    });

    // 4. Load items with scores
    const items = await conn.query.classRecordItems.findMany({
      where: eq(classRecordItems.classRecordId, classRecordId),
      with: { scores: true },
    });

    const { policy } = await this.academicPolicyService.forClass(
      record.classId,
    );
    const results = new Map<string, StudentGradeResult>();
    const blockers: ReturnType<typeof calculateStudentRecord>['blockers'] = [];
    for (const studentId of studentIds) {
      const computed = calculateStudentRecord(
        studentId,
        policy,
        categories,
        items,
      );
      if (computed.blockers.length) {
        blockers.push(...computed.blockers);
        continue;
      }
      results.set(studentId, {
        studentId,
        initialGrade: computed.initialGrade!,
        quarterlyGrade: computed.quarterlyGrade!,
        remarks: computed.remarks as 'Passed' | 'For Intervention',
        categoryBreakdown: computed.categoryBreakdown.map((category) => ({
          ...category,
          percentageScore: category.percentageScore!,
          weightedScore: category.weightedScore!,
        })),
      });
    }
    if (blockers.length) {
      throw new UnprocessableEntityException({
        message:
          'Class record is incomplete; resolve required grading evidence',
        blockers,
      });
    }
    return results;
  }
}

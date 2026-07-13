import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { performanceSnapshots } from '../../drizzle/schema';

export type PerformanceSnapshotSummary = {
  id: string;
  studentId: string;
  classId: string;
  assessmentAverage: number | null;
  classRecordAverage: number | null;
  blendedScore: number | null;
  assessmentSampleSize: number;
  classRecordSampleSize: number;
  hasData: boolean;
  isAtRisk: boolean;
  thresholdApplied: number;
  lastComputedAt: Date;
};

@Injectable()
export class PerformanceSnapshotReadService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findForStudentClasses(
    studentId: string,
    classIds: string[],
  ): Promise<Map<string, PerformanceSnapshotSummary>> {
    const uniqueClassIds = [...new Set(classIds)];
    if (uniqueClassIds.length === 0) return new Map();

    const rows =
      await this.databaseService.db.query.performanceSnapshots.findMany({
        where: and(
          eq(performanceSnapshots.studentId, studentId),
          inArray(performanceSnapshots.classId, uniqueClassIds),
        ),
        columns: {
          id: true,
          studentId: true,
          classId: true,
          assessmentAverage: true,
          classRecordAverage: true,
          blendedScore: true,
          assessmentSampleSize: true,
          classRecordSampleSize: true,
          hasData: true,
          isAtRisk: true,
          thresholdApplied: true,
          lastComputedAt: true,
        },
      });

    return new Map(
      rows.map((row) => [
        row.classId,
        {
          ...row,
          assessmentAverage: this.toNumber(row.assessmentAverage),
          classRecordAverage: this.toNumber(row.classRecordAverage),
          blendedScore: this.toNumber(row.blendedScore),
          thresholdApplied: this.toNumber(row.thresholdApplied) ?? 74,
        },
      ]),
    );
  }

  private toNumber(value: string | number | null): number | null {
    if (value === null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

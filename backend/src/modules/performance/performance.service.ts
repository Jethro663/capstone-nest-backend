import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessments,
  assessmentAttempts,
  classRecords,
  classes,
  enrollments,
  performanceLogs,
  performanceSnapshots,
  users,
} from '../../drizzle/schema';
import { PerformanceStatusChangedEvent } from '../../common/events';
import { QueryPerformanceLogsDto } from './DTO/query-performance-logs.dto';

const PERFORMANCE_RISK_THRESHOLD = 74;

type ClassPerformanceRow = {
  studentId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
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

type SnapshotData = {
  assessmentAverage: number | null;
  classRecordAverage: number | null;
  blendedScore: number | null;
  assessmentSampleSize: number;
  classRecordSampleSize: number;
  hasData: boolean;
  isAtRisk: boolean;
  thresholdApplied: number;
  lastComputedAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PerformanceService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isAdmin(roles: string[]): boolean {
    return roles.includes('admin');
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async assertClassAccess(
    classId: string,
    userId: string,
    roles: string[],
  ): Promise<void> {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, teacherId: true },
    });

    if (!cls) {
      throw new NotFoundException(`Class "${classId}" not found`);
    }

    if (!this.isAdmin(roles) && cls.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async getAssessmentComponent(classId: string, studentId: string) {
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.isSubmitted, true),
      ),
      columns: {
        assessmentId: true,
        score: true,
        submittedAt: true,
        attemptNumber: true,
      },
      with: {
        assessment: {
          columns: { classId: true },
        },
      },
      orderBy: (attempt, { desc: orderDesc }) => [
        orderDesc(attempt.submittedAt),
        orderDesc(attempt.attemptNumber),
      ],
    });

    const latestPerAssessment = new Map<string, number>();

    for (const attempt of attempts) {
      if (attempt.assessment?.classId !== classId) continue;
      if (latestPerAssessment.has(attempt.assessmentId)) continue;
      latestPerAssessment.set(attempt.assessmentId, attempt.score ?? 0);
    }

    if (latestPerAssessment.size === 0) {
      return { average: null as number | null, sampleSize: 0 };
    }

    const values = [...latestPerAssessment.values()];
    const average = values.reduce((sum, score) => sum + score, 0) / values.length;
    return { average: this.round(average), sampleSize: values.length };
  }

  private async getClassRecordComponent(classId: string, studentId: string) {
    const records = await this.db.query.classRecords.findMany({
      where: eq(classRecords.classId, classId),
      with: {
        items: {
          with: {
            scores: true,
          },
        },
      },
    });

    let sampleSize = 0;
    let normalizedSum = 0;

    for (const record of records) {
      for (const item of record.items) {
        const maxScore = this.toNumber(item.maxScore);
        if (!maxScore || maxScore <= 0) continue;
        sampleSize++;

        const scoreRow = item.scores.find((score) => score.studentId === studentId);
        const rawScore = this.toNumber(scoreRow?.score) ?? 0;
        normalizedSum += (rawScore / maxScore) * 100;
      }
    }

    if (sampleSize === 0) {
      return { average: null as number | null, sampleSize: 0 };
    }

    return {
      average: this.round(normalizedSum / sampleSize),
      sampleSize,
    };
  }

  private buildSnapshotData(
    assessmentAverage: number | null,
    classRecordAverage: number | null,
    assessmentSampleSize: number,
    classRecordSampleSize: number,
  ): SnapshotData {
    let blendedScore: number | null = null;

    if (assessmentAverage !== null && classRecordAverage !== null) {
      blendedScore = this.round((assessmentAverage + classRecordAverage) / 2);
    } else if (assessmentAverage !== null) {
      blendedScore = assessmentAverage;
    } else if (classRecordAverage !== null) {
      blendedScore = classRecordAverage;
    }

    const hasData = blendedScore !== null;
    const isAtRisk =
      blendedScore !== null && blendedScore < PERFORMANCE_RISK_THRESHOLD;
    const now = new Date();

    return {
      assessmentAverage,
      classRecordAverage,
      blendedScore,
      assessmentSampleSize,
      classRecordSampleSize,
      hasData,
      isAtRisk,
      thresholdApplied: PERFORMANCE_RISK_THRESHOLD,
      lastComputedAt: now,
      updatedAt: now,
    };
  }

  private async upsertSnapshot(
    classId: string,
    studentId: string,
    data: SnapshotData,
    triggerSource: string,
  ) {
    const existing = await this.db.query.performanceSnapshots.findFirst({
      where: and(
        eq(performanceSnapshots.classId, classId),
        eq(performanceSnapshots.studentId, studentId),
      ),
      columns: { id: true, isAtRisk: true },
    });

    let stored:
      | {
          id: string;
          assessmentAverage: string | null;
          classRecordAverage: string | null;
          blendedScore: string | null;
          assessmentSampleSize: number;
          classRecordSampleSize: number;
          hasData: boolean;
          isAtRisk: boolean;
          thresholdApplied: string;
          lastComputedAt: Date;
        }
      | undefined;

    if (existing) {
      [stored] = await this.db
        .update(performanceSnapshots)
        .set({
          assessmentAverage:
            data.assessmentAverage !== null ? data.assessmentAverage.toString() : null,
          classRecordAverage:
            data.classRecordAverage !== null ? data.classRecordAverage.toString() : null,
          blendedScore:
            data.blendedScore !== null ? data.blendedScore.toString() : null,
          assessmentSampleSize: data.assessmentSampleSize,
          classRecordSampleSize: data.classRecordSampleSize,
          hasData: data.hasData,
          isAtRisk: data.isAtRisk,
          thresholdApplied: data.thresholdApplied.toString(),
          lastComputedAt: data.lastComputedAt,
          updatedAt: data.updatedAt,
        })
        .where(eq(performanceSnapshots.id, existing.id))
        .returning({
          id: performanceSnapshots.id,
          assessmentAverage: performanceSnapshots.assessmentAverage,
          classRecordAverage: performanceSnapshots.classRecordAverage,
          blendedScore: performanceSnapshots.blendedScore,
          assessmentSampleSize: performanceSnapshots.assessmentSampleSize,
          classRecordSampleSize: performanceSnapshots.classRecordSampleSize,
          hasData: performanceSnapshots.hasData,
          isAtRisk: performanceSnapshots.isAtRisk,
          thresholdApplied: performanceSnapshots.thresholdApplied,
          lastComputedAt: performanceSnapshots.lastComputedAt,
        });
    } else {
      [stored] = await this.db
        .insert(performanceSnapshots)
        .values({
          classId,
          studentId,
          assessmentAverage:
            data.assessmentAverage !== null ? data.assessmentAverage.toString() : null,
          classRecordAverage:
            data.classRecordAverage !== null ? data.classRecordAverage.toString() : null,
          blendedScore:
            data.blendedScore !== null ? data.blendedScore.toString() : null,
          assessmentSampleSize: data.assessmentSampleSize,
          classRecordSampleSize: data.classRecordSampleSize,
          hasData: data.hasData,
          isAtRisk: data.isAtRisk,
          thresholdApplied: data.thresholdApplied.toString(),
          lastComputedAt: data.lastComputedAt,
          updatedAt: data.updatedAt,
        })
        .returning({
          id: performanceSnapshots.id,
          assessmentAverage: performanceSnapshots.assessmentAverage,
          classRecordAverage: performanceSnapshots.classRecordAverage,
          blendedScore: performanceSnapshots.blendedScore,
          assessmentSampleSize: performanceSnapshots.assessmentSampleSize,
          classRecordSampleSize: performanceSnapshots.classRecordSampleSize,
          hasData: performanceSnapshots.hasData,
          isAtRisk: performanceSnapshots.isAtRisk,
          thresholdApplied: performanceSnapshots.thresholdApplied,
          lastComputedAt: performanceSnapshots.lastComputedAt,
        });
    }

    const previousIsAtRisk = existing?.isAtRisk ?? null;
    const shouldLog =
      data.hasData &&
      previousIsAtRisk !== null &&
      previousIsAtRisk !== data.isAtRisk;

    if (shouldLog) {
      await this.db.insert(performanceLogs).values({
        classId,
        studentId,
        previousIsAtRisk,
        currentIsAtRisk: data.isAtRisk,
        assessmentAverage:
          data.assessmentAverage !== null ? data.assessmentAverage.toString() : null,
        classRecordAverage:
          data.classRecordAverage !== null ? data.classRecordAverage.toString() : null,
        blendedScore:
          data.blendedScore !== null ? data.blendedScore.toString() : null,
        thresholdApplied: data.thresholdApplied.toString(),
        triggerSource,
      });
    }

    if (previousIsAtRisk !== null && previousIsAtRisk !== data.isAtRisk) {
      this.eventEmitter.emit(
        PerformanceStatusChangedEvent.eventName,
        new PerformanceStatusChangedEvent({
          classId,
          studentId,
          previousIsAtRisk,
          currentIsAtRisk: data.isAtRisk,
          blendedScore: data.blendedScore,
          thresholdApplied: data.thresholdApplied,
        }),
      );
    }

    return {
      id: stored?.id,
      studentId,
      classId,
      assessmentAverage: this.toNumber(stored?.assessmentAverage) ?? null,
      classRecordAverage: this.toNumber(stored?.classRecordAverage) ?? null,
      blendedScore: this.toNumber(stored?.blendedScore) ?? null,
      assessmentSampleSize: stored?.assessmentSampleSize ?? 0,
      classRecordSampleSize: stored?.classRecordSampleSize ?? 0,
      hasData: stored?.hasData ?? false,
      isAtRisk: stored?.isAtRisk ?? false,
      thresholdApplied: this.toNumber(stored?.thresholdApplied) ?? PERFORMANCE_RISK_THRESHOLD,
      lastComputedAt: stored?.lastComputedAt ?? data.lastComputedAt,
    };
  }

  async recomputeStudent(
    classId: string,
    studentId: string,
    triggerSource = 'manual_recompute',
  ) {
    const assessmentComponent = await this.getAssessmentComponent(classId, studentId);
    const classRecordComponent = await this.getClassRecordComponent(classId, studentId);
    const snapshotData = this.buildSnapshotData(
      assessmentComponent.average,
      classRecordComponent.average,
      assessmentComponent.sampleSize,
      classRecordComponent.sampleSize,
    );

    return this.upsertSnapshot(classId, studentId, snapshotData, triggerSource);
  }

  async recomputeStudentsForClass(
    classId: string,
    studentIds: string[],
    triggerSource: string,
  ) {
    const uniqueStudentIds = [...new Set(studentIds)];
    if (uniqueStudentIds.length === 0) return { recomputed: 0 };

    await Promise.all(
      uniqueStudentIds.map((studentId) =>
        this.recomputeStudent(classId, studentId, triggerSource),
      ),
    );

    return { recomputed: uniqueStudentIds.length };
  }

  async recomputeFromAssessmentSubmission(assessmentId: string, studentId: string) {
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
      columns: { classId: true },
    });

    if (!assessment) return { recomputed: 0 };
    await this.recomputeStudent(assessment.classId, studentId, 'assessment_submitted');
    return { recomputed: 1, classId: assessment.classId };
  }

  private async loadEnrolledStudents(classId: string) {
    return this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { studentId: true },
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
      orderBy: (enrollment, { asc }) => [asc(enrollment.studentId)],
    });
  }

  private async buildClassRows(classId: string): Promise<ClassPerformanceRow[]> {
    const enrolledStudents = await this.loadEnrolledStudents(classId);
    if (enrolledStudents.length === 0) return [];

    const studentIds = enrolledStudents.map((entry) => entry.studentId);

    const existingSnapshots = await this.db.query.performanceSnapshots.findMany({
      where: and(
        eq(performanceSnapshots.classId, classId),
        inArray(performanceSnapshots.studentId, studentIds),
      ),
    });

    const snapshotByStudent = new Map(
      existingSnapshots.map((snapshot) => [snapshot.studentId, snapshot]),
    );

    for (const studentId of studentIds) {
      if (snapshotByStudent.has(studentId)) continue;
      const recomputed = await this.recomputeStudent(classId, studentId, 'view_refresh');
      snapshotByStudent.set(studentId, {
        id: recomputed.id!,
        classId,
        studentId,
        assessmentAverage:
          recomputed.assessmentAverage !== null
            ? recomputed.assessmentAverage.toString()
            : null,
        classRecordAverage:
          recomputed.classRecordAverage !== null
            ? recomputed.classRecordAverage.toString()
            : null,
        blendedScore:
          recomputed.blendedScore !== null ? recomputed.blendedScore.toString() : null,
        assessmentSampleSize: recomputed.assessmentSampleSize,
        classRecordSampleSize: recomputed.classRecordSampleSize,
        hasData: recomputed.hasData,
        isAtRisk: recomputed.isAtRisk,
        thresholdApplied: recomputed.thresholdApplied.toString(),
        lastComputedAt: recomputed.lastComputedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const rows = enrolledStudents.map((entry) => {
      const snapshot = snapshotByStudent.get(entry.studentId);
      return {
        studentId: entry.studentId,
        firstName: entry.student?.firstName ?? null,
        lastName: entry.student?.lastName ?? null,
        email: entry.student?.email ?? null,
        assessmentAverage: this.toNumber(snapshot?.assessmentAverage) ?? null,
        classRecordAverage: this.toNumber(snapshot?.classRecordAverage) ?? null,
        blendedScore: this.toNumber(snapshot?.blendedScore) ?? null,
        assessmentSampleSize: snapshot?.assessmentSampleSize ?? 0,
        classRecordSampleSize: snapshot?.classRecordSampleSize ?? 0,
        hasData: snapshot?.hasData ?? false,
        isAtRisk: snapshot?.isAtRisk ?? false,
        thresholdApplied:
          this.toNumber(snapshot?.thresholdApplied) ?? PERFORMANCE_RISK_THRESHOLD,
        lastComputedAt: snapshot?.lastComputedAt ?? new Date(0),
      };
    });

    return rows.sort((a, b) => {
      const aScore = a.blendedScore ?? Number.POSITIVE_INFINITY;
      const bScore = b.blendedScore ?? Number.POSITIVE_INFINITY;
      return aScore - bScore;
    });
  }

  async recomputeClass(classId: string, userId: string, roles: string[]) {
    await this.assertClassAccess(classId, userId, roles);
    const enrolledStudents = await this.loadEnrolledStudents(classId);
    const studentIds = enrolledStudents.map((entry) => entry.studentId);
    await this.recomputeStudentsForClass(classId, studentIds, 'manual_recompute');
    const summary = await this.getClassSummary(classId, userId, roles);
    return {
      classId,
      recomputed: studentIds.length,
      atRiskCount: summary.atRiskCount,
      totalStudents: summary.totalStudents,
    };
  }

  async getClassSummary(classId: string, userId: string, roles: string[]) {
    await this.assertClassAccess(classId, userId, roles);
    const students = await this.buildClassRows(classId);
    const withData = students.filter((row) => row.hasData && row.blendedScore !== null);
    const withAssessmentData = students.filter(
      (row) => row.assessmentAverage !== null,
    );
    const withClassRecordData = students.filter(
      (row) => row.classRecordAverage !== null,
    );
    const atRiskCount = students.filter((row) => row.isAtRisk).length;

    const blendedAverage =
      withData.length > 0
        ? this.round(
            withData.reduce((sum, row) => sum + (row.blendedScore ?? 0), 0) /
              withData.length,
          )
        : null;

    const assessmentAverage =
      withAssessmentData.length > 0
        ? this.round(
            withAssessmentData.reduce(
              (sum, row) => sum + (row.assessmentAverage ?? 0),
              0,
            ) / withAssessmentData.length,
          )
        : null;

    const classRecordAverage =
      withClassRecordData.length > 0
        ? this.round(
            withClassRecordData.reduce(
              (sum, row) => sum + (row.classRecordAverage ?? 0),
              0,
            ) / withClassRecordData.length,
          )
        : null;

    return {
      classId,
      threshold: PERFORMANCE_RISK_THRESHOLD,
      totalStudents: students.length,
      studentsWithData: withData.length,
      atRiskCount,
      atRiskRate:
        students.length > 0
          ? this.round((atRiskCount / students.length) * 100)
          : 0,
      averages: {
        blended: blendedAverage,
        assessment: assessmentAverage,
        classRecord: classRecordAverage,
      },
      students,
    };
  }

  async getAtRiskStudents(classId: string, userId: string, roles: string[]) {
    const summary = await this.getClassSummary(classId, userId, roles);
    return {
      classId,
      threshold: summary.threshold,
      count: summary.students.filter((student) => student.isAtRisk).length,
      students: summary.students.filter((student) => student.isAtRisk),
    };
  }

  async getClassLogs(
    classId: string,
    userId: string,
    roles: string[],
    query: QueryPerformanceLogsDto,
  ) {
    await this.assertClassAccess(classId, userId, roles);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

    const whereClause = query.studentId
      ? and(
          eq(performanceLogs.classId, classId),
          eq(performanceLogs.studentId, query.studentId),
        )
      : eq(performanceLogs.classId, classId);

    const logs = await this.db.query.performanceLogs.findMany({
      where: whereClause,
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
      orderBy: (log, { desc: orderDesc }) => [orderDesc(log.createdAt)],
      limit,
    });

    return {
      classId,
      threshold: PERFORMANCE_RISK_THRESHOLD,
      count: logs.length,
      logs: logs.map((log) => ({
        id: log.id,
        studentId: log.studentId,
        student: log.student,
        previousIsAtRisk: log.previousIsAtRisk,
        currentIsAtRisk: log.currentIsAtRisk,
        assessmentAverage: this.toNumber(log.assessmentAverage),
        classRecordAverage: this.toNumber(log.classRecordAverage),
        blendedScore: this.toNumber(log.blendedScore),
        thresholdApplied: this.toNumber(log.thresholdApplied),
        triggerSource: log.triggerSource,
        createdAt: log.createdAt,
      })),
    };
  }

  async getStudentOwnSummary(studentId: string) {
    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
      columns: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!student) {
      throw new NotFoundException(`Student "${studentId}" not found`);
    }

    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { classId: true },
      with: {
        class: {
          columns: {
            id: true,
            subjectName: true,
            subjectCode: true,
          },
          with: {
            section: {
              columns: {
                id: true,
                name: true,
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    const activeClassEnrollments = studentEnrollments.filter(
      (
        enrollment,
      ): enrollment is typeof enrollment & { classId: string } =>
        enrollment.classId !== null,
    );

    const classSummaries = await Promise.all(
      activeClassEnrollments.map(async (enrollment) => {
        const snapshot = await this.recomputeStudent(
          enrollment.classId,
          studentId,
          'view_refresh',
        );

        return {
          classId: enrollment.classId,
          class: enrollment.class
            ? {
                id: enrollment.class.id,
                subjectName: enrollment.class.subjectName,
                subjectCode: enrollment.class.subjectCode,
                section: enrollment.class.section,
              }
            : null,
          assessmentAverage: snapshot.assessmentAverage,
          classRecordAverage: snapshot.classRecordAverage,
          blendedScore: snapshot.blendedScore,
          assessmentSampleSize: snapshot.assessmentSampleSize,
          classRecordSampleSize: snapshot.classRecordSampleSize,
          hasData: snapshot.hasData,
          isAtRisk: snapshot.isAtRisk,
          thresholdApplied: snapshot.thresholdApplied,
          lastComputedAt: snapshot.lastComputedAt,
        };
      }),
    );

    const classesWithData = classSummaries.filter(
      (entry) => entry.hasData && entry.blendedScore !== null,
    );
    const atRiskClasses = classSummaries.filter((entry) => entry.isAtRisk).length;

    return {
      student,
      threshold: PERFORMANCE_RISK_THRESHOLD,
      classes: classSummaries,
      overall: {
        totalClasses: classSummaries.length,
        classesWithData: classesWithData.length,
        atRiskClasses,
        averageBlendedScore:
          classesWithData.length > 0
            ? this.round(
                classesWithData.reduce(
                  (sum, entry) => sum + (entry.blendedScore ?? 0),
                  0,
                ) / classesWithData.length,
              )
            : null,
      },
    };
  }
}

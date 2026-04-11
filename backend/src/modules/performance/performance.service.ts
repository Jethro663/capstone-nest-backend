import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  aiGenerationJobs,
  aiGenerationOutputs,
  assessments,
  assessmentQuestions,
  assessmentAttempts,
  assessmentResponses,
  classRecords,
  classes,
  contentChunks,
  enrollments,
  interventionCases,
  performanceLogs,
  performanceSnapshots,
  studentConceptMastery,
  users,
} from '../../drizzle/schema';
import { PerformanceStatusChangedEvent } from '../../common/events';
import { QueryPerformanceLogsDto } from './DTO/query-performance-logs.dto';
import { AuditService } from '../audit/audit.service';
import { CreatePerformanceAnalysisJobDto } from './DTO/create-performance-analysis-job.dto';

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

type LearningGapRow = {
  concept: string;
  wrongCount: number;
  evidenceCount: number;
  masteryScore: number;
  lessonEvidence: Array<{
    chunkId: string;
    lessonId: string | null;
    excerpt: string;
    sourceType: string;
  }>;
};

@Injectable()
export class PerformanceService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isAdmin(roles: string[]): boolean {
    return roles.includes('admin');
  }

  private getActorRole(roles: string[]): 'admin' | 'teacher' | 'unknown' {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('teacher')) return 'teacher';
    return 'unknown';
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
    const average =
      values.reduce((sum, score) => sum + score, 0) / values.length;
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

        const scoreRow = item.scores.find(
          (score) => score.studentId === studentId,
        );
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
            data.assessmentAverage !== null
              ? data.assessmentAverage.toString()
              : null,
          classRecordAverage:
            data.classRecordAverage !== null
              ? data.classRecordAverage.toString()
              : null,
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
            data.assessmentAverage !== null
              ? data.assessmentAverage.toString()
              : null,
          classRecordAverage:
            data.classRecordAverage !== null
              ? data.classRecordAverage.toString()
              : null,
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
          data.assessmentAverage !== null
            ? data.assessmentAverage.toString()
            : null,
        classRecordAverage:
          data.classRecordAverage !== null
            ? data.classRecordAverage.toString()
            : null,
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
      thresholdApplied:
        this.toNumber(stored?.thresholdApplied) ?? PERFORMANCE_RISK_THRESHOLD,
      lastComputedAt: stored?.lastComputedAt ?? data.lastComputedAt,
    };
  }

  async recomputeStudent(
    classId: string,
    studentId: string,
    triggerSource = 'manual_recompute',
  ) {
    const assessmentComponent = await this.getAssessmentComponent(
      classId,
      studentId,
    );
    const classRecordComponent = await this.getClassRecordComponent(
      classId,
      studentId,
    );
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

  async recomputeFromAssessmentSubmission(
    assessmentId: string,
    studentId: string,
  ) {
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
      columns: { classId: true },
    });

    if (!assessment) return { recomputed: 0 };
    await this.recomputeStudent(
      assessment.classId,
      studentId,
      'assessment_submitted',
    );
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

  private async buildClassRows(
    classId: string,
  ): Promise<ClassPerformanceRow[]> {
    const enrolledStudents = await this.loadEnrolledStudents(classId);
    if (enrolledStudents.length === 0) return [];

    const studentIds = enrolledStudents.map((entry) => entry.studentId);

    const existingSnapshots = await this.db.query.performanceSnapshots.findMany(
      {
        where: and(
          eq(performanceSnapshots.classId, classId),
          inArray(performanceSnapshots.studentId, studentIds),
        ),
      },
    );

    const snapshotByStudent = new Map(
      existingSnapshots.map((snapshot) => [snapshot.studentId, snapshot]),
    );

    for (const studentId of studentIds) {
      if (snapshotByStudent.has(studentId)) continue;
      const recomputed = await this.recomputeStudent(
        classId,
        studentId,
        'view_refresh',
      );
      snapshotByStudent.set(studentId, {
        id: recomputed.id,
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
          recomputed.blendedScore !== null
            ? recomputed.blendedScore.toString()
            : null,
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
          this.toNumber(snapshot?.thresholdApplied) ??
          PERFORMANCE_RISK_THRESHOLD,
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
    await this.recomputeStudentsForClass(
      classId,
      studentIds,
      'manual_recompute',
    );
    const summary = await this.getClassSummary(classId, userId, roles);
    await this.auditService.log({
      actorId: userId,
      action: 'performance.class.recomputed',
      targetType: 'class',
      targetId: classId,
      metadata: {
        actorRole: this.getActorRole(roles),
        recomputedStudentCount: studentIds.length,
        atRiskCount: summary.atRiskCount,
        totalStudents: summary.totalStudents,
      },
    });
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
    const withData = students.filter(
      (row) => row.hasData && row.blendedScore !== null,
    );
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

  private normalizeConceptKey(raw: string): string {
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) return '';
    return normalized.slice(0, 120);
  }

  private extractConceptCandidates(
    conceptTags: unknown,
    questionContent: string,
  ): string[] {
    if (Array.isArray(conceptTags)) {
      const tags = conceptTags
        .map((tag) => this.normalizeConceptKey(String(tag)))
        .filter((tag) => tag.length > 0);
      if (tags.length > 0) return tags;
    }

    const fallback = questionContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5)
      .join(' ');
    const normalizedFallback = this.normalizeConceptKey(fallback);
    return normalizedFallback ? [normalizedFallback] : ['unknown concept'];
  }

  private runtimeProgressForStatus(status: string): number {
    switch (status) {
      case 'pending':
        return 5;
      case 'processing':
        return 60;
      case 'completed':
      case 'approved':
      case 'rejected':
      case 'failed':
        return 100;
      default:
        return 0;
    }
  }

  private async assertAnalysisJobAccess(
    jobId: string,
    userId: string,
    roles: string[],
  ) {
    const job = await this.db.query.aiGenerationJobs.findFirst({
      where: eq(aiGenerationJobs.id, jobId),
      columns: {
        id: true,
        classId: true,
        teacherId: true,
        jobType: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
    if (!job || job.jobType !== 'performance_diagnostics') {
      throw new NotFoundException(`Analysis job "${jobId}" not found`);
    }

    if (this.isAdmin(roles)) {
      return job;
    }

    if (job.teacherId === userId) {
      return job;
    }

    if (!job.classId) {
      throw new ForbiddenException('Access denied');
    }

    await this.assertClassAccess(job.classId, userId, roles);
    return job;
  }

  private async buildPerformanceDiagnostics(
    classId: string,
    studentId?: string,
    teacherNote?: string,
  ) {
    const incorrectResponses = await this.db.query.assessmentResponses.findMany({
      where: eq(assessmentResponses.isCorrect, false),
      with: {
        attempt: {
          columns: {
            id: true,
            studentId: true,
            assessmentId: true,
            submittedAt: true,
            isSubmitted: true,
            score: true,
          },
          with: {
            assessment: {
              columns: {
                id: true,
                classId: true,
                title: true,
                type: true,
              },
            },
          },
        },
        question: {
          columns: {
            id: true,
            content: true,
            conceptTags: true,
          },
        },
      },
      orderBy: [desc(assessmentResponses.createdAt)],
      limit: 500,
    });

    const filteredMistakes = incorrectResponses.filter((response) => {
      const attempt = response.attempt;
      if (!attempt?.isSubmitted) return false;
      if (attempt.assessment?.classId !== classId) return false;
      if (studentId && attempt.studentId !== studentId) return false;
      return true;
    });

    const conceptMap = new Map<string, { wrongCount: number; evidenceCount: number }>();
    const perStudentConcept = new Map<
      string,
      Map<string, { wrongCount: number; evidenceCount: number }>
    >();
    const scoreBreakdownMap = new Map<
      string,
      { assessmentId: string; title: string; scores: number[]; type: string | null }
    >();

    for (const response of filteredMistakes) {
      const attempt = response.attempt;
      const assessment = attempt?.assessment;
      const question = response.question;
      if (!attempt || !assessment || !question) continue;

      const scoreBucket = scoreBreakdownMap.get(assessment.id) ?? {
        assessmentId: assessment.id,
        title: assessment.title,
        scores: [],
        type: assessment.type,
      };
      if (typeof attempt.score === 'number') {
        scoreBucket.scores.push(attempt.score);
      }
      scoreBreakdownMap.set(assessment.id, scoreBucket);

      const concepts = this.extractConceptCandidates(
        question.conceptTags,
        question.content,
      );
      for (const concept of concepts) {
        const existing = conceptMap.get(concept) ?? { wrongCount: 0, evidenceCount: 0 };
        existing.wrongCount += 1;
        existing.evidenceCount += 1;
        conceptMap.set(concept, existing);

        const studentKey = attempt.studentId;
        const studentConceptMap = perStudentConcept.get(studentKey) ?? new Map();
        const studentConcept =
          studentConceptMap.get(concept) ?? { wrongCount: 0, evidenceCount: 0 };
        studentConcept.wrongCount += 1;
        studentConcept.evidenceCount += 1;
        studentConceptMap.set(concept, studentConcept);
        perStudentConcept.set(studentKey, studentConceptMap);
      }
    }

    const conceptsSorted = [...conceptMap.entries()]
      .sort((a, b) => b[1].wrongCount - a[1].wrongCount)
      .slice(0, 8);

    const learningGaps: LearningGapRow[] = [];
    for (const [concept, values] of conceptsSorted) {
      const likePattern = `%${concept}%`;
      const evidenceRows = await this.db.execute(sql`
        SELECT id, lesson_id, source_type, chunk_text
        FROM content_chunks
        WHERE class_id = ${classId}
          AND lower(chunk_text) LIKE ${likePattern}
        ORDER BY updated_at DESC
        LIMIT 3
      `);

      const lessonEvidence = evidenceRows.rows.map((row: any) => ({
        chunkId: String(row.id),
        lessonId: row.lesson_id ? String(row.lesson_id) : null,
        sourceType: String(row.source_type),
        excerpt: String(row.chunk_text ?? '').slice(0, 220),
      }));

      const masteryScore = Math.max(0, 100 - values.wrongCount * 12);
      learningGaps.push({
        concept,
        wrongCount: values.wrongCount,
        evidenceCount: values.evidenceCount,
        masteryScore,
        lessonEvidence,
      });
    }

    for (const [studentKey, concepts] of perStudentConcept.entries()) {
      for (const [concept, values] of concepts.entries()) {
        const masteryScore = Math.max(0, 100 - values.wrongCount * 12);
        await this.db.execute(sql`
          INSERT INTO student_concept_mastery (
            student_id,
            class_id,
            concept_key,
            evidence_count,
            error_count,
            mastery_score,
            last_seen_at,
            updated_at
          )
          VALUES (
            ${studentKey},
            ${classId},
            ${concept},
            ${values.evidenceCount},
            ${values.wrongCount},
            ${masteryScore},
            NOW(),
            NOW()
          )
          ON CONFLICT (student_id, class_id, concept_key)
          DO UPDATE SET
            evidence_count = GREATEST(student_concept_mastery.evidence_count, EXCLUDED.evidence_count),
            error_count = GREATEST(student_concept_mastery.error_count, EXCLUDED.error_count),
            mastery_score = LEAST(student_concept_mastery.mastery_score, EXCLUDED.mastery_score),
            last_seen_at = NOW(),
            updated_at = NOW()
        `);
      }
    }

    const scoreBreakdown = [...scoreBreakdownMap.values()]
      .map((item) => {
        const average =
          item.scores.length > 0
            ? this.round(item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length)
            : null;
        return {
          assessmentId: item.assessmentId,
          title: item.title,
          category: item.type ?? 'quiz',
          averageScore: average,
          attemptCount: item.scores.length,
        };
      })
      .sort((a, b) => (a.averageScore ?? Number.POSITIVE_INFINITY) - (b.averageScore ?? Number.POSITIVE_INFINITY))
      .slice(0, 10);

    const evidence = filteredMistakes.slice(0, 8).map((entry) => ({
      studentId: entry.attempt?.studentId ?? null,
      assessmentId: entry.attempt?.assessmentId ?? null,
      assessmentTitle: entry.attempt?.assessment?.title ?? null,
      questionId: entry.questionId,
      questionText: entry.question?.content ?? '',
      studentAnswer: entry.studentAnswer,
      submittedAt: entry.attempt?.submittedAt ?? null,
    }));

    const insufficientEvidence = filteredMistakes.length < 2 || learningGaps.length === 0;
    const teacherActions = insufficientEvidence
      ? [
          'Collect more submitted attempts before relying on AI learning-gap signals.',
          'Recompute performance after the next graded assessment.',
        ]
      : [
          'Start intervention with the top two weak concepts and verify improvement after one retry.',
          'Use lesson evidence references to align remediation to exact misconceptions.',
        ];

    const recommendedIntervention = {
      shouldOpenCase:
        !insufficientEvidence &&
        learningGaps.length > 0 &&
        learningGaps.some((gap) => gap.masteryScore < PERFORMANCE_RISK_THRESHOLD),
      status: insufficientEvidence ? 'insufficient_evidence' : 'actionable',
      topConcepts: learningGaps.slice(0, 3).map((gap) => gap.concept),
    };

    return {
      classId,
      studentId: studentId ?? null,
      generatedAt: new Date().toISOString(),
      insufficientEvidence,
      teacherNote: teacherNote?.trim() || null,
      learningGaps,
      scoreBreakdown,
      evidence,
      teacherActions,
      recommendedIntervention,
    };
  }

  private async runPerformanceAnalysisJob(
    jobId: string,
    classId: string,
    teacherId: string,
    studentId?: string,
    note?: string,
  ) {
    try {
      await this.db
        .update(aiGenerationJobs)
        .set({
          status: 'processing',
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(aiGenerationJobs.id, jobId));

      const diagnostics = await this.buildPerformanceDiagnostics(
        classId,
        studentId,
        note,
      );

      await this.db.insert(aiGenerationOutputs).values({
        jobId,
        outputType: 'performance_diagnostic',
        targetClassId: classId,
        targetTeacherId: teacherId,
        sourceFilters: { classId, studentId: studentId ?? null },
        structuredOutput: diagnostics,
        status: 'completed',
      });

      await this.db
        .update(aiGenerationJobs)
        .set({
          status: 'completed',
          updatedAt: new Date(),
          errorMessage: null,
        })
        .where(eq(aiGenerationJobs.id, jobId));
    } catch (error) {
      await this.db
        .update(aiGenerationJobs)
        .set({
          status: 'failed',
          updatedAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : 'Performance analysis failed',
        })
        .where(eq(aiGenerationJobs.id, jobId));
    }
  }

  async createPerformanceAnalysisJob(
    classId: string,
    dto: CreatePerformanceAnalysisJobDto,
    userId: string,
    roles: string[],
  ) {
    await this.assertClassAccess(classId, userId, roles);

    if (dto.studentId) {
      const enrollment = await this.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.classId, classId),
          eq(enrollments.studentId, dto.studentId),
          eq(enrollments.status, 'enrolled'),
        ),
        columns: { studentId: true },
      });
      if (!enrollment) {
        throw new BadRequestException('Selected student is not enrolled in this class.');
      }
    }

    const [job] = await this.db
      .insert(aiGenerationJobs)
      .values({
        jobType: 'performance_diagnostics',
        classId,
        teacherId: userId,
        status: 'pending',
        sourceFilters: {
          classId,
          studentId: dto.studentId ?? null,
          note: dto.note ?? null,
        },
      })
      .returning({
        id: aiGenerationJobs.id,
      });

    setTimeout(() => {
      void this.runPerformanceAnalysisJob(
        job.id,
        classId,
        userId,
        dto.studentId,
        dto.note,
      );
    }, 0);

    await this.auditService.log({
      actorId: userId,
      action: 'performance.analysis.queued',
      targetType: 'class',
      targetId: classId,
      metadata: {
        jobId: job.id,
        studentId: dto.studentId ?? null,
      },
    });

    return {
      jobId: job.id,
      jobType: 'performance_diagnostics',
      status: 'pending',
      progressPercent: 5,
      statusMessage: 'Queued',
    };
  }

  async getPerformanceAnalysisJobStatus(
    jobId: string,
    userId: string,
    roles: string[],
  ) {
    const job = await this.assertAnalysisJobAccess(jobId, userId, roles);
    const output = await this.db.query.aiGenerationOutputs.findFirst({
      where: and(
        eq(aiGenerationOutputs.jobId, job.id),
        eq(aiGenerationOutputs.outputType, 'performance_diagnostic'),
      ),
      columns: { id: true, createdAt: true },
      orderBy: [desc(aiGenerationOutputs.createdAt)],
    });

    return {
      jobId: job.id,
      jobType: job.jobType,
      status: job.status,
      progressPercent: this.runtimeProgressForStatus(job.status),
      statusMessage:
        job.status === 'failed'
          ? 'Analysis failed'
          : job.status === 'completed'
            ? 'Analysis ready'
            : 'Analyzing performance evidence',
      errorMessage: job.errorMessage,
      outputId: output?.id ?? null,
      updatedAt: job.updatedAt,
    };
  }

  async getPerformanceAnalysisJobResult(
    jobId: string,
    userId: string,
    roles: string[],
  ) {
    const job = await this.assertAnalysisJobAccess(jobId, userId, roles);
    if (!['completed', 'approved'].includes(job.status)) {
      throw new ConflictException('Analysis result is not ready yet.');
    }

    const output = await this.db.query.aiGenerationOutputs.findFirst({
      where: and(
        eq(aiGenerationOutputs.jobId, job.id),
        eq(aiGenerationOutputs.outputType, 'performance_diagnostic'),
      ),
      columns: {
        id: true,
        outputType: true,
        structuredOutput: true,
      },
      orderBy: [desc(aiGenerationOutputs.createdAt)],
    });
    if (!output) {
      throw new NotFoundException('Analysis result not found.');
    }

    return {
      job: {
        jobId: job.id,
        jobType: job.jobType,
        status: job.status,
        outputId: output.id,
        updatedAt: job.updatedAt,
      },
      result: {
        outputId: output.id,
        outputType: output.outputType,
        structuredOutput: output.structuredOutput,
      },
    };
  }

  async getClassDiagnostics(classId: string, userId: string, roles: string[]) {
    await this.assertClassAccess(classId, userId, roles);
    const summary = await this.getClassSummary(classId, userId, roles);
    const diagnostics = await this.buildPerformanceDiagnostics(classId);

    const lowestAssessments = diagnostics.scoreBreakdown.slice(0, 5);
    const conceptHotspots = diagnostics.learningGaps.slice(0, 5).map((gap) => ({
      concept: gap.concept,
      wrongCount: gap.wrongCount,
      masteryScore: gap.masteryScore,
      evidenceCount: gap.evidenceCount,
    }));

    return {
      classId,
      threshold: summary.threshold,
      lowestAssessments,
      conceptHotspots,
      studentCount: summary.totalStudents,
      atRiskCount: summary.atRiskCount,
      insufficientEvidence: diagnostics.insufficientEvidence,
    };
  }

  async getAdminAnalytics(userId: string, roles: string[]) {
    if (!this.isAdmin(roles)) {
      throw new ForbiddenException('Access denied');
    }

    const masteryRows = await this.db.query.studentConceptMastery.findMany({
      columns: {
        id: true,
        classId: true,
        studentId: true,
        conceptKey: true,
        errorCount: true,
        masteryScore: true,
        updatedAt: true,
      },
      orderBy: [desc(studentConceptMastery.updatedAt)],
      limit: 120,
    });

    const recommendationRows = await this.db.query.aiGenerationOutputs.findMany({
      where: inArray(aiGenerationOutputs.outputType, [
        'intervention_recommendation',
        'performance_diagnostic',
      ]),
      columns: {
        id: true,
        outputType: true,
        targetClassId: true,
        targetTeacherId: true,
        createdAt: true,
      },
      orderBy: [desc(aiGenerationOutputs.createdAt)],
      limit: 100,
    });

    const recentLogs = await this.db.query.performanceLogs.findMany({
      columns: {
        id: true,
        classId: true,
        studentId: true,
        previousIsAtRisk: true,
        currentIsAtRisk: true,
        triggerSource: true,
        createdAt: true,
      },
      orderBy: [desc(performanceLogs.createdAt)],
      limit: 150,
    });

    const transitionSummary = recentLogs.reduce(
      (acc, row) => {
        if (row.previousIsAtRisk === false && row.currentIsAtRisk === true) {
          acc.riskIncrements += 1;
        } else if (
          row.previousIsAtRisk === true &&
          row.currentIsAtRisk === false
        ) {
          acc.riskRecoveries += 1;
        } else {
          acc.otherTransitions += 1;
        }
        return acc;
      },
      { riskIncrements: 0, riskRecoveries: 0, otherTransitions: 0 },
    );

    await this.auditService.log({
      actorId: userId,
      action: 'performance.admin.analytics_viewed',
      targetType: 'system',
      targetId: 'performance',
      metadata: {
        conceptRows: masteryRows.length,
        recommendationRows: recommendationRows.length,
        performanceLogRows: recentLogs.length,
      },
    });

    return {
      conceptMasterySnapshots: masteryRows,
      recommendationHistory: recommendationRows,
      performanceLogTransitions: {
        total: recentLogs.length,
        summary: transitionSummary,
        rows: recentLogs,
      },
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
      (enrollment): enrollment is typeof enrollment & { classId: string } =>
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
    const atRiskClasses = classSummaries.filter(
      (entry) => entry.isAtRisk,
    ).length;

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

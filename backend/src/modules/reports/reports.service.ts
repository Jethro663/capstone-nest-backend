import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessmentAttempts,
  assessments,
  auditLogs,
  classes,
  enrollments,
  interventionCases,
  lessons,
  lessonCompletions,
  lxpProgress,
  performanceSnapshots,
  sections,
  studentProfiles,
  users,
} from '../../drizzle/schema';
import type { ReportQuery } from './dto/report-query.dto';

type ExportableRow = Record<string, unknown>;

@Injectable()
export class ReportsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private buildDateRange<TColumn>(column: TColumn, query: ReportQuery) {
    return and(
      query.dateFrom ? gte(column as never, query.dateFrom as never) : undefined,
      query.dateTo ? lte(column as never, query.dateTo as never) : undefined,
    );
  }

  private paginate(total: number, query: ReportQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    return {
      page,
      limit,
      offset: (page - 1) * limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  private toCsv(rows: ExportableRow[]) {
    if (rows.length === 0) return 'No data\n';

    const headers = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row))),
    );
    const escape = (value: unknown) => {
      const normalized =
        value === null || value === undefined
          ? ''
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      return `"${normalized.replace(/"/g, '""')}"`;
    };

    return [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
    ].join('\n');
  }

  private toPublicFilters(query: ReportQuery): ReportQuery {
    return {
      classId: query.classId,
      sectionId: query.sectionId,
      gradingPeriod: query.gradingPeriod,
      studentId: query.studentId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      limit: query.limit,
      export: query.export,
    };
  }

  private async resolveClassScopeIds(query: ReportQuery): Promise<string[] | null> {
    if (!query.teacherId && !query.classId && !query.sectionId) {
      return null;
    }

    const classRows = await this.db.query.classes.findMany({
      where: and(
        query.teacherId ? eq(classes.teacherId, query.teacherId) : undefined,
        query.classId ? eq(classes.id, query.classId) : undefined,
        query.sectionId ? eq(classes.sectionId, query.sectionId) : undefined,
      ),
      columns: { id: true },
    });

    return classRows.map((row) => row.id);
  }

  async getStudentMasterList(query: ReportQuery) {
    const classScopeIds = await this.resolveClassScopeIds(query);
    if (classScopeIds && classScopeIds.length === 0) {
      const pagination = this.paginate(0, query);
      return {
        data: [],
        filters: this.toPublicFilters(query),
        generatedAt: new Date().toISOString(),
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: pagination.totalPages,
        csv: this.toCsv([]),
      };
    }

    const whereClause = and(
      eq(enrollments.status, 'enrolled'),
      classScopeIds ? inArray(enrollments.classId, classScopeIds) : undefined,
      query.studentId ? eq(enrollments.studentId, query.studentId) : undefined,
    );

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(enrollments)
      .where(whereClause);

    const total = Number(totalRow?.total ?? 0);
    const pagination = this.paginate(total, query);

    const data = await this.db
      .select({
        enrollmentId: enrollments.id,
        enrolledAt: enrollments.enrolledAt,
        studentId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        lrn: studentProfiles.lrn,
        gradeLevel: studentProfiles.gradeLevel,
        classId: classes.id,
        subjectName: classes.subjectName,
        subjectCode: classes.subjectCode,
        sectionId: sections.id,
        sectionName: sections.name,
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(classes, eq(classes.id, enrollments.classId))
      .leftJoin(sections, eq(sections.id, enrollments.sectionId))
      .where(whereClause)
      .orderBy(users.lastName, users.firstName)
      .limit(pagination.limit)
      .offset(pagination.offset);

    return {
      data,
      filters: this.toPublicFilters(query),
      generatedAt: new Date().toISOString(),
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: pagination.totalPages,
      csv: this.toCsv(data),
    };
  }

  async getClassEnrollment(query: ReportQuery) {
    const classScopeIds = await this.resolveClassScopeIds(query);
    if (classScopeIds && classScopeIds.length === 0) {
      const pagination = this.paginate(0, query);
      return {
        data: [],
        filters: this.toPublicFilters(query),
        generatedAt: new Date().toISOString(),
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: pagination.totalPages,
        csv: this.toCsv([]),
      };
    }

    const classFilters = and(
      classScopeIds ? inArray(classes.id, classScopeIds) : undefined,
    );

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(classes)
      .where(classFilters);

    const total = Number(totalRow?.total ?? 0);
    const pagination = this.paginate(total, query);

    const rows = await this.db.query.classes.findMany({
      where: classFilters,
      with: {
        section: {
          columns: { id: true, name: true, gradeLevel: true },
        },
        teacher: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
        enrollments: {
          where: eq(enrollments.status, 'enrolled'),
          with: {
            student: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
              with: {
                profile: {
                  columns: { lrn: true, gradeLevel: true },
                },
              },
            },
          },
        },
      },
      orderBy: [desc(classes.createdAt)],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    const data = rows.map((row) => ({
      id: row.id,
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
      schoolYear: row.schoolYear,
      section: row.section,
      teacher: row.teacher,
      enrollmentCount: row.enrollments.length,
      students: row.enrollments.map((enrollment) => ({
        id: enrollment.student.id,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        email: enrollment.student.email,
        lrn: enrollment.student.profile?.lrn ?? null,
        gradeLevel: enrollment.student.profile?.gradeLevel ?? null,
        enrolledAt: enrollment.enrolledAt,
      })),
    }));

    return {
      data,
      filters: this.toPublicFilters(query),
      generatedAt: new Date().toISOString(),
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: pagination.totalPages,
      csv: this.toCsv(
        data.flatMap((row) =>
          row.students.map((student) => ({
            classId: row.id,
            subjectName: row.subjectName,
            subjectCode: row.subjectCode,
            sectionName: row.section?.name ?? null,
            studentId: student.id,
            studentName: `${student.lastName}, ${student.firstName}`,
            email: student.email,
            lrn: student.lrn,
            enrolledAt: student.enrolledAt,
          })),
        ),
      ),
    };
  }

  async getStudentPerformance(query: ReportQuery) {
    const classScopeIds = await this.resolveClassScopeIds(query);
    const rows =
      classScopeIds && classScopeIds.length === 0
        ? []
        : await this.db.query.performanceSnapshots.findMany({
            where: and(
              query.studentId
                ? eq(performanceSnapshots.studentId, query.studentId)
                : undefined,
              classScopeIds
                ? inArray(performanceSnapshots.classId, classScopeIds)
                : undefined,
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
              class: {
                columns: { id: true, subjectName: true, subjectCode: true },
              },
            },
            orderBy: [desc(performanceSnapshots.lastComputedAt)],
          },
        );

    const data = rows.map((row) => ({
      classId: row.classId,
      subjectName: row.class?.subjectName ?? '',
      subjectCode: row.class?.subjectCode ?? '',
      studentId: row.studentId,
      firstName: row.student?.firstName ?? '',
      lastName: row.student?.lastName ?? '',
      email: row.student?.email ?? '',
      assessmentAverage: row.assessmentAverage ? Number(row.assessmentAverage) : null,
      classRecordAverage: row.classRecordAverage ? Number(row.classRecordAverage) : null,
      blendedScore: row.blendedScore ? Number(row.blendedScore) : null,
      isAtRisk: row.isAtRisk,
      thresholdApplied: row.thresholdApplied ? Number(row.thresholdApplied) : null,
      lastComputedAt: row.lastComputedAt?.toISOString?.() ?? null,
    }));

    return {
      data,
      filters: this.toPublicFilters(query),
      generatedAt: new Date().toISOString(),
      csv: this.toCsv(data),
    };
  }

  async getInterventionParticipation(query: ReportQuery) {
    const classScopeIds = await this.resolveClassScopeIds(query);
    if (classScopeIds && classScopeIds.length === 0) {
      return {
        data: [],
        filters: this.toPublicFilters(query),
        generatedAt: new Date().toISOString(),
        csv: this.toCsv([]),
      };
    }

    const whereClause = and(
      classScopeIds ? inArray(interventionCases.classId, classScopeIds) : undefined,
      query.studentId ? eq(interventionCases.studentId, query.studentId) : undefined,
      this.buildDateRange(interventionCases.openedAt, query),
    );

    const cases = await this.db.query.interventionCases.findMany({
      where: whereClause,
      with: {
        class: {
          columns: {
            id: true,
            subjectName: true,
            subjectCode: true,
          },
          with: {
            section: {
              columns: { id: true, name: true, gradeLevel: true },
            },
          },
        },
        student: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
        assignments: {
          columns: { id: true, isCompleted: true, completedAt: true },
        },
      },
      orderBy: [desc(interventionCases.openedAt)],
    });

    const progressRows = cases.length
      ? await this.db.query.lxpProgress.findMany({
          where: and(
            classScopeIds ? inArray(lxpProgress.classId, classScopeIds) : undefined,
            inArray(
              lxpProgress.studentId,
              cases.map((entry) => entry.studentId),
            ),
          ),
        })
      : [];

    const progressMap = new Map(
      progressRows.map((row) => [`${row.studentId}:${row.classId}`, row]),
    );

    const data = cases.map((entry) => {
      const completedAssignments = entry.assignments.filter(
        (assignment) => assignment.isCompleted,
      ).length;
      const progress = progressMap.get(`${entry.studentId}:${entry.classId}`);

      return {
        caseId: entry.id,
        classId: entry.classId,
        subjectName: entry.class?.subjectName ?? null,
        subjectCode: entry.class?.subjectCode ?? null,
        sectionName: entry.class?.section?.name ?? null,
        studentId: entry.studentId,
        studentName: `${entry.student?.lastName ?? ''}, ${entry.student?.firstName ?? ''}`.trim(),
        email: entry.student?.email ?? null,
        status: entry.status,
        triggerScore: entry.triggerScore,
        thresholdApplied: entry.thresholdApplied,
        openedAt: entry.openedAt,
        closedAt: entry.closedAt,
        assignmentCount: entry.assignments.length,
        completedAssignments,
        completionRate:
          entry.assignments.length > 0
            ? Math.round((completedAssignments / entry.assignments.length) * 100)
            : 0,
        xpTotal: progress?.xpTotal ?? 0,
        checkpointsCompleted: progress?.checkpointsCompleted ?? 0,
      };
    });

    return {
      data,
      filters: this.toPublicFilters(query),
      generatedAt: new Date().toISOString(),
      csv: this.toCsv(data),
    };
  }

  async getAssessmentSummary(query: ReportQuery) {
    const classScopeIds = await this.resolveClassScopeIds(query);
    if (classScopeIds && classScopeIds.length === 0) {
      return {
        data: [],
        filters: this.toPublicFilters(query),
        generatedAt: new Date().toISOString(),
        csv: this.toCsv([]),
      };
    }

    const whereClause = and(
      classScopeIds ? inArray(assessments.classId, classScopeIds) : undefined,
      query.gradingPeriod ? eq(assessments.quarter, query.gradingPeriod) : undefined,
      this.buildDateRange(assessments.createdAt, query),
    );

    const rows = await this.db.query.assessments.findMany({
      where: whereClause,
      with: {
        class: {
          columns: {
            id: true,
            subjectName: true,
            subjectCode: true,
          },
          with: {
            section: {
              columns: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [desc(assessments.createdAt)],
    });

    const assessmentIds = rows.map((row) => row.id);
    const attempts = assessmentIds.length
      ? await this.db.query.assessmentAttempts.findMany({
          where: inArray(assessmentAttempts.assessmentId, assessmentIds),
          columns: {
            assessmentId: true,
            score: true,
            isSubmitted: true,
            studentId: true,
          },
        })
      : [];

    const grouped = new Map<string, typeof attempts>();
    for (const attempt of attempts) {
      const bucket = grouped.get(attempt.assessmentId) ?? [];
      bucket.push(attempt);
      grouped.set(attempt.assessmentId, bucket);
    }

    const data = rows.map((row) => {
      const bucket = grouped.get(row.id) ?? [];
      const submitted = bucket.filter((attempt) => attempt.isSubmitted);
      const average =
        submitted.length > 0
          ? submitted.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
            submitted.length
          : null;

      return {
        id: row.id,
        title: row.title,
        type: row.type,
        classId: row.classId,
        subjectName: row.class?.subjectName ?? null,
        subjectCode: row.class?.subjectCode ?? null,
        sectionName: row.class?.section?.name ?? null,
        quarter: row.quarter,
        isPublished: row.isPublished,
        dueDate: row.dueDate,
        totalPoints: row.totalPoints,
        maxAttempts: row.maxAttempts,
        submittedAttempts: submitted.length,
        uniqueStudents: new Set(submitted.map((attempt) => attempt.studentId)).size,
        averageScore: average === null ? null : Math.round(average * 100) / 100,
      };
    });

    return {
      data,
      filters: this.toPublicFilters(query),
      generatedAt: new Date().toISOString(),
      csv: this.toCsv(data),
    };
  }

  async getSystemUsage(query: ReportQuery) {
    const classScopeIds = await this.resolveClassScopeIds(query);
    const hasClassScope = Boolean(classScopeIds);
    if (classScopeIds && classScopeIds.length === 0) {
      return {
        data: {
          lessonCompletions: 0,
          assessmentSubmissions: 0,
          interventionOpens: 0,
          interventionClosures: 0,
          topActions: [],
        },
        filters: this.toPublicFilters(query),
        generatedAt: new Date().toISOString(),
        csv: this.toCsv([]),
      };
    }

    const recentActions = await this.db
      .select({
        action: auditLogs.action,
        total: count(),
      })
      .from(auditLogs)
      .where(
        and(
          this.buildDateRange(auditLogs.createdAt, query),
          query.teacherId ? eq(auditLogs.actorId, query.teacherId) : undefined,
        ),
      )
      .groupBy(auditLogs.action)
      .orderBy(desc(count()))
      .limit(10);

    const [lessonCompletionCount] = await this.db
      .select({ total: count() })
      .from(lessonCompletions)
      .innerJoin(lessons, eq(lessons.id, lessonCompletions.lessonId))
      .where(
        and(
          this.buildDateRange(lessonCompletions.completedAt, query),
          hasClassScope ? inArray(lessons.classId, classScopeIds as string[]) : undefined,
        ),
      );
    const [submittedAttemptCount] = await this.db
      .select({ total: count() })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
      .where(
        and(
          eq(assessmentAttempts.isSubmitted, true),
          this.buildDateRange(assessmentAttempts.startedAt, query),
          hasClassScope
            ? inArray(assessments.classId, classScopeIds as string[])
            : undefined,
        ),
      );
    const [interventionOpenedCount] = await this.db
      .select({ total: count() })
      .from(interventionCases)
      .where(
        and(
          this.buildDateRange(interventionCases.openedAt, query),
          hasClassScope
            ? inArray(interventionCases.classId, classScopeIds as string[])
            : undefined,
        ),
      );
    const [interventionClosedCount] = await this.db
      .select({ total: count() })
      .from(interventionCases)
      .where(
        and(
          sql`${interventionCases.closedAt} IS NOT NULL`,
          this.buildDateRange(interventionCases.closedAt, query),
          hasClassScope
            ? inArray(interventionCases.classId, classScopeIds as string[])
            : undefined,
        ),
      );

    const data = {
      lessonCompletions: Number(lessonCompletionCount?.total ?? 0),
      assessmentSubmissions: Number(submittedAttemptCount?.total ?? 0),
      interventionOpens: Number(interventionOpenedCount?.total ?? 0),
      interventionClosures: Number(interventionClosedCount?.total ?? 0),
      topActions: recentActions.map((row) => ({
        action: row.action,
        total: Number(row.total),
      })),
    };

    return {
      data,
      filters: this.toPublicFilters(query),
      generatedAt: new Date().toISOString(),
      csv: this.toCsv(
        data.topActions.map((row) => ({
          ...row,
          lessonCompletions: data.lessonCompletions,
          assessmentSubmissions: data.assessmentSubmissions,
          interventionOpens: data.interventionOpens,
          interventionClosures: data.interventionClosures,
        })),
      ),
    };
  }
}

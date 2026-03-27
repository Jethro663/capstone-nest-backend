import { Injectable } from '@nestjs/common';
import { eq, count, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users, userRoles, roles, classes } from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { HealthService } from '../health/health.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class AdminService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly analyticsService: AnalyticsService,
    private readonly healthService: HealthService,
    private readonly reportsService: ReportsService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  async getDashboardStats() {
    const [
      totalUsersResult,
      roleCountsResult,
      activeClassesResult,
      totalClassesResult,
      totalSectionsResult,
      totalEnrollmentsResult,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(users).where(eq(users.status, 'ACTIVE')),
      this.db
        .select({
          roleName: roles.name,
          count: count(users.id),
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(users.status, 'ACTIVE'))
        .groupBy(roles.name),
      this.db.select({ count: count() }).from(classes).where(eq(classes.isActive, true)),
      this.db.select({ count: count() }).from(classes),
      this.db.select({ count: count() }).from(sql`sections`),
      this.db.select({ count: count() }).from(sql`enrollments`),
    ]);

    const activeClasses = Number(activeClassesResult[0]?.count ?? 0);
    const totalClasses = Number(totalClassesResult[0]?.count ?? 0);
    const totalSections = Number(totalSectionsResult[0]?.count ?? 0);
    const totalEnrollments = Number(totalEnrollmentsResult[0]?.count ?? 0);
    const roleCounts = new Map(
      roleCountsResult.map((row) => [row.roleName, Number(row.count ?? 0)]),
    );
    const totalUsers = Number(totalUsersResult[0]?.count ?? 0);
    const totalTeachers = roleCounts.get('teacher') ?? 0;
    const totalStudents = roleCounts.get('student') ?? 0;
    const totalAdmins = roleCounts.get('admin') ?? 0;

    return {
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalClasses,
      totalSections,
      activeClasses,
      totalEnrollments,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getDashboardOverview() {
    const [stats, usageSummary, analyticsOverview, readiness] =
      await Promise.all([
        this.getDashboardStats(),
        this.getUsageSummary({}),
        this.analyticsService.getAdminOverview(),
        this.healthService.getReadiness(),
      ]);

    return {
      stats,
      usageSummary,
      analyticsOverview,
      readiness,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getAuditLogs(filters: {
    page?: number;
    limit?: number;
    action?: string;
    actorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    return this.auditService.list(filters);
  }

  async getUsageSummary(filters: {
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const [[activeTeachers], [activeStudents], systemUsage] = await Promise.all([
      this.db
        .select({ total: count(users.id) })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(eq(roles.name, 'teacher'), eq(users.status, 'ACTIVE'))),
      this.db
        .select({ total: count(users.id) })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(eq(roles.name, 'student'), eq(users.status, 'ACTIVE'))),
      this.reportsService.getSystemUsage(filters),
    ]);

    return {
      activeTeachers: Number(activeTeachers?.total ?? 0),
      activeStudents: Number(activeStudents?.total ?? 0),
      assessmentSubmissions: systemUsage.data.assessmentSubmissions,
      lessonCompletions: systemUsage.data.lessonCompletions,
      interventionOpens: systemUsage.data.interventionOpens,
      interventionClosures: systemUsage.data.interventionClosures,
      topActions: systemUsage.data.topActions,
      generatedAt: systemUsage.generatedAt,
      csv: systemUsage.csv,
    };
  }
}

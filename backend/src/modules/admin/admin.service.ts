import { Injectable } from '@nestjs/common';
import { eq, count, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users, userRoles, roles, classes } from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class AdminService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly reportsService: ReportsService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  async getDashboardStats() {
    const totalUsersResult = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'ACTIVE'));
    const totalUsers = Number(totalUsersResult[0]?.count ?? 0);

    const teachersResult = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(users.status, 'ACTIVE'), eq(roles.name, 'teacher')));

    const totalTeachers = Number(teachersResult[0]?.count ?? 0);

    const studentsResult = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(users.status, 'ACTIVE'), eq(roles.name, 'student')));

    const totalStudents = Number(studentsResult[0]?.count ?? 0);

    const adminsResult = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(users.status, 'ACTIVE'), eq(roles.name, 'admin')));

    const totalAdmins = Number(adminsResult[0]?.count ?? 0);

    const activeClassesResult = await this.db
      .select({ count: count() })
      .from(classes)
      .where(eq(classes.isActive, true));
    const totalClassesResult = await this.db.select({ count: count() }).from(classes);
    const totalSectionsResult = await this.db
      .select({ count: count() })
      .from(sql`sections`);
    const totalEnrollmentsResult = await this.db
      .select({ count: count() })
      .from(sql`enrollments`);
    const activeClasses = Number(activeClassesResult[0]?.count ?? 0);
    const totalClasses = Number(totalClassesResult[0]?.count ?? 0);
    const totalSections = Number(totalSectionsResult[0]?.count ?? 0);
    const totalEnrollments = Number(totalEnrollmentsResult[0]?.count ?? 0);

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
    const [activeTeachers] = await this.db
      .select({ total: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(roles.name, 'teacher'), eq(users.status, 'ACTIVE')));

    const [activeStudents] = await this.db
      .select({ total: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(roles.name, 'student'), eq(users.status, 'ACTIVE')));

    const systemUsage = await this.reportsService.getSystemUsage(filters);

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

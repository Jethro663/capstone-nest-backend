import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessments,
  classRecords,
  classes,
  interventionCases,
  performanceSnapshots,
  roles,
  userRoles,
  users,
} from '../../drizzle/schema';

@Injectable()
export class AnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private isAdmin(rolesList: string[]) {
    return rolesList.includes('admin');
  }

  private async assertClassAccess(
    classId: string,
    userId: string,
    rolesList: string[],
  ) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, teacherId: true },
    });

    if (!cls) throw new NotFoundException(`Class "${classId}" not found`);
    if (!this.isAdmin(rolesList) && cls.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return cls;
  }

  async getInterventionOutcomes(
    classId: string,
    userId: string,
    rolesList: string[],
  ) {
    await this.assertClassAccess(classId, userId, rolesList);

    const cases = await this.db.query.interventionCases.findMany({
      where: eq(interventionCases.classId, classId),
      with: {
        student: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
        assignments: {
          columns: { id: true, isCompleted: true },
        },
      },
      orderBy: [interventionCases.openedAt],
    });

    const snapshots = await this.db.query.performanceSnapshots.findMany({
      where: eq(performanceSnapshots.classId, classId),
      columns: {
        studentId: true,
        blendedScore: true,
        isAtRisk: true,
        lastComputedAt: true,
      },
    });
    const snapshotMap = new Map(snapshots.map((row) => [row.studentId, row]));

    const students = cases.map((entry) => {
      const current = snapshotMap.get(entry.studentId);
      const before = entry.triggerScore ? Number(entry.triggerScore) : null;
      const after = current?.blendedScore ? Number(current.blendedScore) : null;
      const completedAssignments = entry.assignments.filter((item) => item.isCompleted).length;
      const improved =
        before !== null && after !== null ? after > before : null;

      return {
        caseId: entry.id,
        studentId: entry.studentId,
        student: entry.student,
        status: entry.status,
        openedAt: entry.openedAt,
        closedAt: entry.closedAt,
        beforeScore: before,
        afterScore: after,
        improved,
        assignmentsTotal: entry.assignments.length,
        assignmentsCompleted: completedAssignments,
        completionRate:
          entry.assignments.length > 0
            ? Math.round((completedAssignments / entry.assignments.length) * 100)
            : 0,
        currentIsAtRisk: current?.isAtRisk ?? null,
        lastComputedAt: current?.lastComputedAt ?? null,
      };
    });

    const improvedCount = students.filter((row) => row.improved).length;

    return {
      classId,
      summary: {
        totalCases: students.length,
        improvedCount,
        completionRate:
          students.length > 0
            ? Math.round(
                students.reduce((sum, row) => sum + row.completionRate, 0) /
                  students.length,
              )
            : 0,
        action: `${improvedCount} students improved after intervention`,
      },
      students,
    };
  }

  async getClassTrends(classId: string, userId: string, rolesList: string[]) {
    await this.assertClassAccess(classId, userId, rolesList);

    const records = await this.db.query.classRecords.findMany({
      where: eq(classRecords.classId, classId),
      with: {
        finalGrades: {
          columns: { finalPercentage: true, remarks: true },
        },
      },
      orderBy: [classRecords.gradingPeriod],
    });

    const trends = records.map((record) => {
      const grades = record.finalGrades.map((item) => Number(item.finalPercentage));
      const average =
        grades.length > 0
          ? Math.round(
              (grades.reduce((sum, score) => sum + score, 0) / grades.length) *
                100,
            ) / 100
          : null;
      return {
        gradingPeriod: record.gradingPeriod,
        status: record.status,
        average,
        studentCount: grades.length,
        interventionCount: record.finalGrades.filter(
          (item) => item.remarks === 'For Intervention',
        ).length,
      };
    });

    return { classId, trends };
  }

  async getTeacherWorkload(
    teacherId: string,
    requester: { userId: string; roles: string[] },
  ) {
    if (!this.isAdmin(requester.roles) && requester.userId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    const teacherClasses = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      columns: { id: true, isActive: true },
    });
    const classIds = teacherClasses.map((row) => row.id);

    const activeInterventions = classIds.length
      ? await this.db
          .select({ total: count() })
          .from(interventionCases)
          .where(
            and(
              eq(interventionCases.status, 'active'),
              inArray(interventionCases.classId, classIds),
            ),
          )
      : [{ total: 0 }];

    const pendingClassRecords = await this.db.query.classRecords.findMany({
      where: eq(classRecords.teacherId, teacherId),
      columns: { id: true, status: true },
    });

    const assessmentsCount = await this.db
      .select({ total: count() })
      .from(assessments)
      .innerJoin(classes, eq(classes.id, assessments.classId))
      .where(eq(classes.teacherId, teacherId));

    return {
      teacherId,
      classCount: teacherClasses.length,
      activeClassCount: teacherClasses.filter((row) => row.isActive).length,
      activeInterventions: Number(activeInterventions[0]?.total ?? 0),
      pendingClassRecords: pendingClassRecords.filter(
        (row) => row.status !== 'finalized' && row.status !== 'locked',
      ).length,
      assessmentCount: Number(assessmentsCount[0]?.total ?? 0),
      action: `${teacherClasses.length} classes currently assigned`,
    };
  }

  async getAdminOverview() {
    const [teacherCount] = await this.db
      .select({ total: count() })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(roles.name, 'teacher'));

    const [studentCount] = await this.db
      .select({ total: count() })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(roles.name, 'student'));

    const [classCount] = await this.db.select({ total: count() }).from(classes);
    const [activeInterventions] = await this.db
      .select({ total: count() })
      .from(interventionCases)
      .where(eq(interventionCases.status, 'active'));
    const [atRiskStudents] = await this.db
      .select({ total: count() })
      .from(performanceSnapshots)
      .where(eq(performanceSnapshots.isAtRisk, true));

    return {
      totals: {
        teachers: Number(teacherCount?.total ?? 0),
        students: Number(studentCount?.total ?? 0),
        classes: Number(classCount?.total ?? 0),
        activeInterventions: Number(activeInterventions?.total ?? 0),
        atRiskStudents: Number(atRiskStudents?.total ?? 0),
      },
      action: `${Number(activeInterventions?.total ?? 0)} active interventions require monitoring`,
    };
  }
}

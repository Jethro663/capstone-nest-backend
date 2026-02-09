import { Injectable } from '@nestjs/common';
import { eq, count, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users, userRoles, roles, classes } from '../../drizzle/schema';

@Injectable()
export class AdminService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async getDashboardStats() {
    // Get total active users count
    const totalUsersResult = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'ACTIVE'));
    
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get teachers count (users with teacher role)
    const teachersResult = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(
        eq(users.status, 'ACTIVE'),
        eq(roles.name, 'teacher')
      ));
    
    const teachers = teachersResult[0]?.count || 0;

    // Get students count (users with student role)
    const studentsResult = await this.db
      .select({ count: count(users.id) })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(
        eq(users.status, 'ACTIVE'),
        eq(roles.name, 'student')
      ));
    
    const students = studentsResult[0]?.count || 0;

    // Get active subjects count (distinct subject names in classes)
    const activeSubjectsResult = await this.db
      .selectDistinct({ subjectName: classes.subjectName })
      .from(classes)
      .where(eq(classes.isActive, true));
    
    const activeSubjects = activeSubjectsResult.length || 0;

    // Get active classes count
    const activeClassesResult = await this.db
      .select({ count: count() })
      .from(classes)
      .where(eq(classes.isActive, true));
    
    const activeClasses = activeClassesResult[0]?.count || 0;

    return {
      totalUsers,
      teachers,
      students,
      activeSubjects,
      activeClasses,
      fetchedAt: new Date().toISOString(),
    };
  }
}

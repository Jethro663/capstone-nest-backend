import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import {
  assessments,
  assessmentAttempts,
  classes,
  classRecordFinalGrades,
  enrollments,
  interventionCases,
  lxpProgress,
  performanceSnapshots,
  sections,
  studentProfiles,
} from '../../drizzle/schema';
import { UpdateProfileDto } from './DTO/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private resolveActorRole(actorRoles: string[] = []): 'admin' | 'teacher' | 'student' | 'system' {
    if (actorRoles.includes('admin')) return 'admin';
    if (actorRoles.includes('teacher')) return 'teacher';
    if (actorRoles.includes('student')) return 'student';
    return 'system';
  }

  private mapProfileDto(dto: Partial<UpdateProfileDto>) {
    const payload: Record<string, unknown> = {};

    if (dto.lrn !== undefined) payload.lrn = dto.lrn;
    if (dto.gradeLevel !== undefined) payload.gradeLevel = dto.gradeLevel;

    const dob = dto.dateOfBirth ?? dto.dob;
    if (dob !== undefined) payload.dateOfBirth = dob ? new Date(dob) : null;

    if (dto.gender !== undefined) payload.gender = dto.gender;
    if (dto.phone !== undefined) payload.phone = dto.phone;
    if (dto.address !== undefined) payload.address = dto.address;
    if (dto.familyName !== undefined) payload.familyName = dto.familyName;
    if (dto.familyRelationship !== undefined) {
      payload.familyRelationship = dto.familyRelationship;
    }
    if (dto.familyContact !== undefined)
      payload.familyContact = dto.familyContact;
    if (dto.profilePicture !== undefined)
      payload.profilePicture = dto.profilePicture;

    return payload;
  }

  async findByUserId(userId: string) {
    const profile = await this.db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, userId),
    });

    return profile;
  }

  async createProfile(
    userId: string,
    dto: Partial<UpdateProfileDto>,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const payload = this.mapProfileDto(dto);
    const [newProfile] = await this.db
      .insert(studentProfiles)
      .values({ userId, ...payload })
      .returning();

    await this.auditService.log({
      actorId: actorId ?? userId,
      action: 'student_profile.created',
      targetType: 'student_profile',
      targetId: userId,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        userId,
        changedFields: Object.keys(payload),
      },
    });

    return newProfile;
  }

  async updateProfile(
    userId: string,
    dto: Partial<UpdateProfileDto>,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const existing = await this.findByUserId(userId);
    const payload = this.mapProfileDto(dto);

    if (!existing) {
      return this.createProfile(userId, dto, actorId, actorRoles);
    }

    const [updated] = await this.db
      .update(studentProfiles)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();

    await this.auditService.log({
      actorId: actorId ?? userId,
      action: 'student_profile.updated',
      targetType: 'student_profile',
      targetId: userId,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        userId,
        changedFields: Object.keys(payload),
      },
    });

    return updated;
  }

  async getAcademicSummary(userId: string) {
    const profile = await this.findByUserId(userId);

    const enrollmentHistory = await this.db.query.enrollments.findMany({
      where: eq(enrollments.studentId, userId),
      with: {
        class: {
          columns: {
            id: true,
            subjectName: true,
            subjectCode: true,
            schoolYear: true,
          },
          with: {
            section: {
              columns: {
                id: true,
                name: true,
                gradeLevel: true,
                schoolYear: true,
              },
            },
          },
        },
        section: {
          columns: { id: true, name: true, gradeLevel: true, schoolYear: true },
        },
      },
      orderBy: [desc(enrollments.enrolledAt)],
    });

    const currentEnrollments = enrollmentHistory.filter(
      (row) => row.status === 'enrolled',
    );
    const classIds = currentEnrollments
      .map((row) => row.classId)
      .filter((value): value is string => Boolean(value));

    const performanceSummary = classIds.length
      ? await this.db.query.performanceSnapshots.findMany({
          where: and(
            eq(performanceSnapshots.studentId, userId),
            inArray(performanceSnapshots.classId, classIds),
          ),
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
          },
          orderBy: [desc(performanceSnapshots.lastComputedAt)],
        })
      : [];

    const assessmentHistory = await this.db.query.assessmentAttempts.findMany({
      where: eq(assessmentAttempts.studentId, userId),
      with: {
        assessment: {
          columns: {
            id: true,
            title: true,
            classId: true,
            dueDate: true,
            quarter: true,
            type: true,
            totalPoints: true,
          },
          with: {
            class: {
              columns: { id: true, subjectName: true, subjectCode: true },
            },
          },
        },
      },
      orderBy: [desc(assessmentAttempts.startedAt)],
      limit: 20,
    });

    const interventionSummary = await this.db.query.interventionCases.findMany({
      where: eq(interventionCases.studentId, userId),
      with: {
        class: {
          columns: { id: true, subjectName: true, subjectCode: true },
          with: {
            section: {
              columns: { id: true, name: true, gradeLevel: true },
            },
          },
        },
        assignments: {
          columns: { id: true, isCompleted: true, completedAt: true },
        },
      },
      orderBy: [desc(interventionCases.openedAt)],
    });

    const lxpProgressRows = await this.db.query.lxpProgress.findMany({
      where: eq(lxpProgress.studentId, userId),
      with: {
        class: {
          columns: { id: true, subjectName: true, subjectCode: true },
          with: {
            section: {
              columns: { id: true, name: true, gradeLevel: true },
            },
          },
        },
      },
      orderBy: [desc(lxpProgress.updatedAt)],
    });

    const classRecordHistory = classIds.length
      ? await this.db.query.classRecordFinalGrades.findMany({
          where: eq(classRecordFinalGrades.studentId, userId),
          with: {
            classRecord: {
              columns: {
                id: true,
                classId: true,
                gradingPeriod: true,
                status: true,
              },
              with: {
                class: {
                  columns: { id: true, subjectName: true, subjectCode: true },
                },
              },
            },
          },
          orderBy: [desc(classRecordFinalGrades.computedAt)],
        })
      : [];

    return {
      profile,
      currentEnrollments,
      enrollmentHistory,
      performanceSummary,
      assessmentHistory: assessmentHistory.map((row) => ({
        id: row.id,
        assessmentId: row.assessmentId,
        attemptNumber: row.attemptNumber,
        score: row.score,
        isSubmitted: row.isSubmitted,
        submittedAt: row.submittedAt,
        expiresAt: row.expiresAt,
        assessment: row.assessment,
      })),
      interventionSummary: interventionSummary.map((entry) => ({
        id: entry.id,
        class: entry.class,
        status: entry.status,
        triggerScore: entry.triggerScore,
        thresholdApplied: entry.thresholdApplied,
        openedAt: entry.openedAt,
        closedAt: entry.closedAt,
        note: entry.note,
        assignmentCount: entry.assignments.length,
        completedAssignments: entry.assignments.filter((item) => item.isCompleted)
          .length,
      })),
      lxpProgress: lxpProgressRows,
      classRecordHistory: classRecordHistory.map((row) => ({
        id: row.id,
        classRecordId: row.classRecordId,
        finalPercentage: row.finalPercentage,
        remarks: row.remarks,
        computedAt: row.computedAt,
        classRecord: row.classRecord,
      })),
    };
  }

  async getTranscript(
    userId: string,
    filters?: {
      page?: number;
      limit?: number;
      status?: 'all' | 'enrolled' | 'dropped' | 'completed';
      search?: string;
    },
  ) {
    const page = Math.max(1, Number(filters?.page ?? 1));
    const limit = Math.max(1, Math.min(Number(filters?.limit ?? 20), 100));
    const offset = (page - 1) * limit;
    const status = filters?.status ?? 'all';
    const search = filters?.search?.trim();

    const whereConditions = [eq(enrollments.studentId, userId)];
    if (status !== 'all') {
      whereConditions.push(eq(enrollments.status, status));
    }

    const searchCondition = search
      ? or(
          ilike(classes.subjectName, `%${search}%`),
          ilike(classes.subjectCode, `%${search}%`),
          ilike(sections.name, `%${search}%`),
          ilike(sections.schoolYear, `%${search}%`),
        )
      : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          id: enrollments.id,
          studentId: enrollments.studentId,
          classId: enrollments.classId,
          sectionId: enrollments.sectionId,
          status: enrollments.status,
          enrolledAt: enrollments.enrolledAt,
          class: {
            id: classes.id,
            subjectName: classes.subjectName,
            subjectCode: classes.subjectCode,
            schoolYear: classes.schoolYear,
          },
          section: {
            id: sections.id,
            name: sections.name,
            gradeLevel: sections.gradeLevel,
            schoolYear: sections.schoolYear,
          },
        })
        .from(enrollments)
        .leftJoin(classes, eq(classes.id, enrollments.classId))
        .leftJoin(sections, eq(sections.id, enrollments.sectionId))
        .where(
          and(
            ...whereConditions,
            ...(searchCondition ? [searchCondition] : []),
          ),
        )
        .orderBy(desc(enrollments.enrolledAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(enrollments)
        .leftJoin(classes, eq(classes.id, enrollments.classId))
        .leftJoin(sections, eq(sections.id, enrollments.sectionId))
        .where(
          and(
            ...whereConditions,
            ...(searchCondition ? [searchCondition] : []),
          ),
        ),
    ]);

    const total = totalRows[0]?.total ?? 0;
    return {
      data: rows,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getAssessmentHistory(
    userId: string,
    filters?: {
      page?: number;
      limit?: number;
      submission?: 'all' | 'submitted' | 'in_progress';
      search?: string;
    },
  ) {
    const page = Math.max(1, Number(filters?.page ?? 1));
    const limit = Math.max(1, Math.min(Number(filters?.limit ?? 20), 100));
    const offset = (page - 1) * limit;
    const submission = filters?.submission ?? 'all';
    const search = filters?.search?.trim();

    const whereConditions = [eq(assessmentAttempts.studentId, userId)];
    if (submission === 'submitted') {
      whereConditions.push(eq(assessmentAttempts.isSubmitted, true));
    } else if (submission === 'in_progress') {
      whereConditions.push(eq(assessmentAttempts.isSubmitted, false));
    }

    const searchCondition = search
      ? or(
          ilike(assessments.title, `%${search}%`),
          ilike(classes.subjectName, `%${search}%`),
          ilike(classes.subjectCode, `%${search}%`),
        )
      : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          id: assessmentAttempts.id,
          assessmentId: assessmentAttempts.assessmentId,
          attemptNumber: assessmentAttempts.attemptNumber,
          score: assessmentAttempts.score,
          isSubmitted: assessmentAttempts.isSubmitted,
          submittedAt: assessmentAttempts.submittedAt,
          startedAt: assessmentAttempts.startedAt,
          returnedAt: assessmentAttempts.returnedAt,
          passed: assessmentAttempts.passed,
          assessment: {
            id: assessments.id,
            title: assessments.title,
            classId: assessments.classId,
            dueDate: assessments.dueDate,
            quarter: assessments.quarter,
            type: assessments.type,
            totalPoints: assessments.totalPoints,
            classRefId: classes.id,
            classSubjectName: classes.subjectName,
            classSubjectCode: classes.subjectCode,
          },
        })
        .from(assessmentAttempts)
        .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
        .leftJoin(classes, eq(classes.id, assessments.classId))
        .where(
          and(
            ...whereConditions,
            ...(searchCondition ? [searchCondition] : []),
          ),
        )
        .orderBy(desc(assessmentAttempts.startedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(assessmentAttempts)
        .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
        .leftJoin(classes, eq(classes.id, assessments.classId))
        .where(
          and(
            ...whereConditions,
            ...(searchCondition ? [searchCondition] : []),
          ),
        ),
    ]);

    const mappedRows = rows.map((row) => {
      const { classRefId, classSubjectName, classSubjectCode, ...assessment } = row.assessment;
      return {
        ...row,
        assessment: {
          ...assessment,
          class: classRefId
            ? {
                id: classRefId,
                subjectName: classSubjectName,
                subjectCode: classSubjectCode,
              }
            : null,
        },
      };
    });

    const total = totalRows[0]?.total ?? 0;
    return {
      data: mappedRows,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}

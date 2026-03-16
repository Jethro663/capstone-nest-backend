import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessmentAttempts,
  classRecordFinalGrades,
  enrollments,
  interventionCases,
  lxpProgress,
  performanceSnapshots,
  studentProfiles,
} from '../../drizzle/schema';
import { UpdateProfileDto } from './DTO/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
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

  async createProfile(userId: string, dto: Partial<UpdateProfileDto>) {
    const payload = this.mapProfileDto(dto);
    const [newProfile] = await this.db
      .insert(studentProfiles)
      .values({ userId, ...payload })
      .returning();

    return newProfile;
  }

  async updateProfile(userId: string, dto: Partial<UpdateProfileDto>) {
    const existing = await this.findByUserId(userId);
    const payload = this.mapProfileDto(dto);

    if (!existing) {
      return this.createProfile(userId, dto);
    }

    const [updated] = await this.db
      .update(studentProfiles)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();

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
}

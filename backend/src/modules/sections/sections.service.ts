import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  and,
  eq,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  SQL,
  count,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  sections,
  classes,
  classSchedules,
  users,
  enrollments,
  studentProfiles,
  userRoles,
  roles,
} from '../../drizzle/schema';
import { toCalendarSlot } from '../../common/utils/schedule.util';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';
import { BulkStudentsDto } from './DTO/bulk-students.dto';

export interface RequestingUser {
  userId: string;
  roles: string[];
}

@Injectable()
export class SectionsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Returns true when the user is a teacher without admin privileges. */
  private isTeacherOnly(user: RequestingUser): boolean {
    return user.roles.includes('teacher') && !user.roles.includes('admin');
  }

  /** Ensures the given user ID holds the 'teacher' role. */
  private async verifyAdviserHasTeacherRole(adviserId: string): Promise<void> {
    const adviserRoles = await this.db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, adviserId));

    if (!adviserRoles.some(r => r.roleName === 'teacher')) {
      throw new BadRequestException(
        `User "${adviserId}" does not have the teacher role and cannot be assigned as adviser`,
      );
    }
  }

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(filters?: {
    gradeLevel?: string;
    schoolYear?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    adviserId?: string;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    if (filters?.gradeLevel) whereConditions.push(eq(sections.gradeLevel, filters.gradeLevel));
    if (filters?.schoolYear) whereConditions.push(eq(sections.schoolYear, filters.schoolYear));
    if (filters?.isActive !== undefined) whereConditions.push(eq(sections.isActive, filters.isActive));
    if (filters?.adviserId) whereConditions.push(eq(sections.adviserId, filters.adviserId));
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(sections.name, searchPattern),
        ilike(sections.gradeLevel, searchPattern),
      );
      if (searchCondition) whereConditions.push(searchCondition);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [sectionsList, totalResult] = await Promise.all([
      this.db.query.sections.findMany({
        where: whereClause,
        with: {
          adviser: { columns: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: (sections, { asc }) => [asc(sections.gradeLevel), asc(sections.name)],
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(sections).where(whereClause),
    ]);

    const total = Number(totalResult[0]?.total ?? 0);

    return {
      data: sectionsList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── findById ─────────────────────────────────────────────────────────────

  async findById(id: string, requestingUser?: RequestingUser) {
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, id),
      with: {
        adviser: { columns: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!section) throw new NotFoundException(`Section with ID "${id}" not found`);

    // Teachers (non-admin) can only access sections they advise
    if (requestingUser && this.isTeacherOnly(requestingUser)) {
      if (section.adviserId !== requestingUser.userId) {
        throw new ForbiddenException('You do not have access to this section');
      }
    }

    return section;
  }

  // ─── getRoster ────────────────────────────────────────────────────────────

  async getRoster(sectionId: string, requestingUser?: RequestingUser) {
    // Access check is delegated to findById
    await this.findById(sectionId, requestingUser);

    const roster = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.sectionId, sectionId),
        eq(enrollments.status, 'enrolled'),
      ),
      with: {
        student: {
          columns: { id: true, firstName: true, lastName: true, email: true },
          with: { profile: { columns: { gradeLevel: true } } },
        },
      },
      orderBy: (enrollments, { asc }) => [asc(enrollments.enrolledAt)],
    });

    return roster.map(r => ({
      enrollmentId: r.id,
      studentId: r.studentId,
      status: r.status,
      enrolledAt: r.enrolledAt,
      student: r.student,
    }));
  }

  // ─── getCandidates ────────────────────────────────────────────────────────

  async getCandidates(sectionId: string, filters?: { gradeLevel?: string; search?: string }) {
    await this.findById(sectionId);

    // Step 1: Collect user IDs that have the 'student' role (roles table is tiny)
    const studentRoleRows = await this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(roles.name, 'student'));

    const studentUserIds = studentRoleRows.map(r => r.userId);
    if (studentUserIds.length === 0) return [];

    // Step 2: Collect already-enrolled student IDs for this section
    const enrolledRows = await this.db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(eq(enrollments.sectionId, sectionId));

    const enrolledIds = enrolledRows.map(e => e.studentId);

    // Step 3: Compose SQL-level conditions and run one final query
    const whereConditions: (SQL<unknown> | undefined)[] = [
      inArray(users.id, studentUserIds),
      enrolledIds.length > 0 ? notInArray(users.id, enrolledIds) : undefined,
      filters?.gradeLevel
        ? eq(studentProfiles.gradeLevel, filters.gradeLevel as any)
        : undefined,
      filters?.search
        ? or(
            ilike(users.firstName, `%${filters.search}%`),
            ilike(users.lastName, `%${filters.search}%`),
            ilike(users.email, `%${filters.search}%`),
          )
        : undefined,
    ];

    const results = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        gradeLevel: studentProfiles.gradeLevel,
      })
      .from(users)
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(users.lastName, users.firstName)
      .limit(200);

    return results;
  }

  // ─── addStudentsToSection ─────────────────────────────────────────────────

  async addStudentsToSection(sectionId: string, dto: BulkStudentsDto) {
    const section = await this.findById(sectionId);

    return await this.db.transaction(async (tx) => {
      // 1. Capacity check — count current section-only enrollments
      const [rosterResult] = await tx
        .select({ count: count() })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, sectionId),
            eq(enrollments.status, 'enrolled'),
            isNull(enrollments.classId),
          ),
        );

      const currentCount = Number(rosterResult?.count ?? 0);
      if (currentCount + dto.studentIds.length > section.capacity) {
        throw new BadRequestException(
          `Adding ${dto.studentIds.length} student(s) would exceed the section's capacity of ${section.capacity} (currently ${currentCount} enrolled)`,
        );
      }

      // 2. Validate all provided student IDs exist in one query
      const validStudents = await tx
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, dto.studentIds));

      const validIds = new Set(validStudents.map(s => s.id));
      const invalidIds = dto.studentIds.filter(id => !validIds.has(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(`Student IDs not found: ${invalidIds.join(', ')}`);
      }

      // 3. Find which students are already enrolled in this section (one query)
      const alreadyEnrolledRows = await tx
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, sectionId),
            eq(enrollments.status, 'enrolled'),
            inArray(enrollments.studentId, dto.studentIds),
          ),
        );

      const alreadyEnrolledIds = new Set(alreadyEnrolledRows.map(e => e.studentId));
      const newStudentIds = dto.studentIds.filter(id => !alreadyEnrolledIds.has(id));

      if (newStudentIds.length === 0) {
        return { createdCount: 0, created: [], skipped: dto.studentIds.length };
      }

      // 4. Bulk insert all new enrollments in a single statement
      const values = newStudentIds.map(studentId => ({
        studentId,
        classId: null as string | null,
        sectionId,
        status: 'enrolled' as const,
        enrolledAt: new Date(),
      }));

      const created = await tx.insert(enrollments).values(values).returning();

      return {
        createdCount: created.length,
        created,
        skipped: alreadyEnrolledIds.size,
      };
    });
  }

  // ─── removeStudentFromSection ─────────────────────────────────────────────

  async removeStudentFromSection(sectionId: string, studentId: string) {
    await this.findById(sectionId);

    // Only target active enrolled rows so historical dropped/completed rows are preserved
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.sectionId, sectionId),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
    });

    if (!enrollment) {
      throw new BadRequestException('Student is not actively enrolled in this section');
    }

    if (enrollment.classId) {
      throw new BadRequestException(
        `Student has an active class enrollment in this section (class ID: ${enrollment.classId}); remove the class enrollment first`,
      );
    }

    await this.db.delete(enrollments).where(eq(enrollments.id, enrollment.id));

    return { removed: true };
  }

  // ─── createSection ────────────────────────────────────────────────────────

  async createSection(createSectionDto: CreateSectionDto) {
    const existingSection = await this.db.query.sections.findFirst({
      where: and(
        eq(sections.name, createSectionDto.name),
        eq(sections.gradeLevel, createSectionDto.gradeLevel),
        eq(sections.schoolYear, createSectionDto.schoolYear),
      ),
    });

    if (existingSection) {
      throw new ConflictException(
        `Section "${createSectionDto.name}" already exists for grade ${createSectionDto.gradeLevel} in ${createSectionDto.schoolYear}`,
      );
    }

    if (createSectionDto.adviserId) {
      const adviser = await this.db.query.users.findFirst({
        where: eq(users.id, createSectionDto.adviserId),
      });

      if (!adviser) {
        throw new NotFoundException(`Adviser with ID "${createSectionDto.adviserId}" not found`);
      }

      // Ensure the assigned adviser actually holds the teacher role
      await this.verifyAdviserHasTeacherRole(createSectionDto.adviserId);
    }

    const [newSection] = await this.db
      .insert(sections)
      .values({
        name: createSectionDto.name,
        gradeLevel: createSectionDto.gradeLevel,
        schoolYear: createSectionDto.schoolYear,
        capacity: createSectionDto.capacity,
        roomNumber: createSectionDto.roomNumber || null,
        adviserId: createSectionDto.adviserId || null,
        isActive: true,
      })
      .returning();

    return this.findById(newSection.id);
  }

  // ─── updateSection ────────────────────────────────────────────────────────

  async updateSection(id: string, updateSectionDto: UpdateSectionDto) {
    const existingSection = await this.findById(id);

    if (updateSectionDto.name || updateSectionDto.gradeLevel || updateSectionDto.schoolYear) {
      const nameToCheck = updateSectionDto.name || existingSection.name;
      const gradeToCheck = updateSectionDto.gradeLevel || existingSection.gradeLevel;
      const yearToCheck = updateSectionDto.schoolYear || existingSection.schoolYear;

      const duplicateSection = await this.db.query.sections.findFirst({
        where: and(
          eq(sections.name, nameToCheck),
          eq(sections.gradeLevel, gradeToCheck),
          eq(sections.schoolYear, yearToCheck),
        ),
      });

      if (duplicateSection && duplicateSection.id !== id) {
        throw new ConflictException(
          `Section "${nameToCheck}" already exists for grade ${gradeToCheck} in ${yearToCheck}`,
        );
      }
    }

    if (updateSectionDto.adviserId) {
      const adviser = await this.db.query.users.findFirst({
        where: eq(users.id, updateSectionDto.adviserId),
      });

      if (!adviser) {
        throw new NotFoundException(`Adviser with ID "${updateSectionDto.adviserId}" not found`);
      }

      // Ensure the new adviser holds the teacher role
      await this.verifyAdviserHasTeacherRole(updateSectionDto.adviserId);
    }

    const updateData: Partial<{
      name: string;
      gradeLevel: string;
      schoolYear: string;
      capacity: number;
      roomNumber: string | null;
      adviserId: string | null;
      isActive: boolean;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (updateSectionDto.name !== undefined) updateData.name = updateSectionDto.name;
    if (updateSectionDto.gradeLevel !== undefined) updateData.gradeLevel = updateSectionDto.gradeLevel;
    if (updateSectionDto.schoolYear !== undefined) updateData.schoolYear = updateSectionDto.schoolYear;
    if (updateSectionDto.capacity !== undefined) updateData.capacity = updateSectionDto.capacity;
    if (updateSectionDto.roomNumber !== undefined) updateData.roomNumber = updateSectionDto.roomNumber;
    if (updateSectionDto.adviserId !== undefined) updateData.adviserId = updateSectionDto.adviserId;
    if (updateSectionDto.isActive !== undefined) updateData.isActive = updateSectionDto.isActive;

    await this.db.update(sections).set(updateData).where(eq(sections.id, id));

    return this.findById(id);
  }

  // ─── deleteSection ────────────────────────────────────────────────────────

  async deleteSection(id: string) {
    await this.findById(id);

    await this.db
      .update(sections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(sections.id, id));
  }

  // ─── permanentlyDeleteSection ─────────────────────────────────────────────

  async permanentlyDeleteSection(id: string) {
    // Verify section exists first
    await this.findById(id);

    // Pre-flight: block if active classes or enrolled students would be cascade-deleted
    const [activeClassesResult, enrolledStudentsResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(classes)
        .where(and(eq(classes.sectionId, id), eq(classes.isActive, true))),
      this.db
        .select({ count: count() })
        .from(enrollments)
        .where(and(eq(enrollments.sectionId, id), eq(enrollments.status, 'enrolled'))),
    ]);

    const activeClasses = Number(activeClassesResult[0]?.count ?? 0);
    const enrolledStudents = Number(enrolledStudentsResult[0]?.count ?? 0);

    if (activeClasses > 0 || enrolledStudents > 0) {
      throw new BadRequestException(
        `Cannot permanently delete this section: it has ${activeClasses} active class(es) and ${enrolledStudents} enrolled student(s). ` +
          `Deactivate or remove them first, or use the soft-delete endpoint instead.`,
      );
    }

    await this.db.delete(sections).where(eq(sections.id, id));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getSectionSchedule
  // Returns a calendar-ready payload for all classes in a section, including
  // structured schedule slots with numeric hour/minute fields for easy
  // frontend positioning in a weekly calendar view (8 am – 6 pm).
  // ─────────────────────────────────────────────────────────────────────────

  async getSectionSchedule(sectionId: string, requestingUser?: RequestingUser) {
    // Reuse findById for access-control (teacher ownership check is inherited)
    const section = await this.findById(sectionId, requestingUser);

    const classList = await this.db.query.classes.findMany({
      where: eq(classes.sectionId, sectionId),
      with: {
        schedules: true,
        teacher: {
          columns: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: (t, { asc }) => [asc(t.subjectName)],
    });

    return {
      section: {
        id: section.id,
        name: section.name,
        gradeLevel: section.gradeLevel,
        schoolYear: section.schoolYear,
        roomNumber: (section as any).roomNumber ?? null,
      },
      classes: classList.map(cls => ({
        classId: cls.id,
        subjectName: cls.subjectName,
        subjectCode: cls.subjectCode,
        room: cls.room,
        isActive: cls.isActive,
        teacher: cls.teacher,
        schedules: ((cls as any).schedules ?? []).map(toCalendarSlot),
      })),
    };
  }
}

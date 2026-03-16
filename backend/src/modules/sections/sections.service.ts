import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  and,
  count,
  countDistinct,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  notInArray,
  or,
  SQL,
  sql,
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

    if (!adviserRoles.some((r) => r.roleName === 'teacher')) {
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

    if (filters?.gradeLevel)
      whereConditions.push(eq(sections.gradeLevel, filters.gradeLevel));
    if (filters?.schoolYear)
      whereConditions.push(eq(sections.schoolYear, filters.schoolYear));
    if (filters?.isActive !== undefined)
      whereConditions.push(eq(sections.isActive, filters.isActive));
    if (filters?.adviserId)
      whereConditions.push(eq(sections.adviserId, filters.adviserId));
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(sections.name, searchPattern),
        ilike(sections.gradeLevel, searchPattern),
      );
      if (searchCondition) whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [sectionsList, totalResult] = await Promise.all([
      this.db.query.sections.findMany({
        where: whereClause,
        with: {
          adviser: {
            columns: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: (sections, { asc }) => [
          asc(sections.gradeLevel),
          asc(sections.name),
        ],
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(sections).where(whereClause),
    ]);

    const studentCountsBySection = new Map<string, number>();

    if (sectionsList.length > 0) {
      const sectionIds = sectionsList.map((section) => section.id);
      const headcounts = await this.db
        .select({
          sectionId: enrollments.sectionId,
          studentCount:
            sql<number>`count(distinct ${enrollments.studentId})`.mapWith(
              Number,
            ),
        })
        .from(enrollments)
        .where(
          and(
            inArray(enrollments.sectionId, sectionIds),
            eq(enrollments.status, 'enrolled'),
          ),
        )
        .groupBy(enrollments.sectionId);

      for (const row of headcounts) {
        studentCountsBySection.set(row.sectionId, row.studentCount ?? 0);
      }
    }

    const total = Number(totalResult[0]?.total ?? 0);

    return {
      data: sectionsList.map((section) => ({
        ...section,
        studentCount: studentCountsBySection.get(section.id) ?? 0,
      })),
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
        adviser: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!section)
      throw new NotFoundException(`Section with ID "${id}" not found`);

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
          with: {
            profile: {
              columns: { gradeLevel: true, lrn: true, profilePicture: true },
            },
          },
        },
      },
      orderBy: (enrollments, { asc }) => [asc(enrollments.enrolledAt)],
    });

    const uniqueByStudentId = new Map<
      string,
      {
        id: string;
        enrollmentId: string;
        studentId: string;
        status: (typeof enrollments.$inferSelect)['status'];
        enrolledAt: Date;
        firstName: string | null;
        lastName: string | null;
        email: string;
        lrn: string | null;
        gradeLevel: string | null;
        profilePicture: string | null;
      }
    >();

    for (const row of roster) {
      if (uniqueByStudentId.has(row.student.id)) continue;

      uniqueByStudentId.set(row.student.id, {
        id: row.student.id,
        enrollmentId: row.id,
        studentId: row.studentId,
        status: row.status,
        enrolledAt: row.enrolledAt,
        firstName: row.student.firstName,
        lastName: row.student.lastName,
        email: row.student.email,
        lrn: row.student.profile?.lrn ?? null,
        gradeLevel: row.student.profile?.gradeLevel ?? null,
        profilePicture: row.student.profile?.profilePicture ?? null,
      });
    }

    return Array.from(uniqueByStudentId.values());
  }

  // ─── getCandidates ────────────────────────────────────────────────────────

  async getCandidates(
    sectionId: string,
    filters?: { gradeLevel?: string; search?: string },
    requestingUser?: RequestingUser,
  ) {
    await this.findById(sectionId, requestingUser);

    // Build a subquery for actively-enrolled students in this section.
    // Using a subquery instead of loading all student IDs into Node.js memory:
    //   • avoids array overflow on large deployments (old approach used inArray/notInArray
    //     with potentially thousands of items)
    //   • eliminates the (SQL | undefined)[] spread that could pass undefined to and()
    const enrolledSubquery = this.db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.sectionId, sectionId),
          eq(enrollments.status, 'enrolled'),
        ),
      );

    // Collect only defined extra conditions — avoids unsafe and(...undefined[]) spread.
    const extraConditions: SQL<unknown>[] = [];
    if (filters?.gradeLevel) {
      extraConditions.push(
        eq(studentProfiles.gradeLevel, filters.gradeLevel as any),
      );
    }
    if (filters?.search) {
      const searchCond = or(
        ilike(users.firstName, `%${filters.search}%`),
        ilike(users.lastName, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`),
      );
      if (searchCond) extraConditions.push(searchCond);
    }

    // Single query: join to confirm student role + exclude enrolled via NOT IN subquery.
    const results = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        gradeLevel: studentProfiles.gradeLevel,
        profilePicture: studentProfiles.profilePicture,
      })
      .from(users)
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(
        roles,
        and(eq(roles.id, userRoles.roleId), eq(roles.name, 'student')),
      )
      .where(and(notInArray(users.id, enrolledSubquery), ...extraConditions))
      .orderBy(users.lastName, users.firstName)
      .limit(200);

    if (results.length === 0) {
      return [];
    }

    const studentIds = results.map((student) => student.id);
    const activeSectionMemberships = await this.db
      .select({
        studentId: enrollments.studentId,
        sectionId: enrollments.sectionId,
        sectionName: sections.name,
      })
      .from(enrollments)
      .innerJoin(sections, eq(sections.id, enrollments.sectionId))
      .where(
        and(
          inArray(enrollments.studentId, studentIds),
          eq(enrollments.status, 'enrolled'),
          isNull(enrollments.classId),
          eq(sections.isActive, true),
        ),
      );

    const membershipByStudentId = new Map<
      string,
      { sectionId: string; sectionName: string }
    >();

    for (const membership of activeSectionMemberships) {
      membershipByStudentId.set(membership.studentId, {
        sectionId: membership.sectionId,
        sectionName: membership.sectionName,
      });
    }

    return results.map((candidate) => {
      const membership = membershipByStudentId.get(candidate.id);
      const hasActiveSectionEnrollment = Boolean(
        membership && membership.sectionId !== sectionId,
      );

      return {
        ...candidate,
        hasActiveSectionEnrollment,
        enrolledSectionId: hasActiveSectionEnrollment
          ? membership?.sectionId ?? null
          : null,
        enrolledSectionName: hasActiveSectionEnrollment
          ? membership?.sectionName ?? null
          : null,
      };
    });
  }

  // ─── addStudentsToSection ─────────────────────────────────────────────────

  async addStudentsToSection(
    sectionId: string,
    dto: BulkStudentsDto,
    requestingUser?: RequestingUser,
  ) {
    const section = await this.findById(sectionId, requestingUser);

    return await this.db.transaction(async (tx) => {
      // 1. Capacity check — count DISTINCT enrolled students regardless of classId.
      // A student whose section-only row was promoted to a class row still occupies a
      // seat; counting only classId=NULL rows would silently under-report occupancy.
      const [rosterResult] = await tx
        .select({ count: countDistinct(enrollments.studentId) })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, sectionId),
            eq(enrollments.status, 'enrolled'),
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

      const validIds = new Set(validStudents.map((s) => s.id));
      const invalidIds = dto.studentIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Student IDs not found: ${invalidIds.join(', ')}`,
        );
      }

      // 2b. Verify every provided ID actually holds the 'student' role.
      // Prevents accidentally enrolling teachers or admins as section members.
      const studentRoleRows = await tx
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(
          and(
            inArray(userRoles.userId, dto.studentIds),
            eq(roles.name, 'student'),
          ),
        );

      const confirmedStudentIds = new Set(studentRoleRows.map((r) => r.userId));
      const nonStudentIds = dto.studentIds.filter(
        (id) => !confirmedStudentIds.has(id),
      );
      if (nonStudentIds.length > 0) {
        throw new BadRequestException(
          `The following user(s) do not have the student role: ${nonStudentIds.join(', ')}`,
        );
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

      const alreadyEnrolledIds = new Set(
        alreadyEnrolledRows.map((e) => e.studentId),
      );
      const newStudentIds = dto.studentIds.filter(
        (id) => !alreadyEnrolledIds.has(id),
      );

      if (newStudentIds.length === 0) {
        return { createdCount: 0, created: [], skipped: dto.studentIds.length };
      }

      // 4. Bulk insert all new enrollments in a single statement
      const values = newStudentIds.map((studentId) => ({
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

  async removeStudentFromSection(
    sectionId: string,
    studentId: string,
    requestingUser?: RequestingUser,
  ) {
    await this.findById(sectionId, requestingUser);

    // Wrap the guard check and the delete in a transaction to prevent a TOCTOU race
    // where a concurrent class-enrollment insert lands between the guard read and the
    // delete, leaving the student with a class row but no section row.
    return await this.db.transaction(async (tx) => {
      // Guard: if the student has any class-associated enrollment in this section,
      // those must be cleared first. Use plain select (not relational query API) so
      // both checks run inside the same transaction object.
      const [classEnrollment] = await tx
        .select({ id: enrollments.id, classId: enrollments.classId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, sectionId),
            eq(enrollments.studentId, studentId),
            eq(enrollments.status, 'enrolled'),
            isNotNull(enrollments.classId),
          ),
        )
        .limit(1);

      if (classEnrollment) {
        throw new BadRequestException(
          `Student has an active class enrollment in this section (class ID: ${classEnrollment.classId}); remove the class enrollment first`,
        );
      }

      // Target the section-only row (classId = NULL) explicitly.
      const [sectionEnrollment] = await tx
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, sectionId),
            eq(enrollments.studentId, studentId),
            eq(enrollments.status, 'enrolled'),
            isNull(enrollments.classId),
          ),
        )
        .limit(1);

      if (!sectionEnrollment) {
        throw new BadRequestException(
          'Student is not actively enrolled in this section',
        );
      }

      await tx
        .delete(enrollments)
        .where(eq(enrollments.id, sectionEnrollment.id));

      return { removed: true };
    });
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
        throw new NotFoundException(
          `Adviser with ID "${createSectionDto.adviserId}" not found`,
        );
      }

      // Ensure the assigned adviser actually holds the teacher role
      await this.verifyAdviserHasTeacherRole(createSectionDto.adviserId);
    }

    try {
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
    } catch (err: any) {
      // Surface DB-level unique constraint violations (23505) as a friendly 409 instead
      // of a 500 — these can occur under concurrent requests that both pass the
      // application-level duplicate check before either commits (TOCTOU window).
      if (err?.code === '23505') {
        throw new ConflictException(
          `Section "${createSectionDto.name}" already exists for grade ${createSectionDto.gradeLevel} in ${createSectionDto.schoolYear}`,
        );
      }
      throw err;
    }
  }

  // ─── updateSection ────────────────────────────────────────────────────────

  async updateSection(id: string, updateSectionDto: UpdateSectionDto) {
    const existingSection = await this.findById(id);

    if (
      updateSectionDto.name ||
      updateSectionDto.gradeLevel ||
      updateSectionDto.schoolYear
    ) {
      const nameToCheck = updateSectionDto.name || existingSection.name;
      const gradeToCheck =
        updateSectionDto.gradeLevel || existingSection.gradeLevel;
      const yearToCheck =
        updateSectionDto.schoolYear || existingSection.schoolYear;

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

    // Guard: reject capacity reductions that would strand currently-enrolled students.
    if (updateSectionDto.capacity !== undefined) {
      const [headcountResult] = await this.db
        .select({ count: countDistinct(enrollments.studentId) })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, id),
            eq(enrollments.status, 'enrolled'),
          ),
        );
      const currentHeadcount = Number(headcountResult?.count ?? 0);
      if (updateSectionDto.capacity < currentHeadcount) {
        throw new BadRequestException(
          `Cannot reduce capacity to ${updateSectionDto.capacity}: ${currentHeadcount} student(s) are currently enrolled`,
        );
      }
    }

    // Allow null to explicitly clear the adviser; skip role check when clearing.
    if (
      updateSectionDto.adviserId !== undefined &&
      updateSectionDto.adviserId !== null
    ) {
      const adviser = await this.db.query.users.findFirst({
        where: eq(users.id, updateSectionDto.adviserId),
      });

      if (!adviser) {
        throw new NotFoundException(
          `Adviser with ID "${updateSectionDto.adviserId}" not found`,
        );
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

    if (updateSectionDto.name !== undefined)
      updateData.name = updateSectionDto.name;
    if (updateSectionDto.gradeLevel !== undefined)
      updateData.gradeLevel = updateSectionDto.gradeLevel;
    if (updateSectionDto.schoolYear !== undefined)
      updateData.schoolYear = updateSectionDto.schoolYear;
    if (updateSectionDto.capacity !== undefined)
      updateData.capacity = updateSectionDto.capacity;
    if (updateSectionDto.roomNumber !== undefined)
      updateData.roomNumber = updateSectionDto.roomNumber;
    if (updateSectionDto.adviserId !== undefined)
      updateData.adviserId = updateSectionDto.adviserId;
    if (updateSectionDto.isActive !== undefined)
      updateData.isActive = updateSectionDto.isActive;

    try {
      await this.db.update(sections).set(updateData).where(eq(sections.id, id));
      return this.findById(id);
    } catch (err: any) {
      if (err?.code === '23505') {
        const nameToCheck = updateSectionDto.name || existingSection.name;
        const gradeToCheck =
          updateSectionDto.gradeLevel || existingSection.gradeLevel;
        const yearToCheck =
          updateSectionDto.schoolYear || existingSection.schoolYear;
        throw new ConflictException(
          `Section "${nameToCheck}" already exists for grade ${gradeToCheck} in ${yearToCheck}`,
        );
      }
      throw err;
    }
  }

  // ─── archiveSection / restoreSection ─────────────────────────────────────

  async archiveSection(id: string) {
    await this.findById(id);

    await this.db.transaction(async (tx) => {
      await tx
        .update(enrollments)
        .set({ status: 'dropped' })
        .where(
          and(
            eq(enrollments.sectionId, id),
            eq(enrollments.status, 'enrolled'),
          ),
        );

      await tx
        .update(sections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(sections.id, id));
    });
  }

  async restoreSection(id: string) {
    await this.findById(id);

    await this.db
      .update(sections)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(sections.id, id));
  }

  async deleteSection(id: string) {
    await this.archiveSection(id);
  }

  async getStudentProfileForSection(
    sectionId: string,
    studentId: string,
    requestingUser?: RequestingUser,
  ) {
    const section = await this.findById(sectionId, requestingUser);

    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.sectionId, sectionId),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Student is not enrolled in this section');
    }

    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
      columns: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        status: true,
      },
      with: {
        profile: {
          columns: {
            lrn: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
            address: true,
            gradeLevel: true,
            familyName: true,
            familyRelationship: true,
            familyContact: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return {
      sectionInfo: {
        id: section.id,
        name: section.name,
        gradeLevel: section.gradeLevel,
        schoolYear: section.schoolYear,
      },
      student: {
        ...student,
        profile: student.profile ?? null,
      },
      section: {
        id: section.id,
        name: section.name,
        gradeLevel: section.gradeLevel,
        schoolYear: section.schoolYear,
        roomNumber: section.roomNumber,
        adviser: section.adviser ?? null,
      },
    };
  }

  // ─── permanentlyDeleteSection ─────────────────────────────────────────────

  async permanentlyDeleteSection(id: string) {
    // Verify section exists first
    await this.findById(id);

    // Wrap the pre-flight count checks and the delete in a single transaction
    // to prevent a TOCTOU race where new enrolments are inserted between the
    // reads and the delete.
    await this.db.transaction(async (tx) => {
      const [activeClassesResult, enrolledStudentsResult] = await Promise.all([
        tx
          .select({ count: count() })
          .from(classes)
          .where(and(eq(classes.sectionId, id), eq(classes.isActive, true))),
        tx
          .select({ count: count() })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.sectionId, id),
              eq(enrollments.status, 'enrolled'),
            ),
          ),
      ]);

      const activeClasses = Number(activeClassesResult[0]?.count ?? 0);
      const enrolledStudents = Number(enrolledStudentsResult[0]?.count ?? 0);

      if (activeClasses > 0 || enrolledStudents > 0) {
        throw new BadRequestException(
          `Cannot permanently delete this section: it has ${activeClasses} active class(es) and ${enrolledStudents} enrolled student(s). ` +
            `Deactivate or remove them first, or use the soft-delete endpoint instead.`,
        );
      }

      await tx.delete(sections).where(eq(sections.id, id));
    });
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

    // Students may only view schedules for sections they are actively enrolled in.
    // findById does not enforce this check for the student role.
    if (
      requestingUser &&
      requestingUser.roles.includes('student') &&
      !requestingUser.roles.includes('admin') &&
      !requestingUser.roles.includes('teacher')
    ) {
      const enrollment = await this.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.sectionId, sectionId),
          eq(enrollments.studentId, requestingUser.userId),
          eq(enrollments.status, 'enrolled'),
        ),
      });
      if (!enrollment) {
        throw new ForbiddenException('You are not enrolled in this section');
      }
    }

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
        roomNumber: section.roomNumber ?? null,
      },
      classes: classList.map((cls) => ({
        classId: cls.id,
        subjectName: cls.subjectName,
        subjectCode: cls.subjectCode,
        room: cls.room,
        isActive: cls.isActive,
        teacher: cls.teacher,
        // De-duplicate schedule rows with identical days+startTime+endTime before mapping.
        // The classSchedules table has no DB-level unique constraint on this combination,
        // so a direct DB edit or migration edge case could produce duplicate rows that
        // would silently render as overlapping calendar blocks on the frontend.
        schedules: (cls.schedules ?? [])
          .filter(
            (s, i, arr) =>
              arr.findIndex(
                (x) =>
                  x.startTime === s.startTime &&
                  x.endTime === s.endTime &&
                  [...x.days].sort().join(',') === [...s.days].sort().join(','),
              ) === i,
          )
          .map(toCalendarSlot),
      })),
    };
  }
}

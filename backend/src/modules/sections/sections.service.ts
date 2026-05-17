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
  ne,
  notInArray,
  or,
  SQL,
  sql,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { ClassRecordService } from '../class-record/class-record.service';
import {
  sections,
  classes,
  classRecords,
  classRecordFinalGrades,
  sectionVisibilityPreferences,
  users,
  enrollments,
  studentProfiles,
  userRoles,
  roles,
} from '../../drizzle/schema';
import { toCalendarSlot } from '../../common/utils/schedule.util';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';
import {
  ALLOWED_ROOM_NUMBERS_MESSAGE,
  ALLOWED_ROOM_NUMBERS_SET,
} from '../../common/constants/room-options';
import { BulkStudentsDto } from './DTO/bulk-students.dto';
import {
  type BulkSectionLifecycleAction,
  type BulkSectionLifecycleDto,
  type BulkSectionLifecycleFailure,
  type BulkSectionLifecycleResult,
} from './DTO/bulk-section-lifecycle.dto';

export interface RequestingUser {
  userId: string;
  roles: string[];
}

type AccessStudentGradeStatus = 'pending' | 'passing' | 'failing';

type AccessStudentPromotionReadiness = {
  studentId: string;
  finalGrade: number | null;
  gradeStatus: AccessStudentGradeStatus;
  isFinalized: boolean;
  isPassing: boolean;
  isFailing: boolean;
  requiredClassRecordCount: number;
  finalizedClassRecordCount: number;
  finalGradeRecordCount: number;
  missingFinalGradeCount: number;
  finalizationLabel: string;
};

export type SectionVisibilityStatus = 'all' | 'active' | 'archived' | 'hidden';

@Injectable()
export class SectionsService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly classRecordService: ClassRecordService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private resolveActorRole(
    actorRoles: string[] = [],
  ): 'admin' | 'teacher' | 'system' {
    if (actorRoles.includes('admin')) return 'admin';
    if (actorRoles.includes('teacher')) return 'teacher';
    return 'system';
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

  private normalizeRoomNumber(roomNumber?: string | null): string | null {
    const normalized = roomNumber?.trim() ?? '';
    return normalized.length > 0 ? normalized : null;
  }

  private assertAllowedRoomNumber(roomNumber: string | null): void {
    if (!roomNumber) return;
    if (!ALLOWED_ROOM_NUMBERS_SET.has(roomNumber)) {
      throw new BadRequestException(ALLOWED_ROOM_NUMBERS_MESSAGE);
    }
  }

  private async ensureRoomIsAvailable(
    roomNumber: string | null,
    excludeSectionId?: string,
  ): Promise<void> {
    if (!roomNumber) return;

    const roomConditions: SQL<unknown>[] = [
      eq(sections.roomNumber, roomNumber),
      eq(sections.isActive, true),
    ];

    if (excludeSectionId) {
      roomConditions.push(ne(sections.id, excludeSectionId));
    }

    const roomOwner = await this.db.query.sections.findFirst({
      where: and(...roomConditions),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
      },
    });

    if (roomOwner) {
      throw new ConflictException(
        `Room ${roomNumber} is already assigned to Grade ${roomOwner.gradeLevel} - ${roomOwner.name} (${roomOwner.schoolYear}). Choose another room.`,
      );
    }
  }

  private async ensureAdviserAvailable(
    adviserId: string,
    excludeSectionId?: string,
  ): Promise<void> {
    const adviserConditions: SQL<unknown>[] = [
      eq(sections.adviserId, adviserId),
      eq(sections.isActive, true),
    ];

    if (excludeSectionId) {
      adviserConditions.push(ne(sections.id, excludeSectionId));
    }

    const assignedSection = await this.db.query.sections.findFirst({
      where: and(...adviserConditions),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
      },
    });

    if (assignedSection) {
      throw new ConflictException(
        `Teacher is already assigned as adviser to Grade ${assignedSection.gradeLevel} - ${assignedSection.name} (${assignedSection.schoolYear}). Select another teacher.`,
      );
    }
  }

  private ensureTeacherCanAccessSection(
    sectionRecord: { adviserId: string | null },
    teacherId: string,
  ) {
    if (sectionRecord.adviserId !== teacherId) {
      throw new ForbiddenException('You do not have access to this section');
    }
  }

  private async getHiddenSectionIdsForUser(
    userId: string,
    sectionIds: string[],
  ) {
    if (!userId || sectionIds.length === 0) return new Set<string>();

    const preferences =
      await this.db.query.sectionVisibilityPreferences.findMany({
        where: and(
          eq(sectionVisibilityPreferences.userId, userId),
          inArray(sectionVisibilityPreferences.sectionId, sectionIds),
          eq(sectionVisibilityPreferences.isHidden, true),
        ),
        columns: {
          sectionId: true,
        },
      });

    return new Set(preferences.map((preference) => preference.sectionId));
  }

  private applySectionVisibilityFilter(
    sectionList: Array<{ id: string; isActive: boolean }>,
    hiddenSectionIds: Set<string>,
    status: SectionVisibilityStatus = 'all',
  ) {
    return sectionList
      .map((sectionRecord) => ({
        ...sectionRecord,
        isHidden: hiddenSectionIds.has(sectionRecord.id),
      }))
      .filter((sectionRecord) => {
        if (status === 'hidden') return sectionRecord.isHidden;
        if (sectionRecord.isHidden) return false;
        if (status === 'active') return sectionRecord.isActive;
        if (status === 'archived') return !sectionRecord.isActive;
        return true;
      });
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
    requesterId?: string;
    status?: SectionVisibilityStatus;
  }) {
    const status = filters?.status ?? 'all';
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    if (filters?.gradeLevel)
      whereConditions.push(eq(sections.gradeLevel, filters.gradeLevel));
    if (filters?.schoolYear)
      whereConditions.push(eq(sections.schoolYear, filters.schoolYear));
    if (status === 'active') whereConditions.push(eq(sections.isActive, true));
    if (status === 'archived')
      whereConditions.push(eq(sections.isActive, false));
    if (
      status !== 'active' &&
      status !== 'archived' &&
      filters?.isActive !== undefined
    )
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
    const hiddenSectionIds = await this.getHiddenSectionIdsForUser(
      filters?.requesterId ?? '',
      sectionsList.map((section) => section.id),
    );
    const data = this.applySectionVisibilityFilter(
      sectionsList.map((section) => ({
        ...section,
        studentCount: studentCountsBySection.get(section.id) ?? 0,
      })),
      hiddenSectionIds,
      status,
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total: status === 'hidden' ? data.length : total,
        totalPages:
          status === 'hidden'
            ? Math.ceil(data.length / limit)
            : Math.ceil(total / limit),
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
    filters?: {
      gradeLevel?: string;
      search?: string;
      assignedSectionId?: string;
      eligibility?: 'all' | 'eligible' | 'mismatch';
      sortBy?:
        | 'lastName'
        | 'firstName'
        | 'email'
        | 'gradeLevel'
        | 'lrn'
        | 'eligibility';
      sortDirection?: 'asc' | 'desc';
      prioritizeEligible?: boolean;
      page?: number;
      limit?: number;
    },
    requestingUser?: RequestingUser,
  ) {
    const section = await this.findById(sectionId, requestingUser);

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
    const extraConditions: SQL<unknown>[] = [
      eq(studentProfiles.gradeLevel, section.gradeLevel as any),
    ];
    if (filters?.search) {
      const searchCond = or(
        ilike(users.firstName, `%${filters.search}%`),
        ilike(users.lastName, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`),
        ilike(studentProfiles.lrn, `%${filters.search}%`),
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
        lrn: studentProfiles.lrn,
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
      .orderBy(users.lastName, users.firstName);

    if (results.length === 0) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: Math.max(1, Math.min(Number(filters?.limit ?? 20), 100)),
        totalPages: 1,
      };
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

    const mapped = results.map((candidate) => {
      const membership = membershipByStudentId.get(candidate.id);
      const hasActiveSectionEnrollment = Boolean(
        membership && membership.sectionId !== sectionId,
      );
      const hasGradeMismatch = Boolean(
        candidate.gradeLevel && candidate.gradeLevel !== section.gradeLevel,
      );
      const isEligible = !hasActiveSectionEnrollment && !hasGradeMismatch;
      const eligibilityReason = hasActiveSectionEnrollment
        ? `Already in section ${membership?.sectionName ?? 'another section'}`
        : hasGradeMismatch
          ? `Grade mismatch (${candidate.gradeLevel ?? 'N/A'} vs ${section.gradeLevel})`
          : null;

      return {
        ...candidate,
        isEligible,
        eligibilityReason,
        hasActiveSectionEnrollment,
        enrolledSectionId: hasActiveSectionEnrollment
          ? (membership?.sectionId ?? null)
          : null,
        enrolledSectionName: hasActiveSectionEnrollment
          ? (membership?.sectionName ?? null)
          : null,
      };
    });

    const eligibilityFilter = filters?.eligibility ?? 'all';
    const eligibleFiltered = mapped.filter((row) => {
      if (eligibilityFilter === 'eligible') return row.isEligible;
      if (eligibilityFilter === 'mismatch') return !row.isEligible;
      return true;
    });

    const sectionFiltered = filters?.assignedSectionId
      ? eligibleFiltered.filter(
          (row) => row.enrolledSectionId === filters.assignedSectionId,
        )
      : eligibleFiltered;

    const sortBy = filters?.sortBy ?? 'lastName';
    const sortDirection = filters?.sortDirection ?? 'asc';
    const directionFactor = sortDirection === 'desc' ? -1 : 1;
    const prioritizeEligible = filters?.prioritizeEligible !== false;

    const getSortValue = (row: (typeof mapped)[number]) => {
      switch (sortBy) {
        case 'firstName':
          return String(row.firstName ?? '').toLowerCase();
        case 'email':
          return String(row.email ?? '').toLowerCase();
        case 'gradeLevel':
          return String(row.gradeLevel ?? '').toLowerCase();
        case 'lrn':
          return String(row.lrn ?? '').toLowerCase();
        case 'eligibility':
          return row.isEligible ? '0' : '1';
        case 'lastName':
        default:
          return String(row.lastName ?? '').toLowerCase();
      }
    };

    const sorted = [...sectionFiltered].sort((left, right) => {
      if (prioritizeEligible && left.isEligible !== right.isEligible) {
        return left.isEligible ? -1 : 1;
      }

      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);
      if (leftValue < rightValue) return -1 * directionFactor;
      if (leftValue > rightValue) return 1 * directionFactor;
      return 0;
    });

    const limit = Math.max(1, Math.min(Number(filters?.limit ?? 20), 100));
    const page = Math.max(1, Number(filters?.page ?? 1));
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;

    return {
      data: sorted.slice(offset, offset + limit),
      total,
      page,
      limit,
      totalPages,
    };
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

      // 2c. Validate grade level server-side so clients cannot bypass the
      // section candidate filter and assign students to the wrong grade.
      const profileRows = await tx
        .select({
          userId: studentProfiles.userId,
          gradeLevel: studentProfiles.gradeLevel,
        })
        .from(studentProfiles)
        .where(inArray(studentProfiles.userId, dto.studentIds));

      const profileByStudentId = new Map(
        profileRows.map((row) => [row.userId, row.gradeLevel]),
      );
      const mismatchedIds = dto.studentIds.filter(
        (id) => profileByStudentId.get(id) !== section.gradeLevel,
      );
      if (mismatchedIds.length > 0) {
        throw new BadRequestException(
          `Student grade level must match Grade ${section.gradeLevel}. Mismatched student IDs: ${mismatchedIds.join(', ')}`,
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

  async createSection(
    createSectionDto: CreateSectionDto,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const normalizedRoomNumber = this.normalizeRoomNumber(
      createSectionDto.roomNumber,
    );
    this.assertAllowedRoomNumber(normalizedRoomNumber);

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
      await this.ensureAdviserAvailable(createSectionDto.adviserId);
    }

    await this.ensureRoomIsAvailable(normalizedRoomNumber);

    try {
      const [newSection] = await this.db
        .insert(sections)
        .values({
          name: createSectionDto.name,
          gradeLevel: createSectionDto.gradeLevel,
          schoolYear: createSectionDto.schoolYear,
          capacity: createSectionDto.capacity,
          roomNumber: normalizedRoomNumber,
          adviserId: createSectionDto.adviserId || null,
          isActive: true,
        })
        .returning();

      await this.auditService.log({
        actorId: actorId ?? createSectionDto.adviserId ?? 'system',
        action: 'section.created',
        targetType: 'section',
        targetId: newSection.id,
        metadata: {
          actorRole: this.resolveActorRole(actorRoles),
          gradeLevel: createSectionDto.gradeLevel,
          schoolYear: createSectionDto.schoolYear,
          adviserId: createSectionDto.adviserId ?? null,
          capacity: createSectionDto.capacity,
        },
      });

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

  async updateSection(
    id: string,
    updateSectionDto: UpdateSectionDto,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const normalizedRoomNumber =
      updateSectionDto.roomNumber !== undefined
        ? this.normalizeRoomNumber(updateSectionDto.roomNumber)
        : undefined;
    if (normalizedRoomNumber !== undefined) {
      this.assertAllowedRoomNumber(normalizedRoomNumber);
    }

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
      await this.ensureAdviserAvailable(updateSectionDto.adviserId, id);
    }

    if (normalizedRoomNumber !== undefined) {
      await this.ensureRoomIsAvailable(normalizedRoomNumber, id);
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
    if (normalizedRoomNumber !== undefined)
      updateData.roomNumber = normalizedRoomNumber;
    if (updateSectionDto.adviserId !== undefined)
      updateData.adviserId = updateSectionDto.adviserId;
    if (updateSectionDto.isActive !== undefined)
      updateData.isActive = updateSectionDto.isActive;

    try {
      await this.db.update(sections).set(updateData).where(eq(sections.id, id));

      const changedFields = Object.keys(updateData).filter(
        (key) => key !== 'updatedAt',
      );
      await this.auditService.log({
        actorId: actorId ?? existingSection.adviserId ?? 'system',
        action: 'section.updated',
        targetType: 'section',
        targetId: id,
        metadata: {
          actorRole: this.resolveActorRole(actorRoles),
          changedFields,
          adviserId: updateSectionDto.adviserId ?? existingSection.adviserId,
          gradeLevel: updateSectionDto.gradeLevel ?? existingSection.gradeLevel,
          schoolYear: updateSectionDto.schoolYear ?? existingSection.schoolYear,
        },
      });

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

  async updatePresentation(
    id: string,
    presentation: { cardBannerUrl?: string | null },
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    const sectionRecord = await this.findById(id);

    if (
      requesterId &&
      requesterRoles &&
      requesterRoles.includes('teacher') &&
      !requesterRoles.includes('admin')
    ) {
      this.ensureTeacherCanAccessSection(sectionRecord, requesterId);
    }

    const payload: { cardBannerUrl?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (presentation.cardBannerUrl !== undefined) {
      payload.cardBannerUrl = presentation.cardBannerUrl;
    }

    await this.db.update(sections).set(payload).where(eq(sections.id, id));

    const actorRole = this.resolveActorRole(requesterRoles ?? []);
    await this.auditService.log({
      actorId: requesterId ?? sectionRecord.adviserId ?? 'system',
      action: 'section.presentation.updated',
      targetType: 'section',
      targetId: id,
      metadata: {
        actorRole,
        changedFields:
          presentation.cardBannerUrl !== undefined ? ['cardBannerUrl'] : [],
        cardBannerUrl: presentation.cardBannerUrl,
      },
    });

    return this.findById(
      id,
      requesterId
        ? { userId: requesterId, roles: requesterRoles ?? [] }
        : undefined,
    );
  }

  async setSectionHiddenState(
    sectionId: string,
    userId: string,
    userRoles: string[],
    hidden: boolean,
  ) {
    const sectionRecord = await this.findById(sectionId);

    if (userRoles.includes('teacher') && !userRoles.includes('admin')) {
      this.ensureTeacherCanAccessSection(sectionRecord, userId);
    }

    const existingPreference =
      await this.db.query.sectionVisibilityPreferences.findFirst({
        where: and(
          eq(sectionVisibilityPreferences.sectionId, sectionId),
          eq(sectionVisibilityPreferences.userId, userId),
        ),
      });

    if (existingPreference) {
      await this.db
        .update(sectionVisibilityPreferences)
        .set({
          isHidden: hidden,
          updatedAt: new Date(),
        })
        .where(eq(sectionVisibilityPreferences.id, existingPreference.id));
    } else {
      await this.db.insert(sectionVisibilityPreferences).values({
        sectionId,
        userId,
        isHidden: hidden,
      });
    }

    await this.auditService.log({
      actorId: userId,
      action: 'section.visibility.updated',
      targetType: 'section',
      targetId: sectionId,
      metadata: {
        actorRole: this.resolveActorRole(userRoles),
        hidden,
      },
    });

    return {
      sectionId,
      isHidden: hidden,
    };
  }

  async archiveSection(
    id: string,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const section = await this.findById(id);

    await this.db.transaction(async (tx) => {
      await tx
        .update(classes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(classes.sectionId, id));

      await tx
        .update(sections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(sections.id, id));
    });

    await this.auditService.log({
      actorId: actorId ?? section.adviserId ?? 'system',
      action: 'section.archived',
      targetType: 'section',
      targetId: id,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        previousIsActive: section.isActive,
      },
    });
  }

  async restoreSection(
    id: string,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const section = await this.findById(id);

    await this.db.transaction(async (tx) => {
      await tx
        .update(sections)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(sections.id, id));

      await tx
        .update(classes)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(classes.sectionId, id));
    });

    await this.auditService.log({
      actorId: actorId ?? section.adviserId ?? 'system',
      action: 'section.restored',
      targetType: 'section',
      targetId: id,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        previousIsActive: section.isActive,
      },
    });
  }

  async deleteSection(id: string, actorId?: string, actorRoles: string[] = []) {
    await this.archiveSection(id, actorId, actorRoles);
  }

  private async performBulkLifecycleAction(
    action: BulkSectionLifecycleAction,
    sectionId: string,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const section = await this.findById(sectionId);

    switch (action) {
      case 'archive':
        if (!section.isActive) {
          throw new ConflictException('Section is already archived.');
        }
        await this.archiveSection(sectionId, actorId, actorRoles);
        return;
      case 'restore':
        if (section.isActive) {
          throw new ConflictException('Section is already active.');
        }
        await this.restoreSection(sectionId, actorId, actorRoles);
        return;
      case 'purge':
        if (section.isActive) {
          throw new ConflictException(
            'Only archived sections can be permanently deleted. Archive the section first.',
          );
        }
        await this.permanentlyDeleteSection(sectionId, actorId, actorRoles);
        return;
      default: {
        throw new BadRequestException(
          'Unsupported bulk section lifecycle action.',
        );
      }
    }
  }

  private buildBulkLifecycleMessage(
    action: BulkSectionLifecycleAction,
    successCount: number,
    failureCount: number,
  ) {
    const verbMap: Record<BulkSectionLifecycleAction, string> = {
      archive: 'archived',
      restore: 'restored',
      purge: 'purged',
    };
    const noun = successCount === 1 ? 'section' : 'sections';
    const verb = verbMap[action];

    if (failureCount === 0) {
      return `${successCount} ${noun} ${verb}.`;
    }

    return `${successCount} ${noun} ${verb}; ${failureCount} failed.`;
  }

  async bulkLifecycleAction(
    dto: BulkSectionLifecycleDto,
    actorId?: string,
    actorRoles: string[] = [],
  ): Promise<BulkSectionLifecycleResult> {
    const sectionIds = [...new Set(dto.sectionIds)];
    const succeeded: string[] = [];
    const failed: BulkSectionLifecycleFailure[] = [];

    for (const sectionId of sectionIds) {
      try {
        await this.performBulkLifecycleAction(
          dto.action,
          sectionId,
          actorId,
          actorRoles,
        );
        succeeded.push(sectionId);
      } catch (error) {
        failed.push({
          sectionId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      message: this.buildBulkLifecycleMessage(
        dto.action,
        succeeded.length,
        failed.length,
      ),
      data: {
        action: dto.action,
        requested: sectionIds.length,
        succeeded,
        failed,
      },
    };
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

  async permanentlyDeleteSection(
    id: string,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    // Verify section exists first
    const section = await this.findById(id);

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

    await this.auditService.log({
      actorId: actorId ?? section.adviserId ?? 'system',
      action: 'section.purged',
      targetType: 'section',
      targetId: id,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        previousIsActive: section.isActive,
      },
    });
  }

  private parseGradeLevelAsNumber(gradeLevel: string): number {
    const parsed = Number.parseInt(gradeLevel, 10);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`Invalid grade level: "${gradeLevel}"`);
    }
    return parsed;
  }

  private getNextSchoolYear(currentSchoolYear: string): string {
    const match = currentSchoolYear.match(/^(\d{4})-(\d{4})$/);
    if (!match) {
      throw new BadRequestException(
        `Invalid school year format "${currentSchoolYear}". Expected YYYY-YYYY.`,
      );
    }

    const start = Number.parseInt(match[1], 10) + 1;
    const end = Number.parseInt(match[2], 10) + 1;
    return `${start}-${end}`;
  }

  private roundFinalGrade(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }

    return Math.round(Number(value) * 1000) / 1000;
  }

  private buildPromotionReadiness(input: {
    studentId: string;
    averageFinal: number | null;
    requiredClassRecordCount: number;
    finalizedClassRecordCount: number;
    finalGradeRecordCount: number;
  }): AccessStudentPromotionReadiness {
    const finalGrade = this.roundFinalGrade(input.averageFinal);
    const missingFinalGradeCount = Math.max(
      input.requiredClassRecordCount - input.finalGradeRecordCount,
      0,
    );
    const isFinalized =
      input.requiredClassRecordCount > 0 &&
      input.finalizedClassRecordCount >= input.requiredClassRecordCount &&
      missingFinalGradeCount === 0 &&
      finalGrade !== null;
    const isPassing = isFinalized && finalGrade !== null && finalGrade >= 75;
    const isFailing = isFinalized && finalGrade !== null && finalGrade < 75;
    const gradeStatus: AccessStudentGradeStatus = !isFinalized
      ? 'pending'
      : isPassing
        ? 'passing'
        : 'failing';
    const finalizationLabel = !isFinalized
      ? input.requiredClassRecordCount === 0
        ? 'No class records found to finalize'
        : `${input.finalizedClassRecordCount}/${input.requiredClassRecordCount} class records finalized, ${input.finalGradeRecordCount}/${input.requiredClassRecordCount} final grades posted`
      : isPassing
        ? 'Finalized and passing'
        : 'Finalized and failing';

    return {
      studentId: input.studentId,
      finalGrade,
      gradeStatus,
      isFinalized,
      isPassing,
      isFailing,
      requiredClassRecordCount: input.requiredClassRecordCount,
      finalizedClassRecordCount: input.finalizedClassRecordCount,
      finalGradeRecordCount: input.finalGradeRecordCount,
      missingFinalGradeCount,
      finalizationLabel,
    };
  }

  private async getSectionStudentPromotionReadiness(
    sectionId: string,
    studentIds: string[],
  ) {
    const uniqueStudentIds = [...new Set(studentIds)];
    if (uniqueStudentIds.length === 0) {
      return new Map<string, AccessStudentPromotionReadiness>();
    }

    const recordRows = await this.db
      .select({
        id: classRecords.id,
        status: classRecords.status,
      })
      .from(classRecords)
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(and(eq(classes.sectionId, sectionId), eq(classes.isActive, true)));

    const requiredClassRecordCount = recordRows.length;
    const finalizedClassRecordCount = recordRows.filter((record) =>
      ['finalized', 'locked'].includes(record.status),
    ).length;
    const classRecordIds = recordRows.map((record) => record.id);

    const gradeRows = classRecordIds.length
      ? await this.db
          .select({
            studentId: classRecordFinalGrades.studentId,
            avgFinal:
              sql<number>`avg(${classRecordFinalGrades.finalPercentage}::numeric)`.mapWith(
                Number,
              ),
            finalGradeRecordCount:
              sql<number>`count(distinct ${classRecordFinalGrades.classRecordId})`.mapWith(
                Number,
              ),
          })
          .from(classRecordFinalGrades)
          .where(
            and(
              inArray(classRecordFinalGrades.classRecordId, classRecordIds),
              inArray(classRecordFinalGrades.studentId, uniqueStudentIds),
            ),
          )
          .groupBy(classRecordFinalGrades.studentId)
      : [];

    const gradeByStudentId = new Map(
      gradeRows.map((row) => [
        row.studentId,
        {
          averageFinal: Number(row.avgFinal ?? 0),
          finalGradeRecordCount: Number(row.finalGradeRecordCount ?? 0),
        },
      ]),
    );

    return new Map(
      uniqueStudentIds.map((studentId) => {
        const gradeInfo = gradeByStudentId.get(studentId);
        const readiness = this.buildPromotionReadiness({
          studentId,
          averageFinal: gradeInfo?.averageFinal ?? null,
          requiredClassRecordCount,
          finalizedClassRecordCount,
          finalGradeRecordCount: gradeInfo?.finalGradeRecordCount ?? 0,
        });
        return [studentId, readiness];
      }),
    );
  }

  async getAccessStudentsOverview(filters?: {
    schoolYear?: string;
    gradeLevel?: string;
    sectionId?: string;
    search?: string;
  }) {
    const sectionWhere: SQL<unknown>[] = [eq(sections.isActive, true)];
    if (filters?.schoolYear) {
      sectionWhere.push(eq(sections.schoolYear, filters.schoolYear));
    }
    if (filters?.gradeLevel) {
      sectionWhere.push(eq(sections.gradeLevel, filters.gradeLevel));
    }
    if (filters?.sectionId) {
      sectionWhere.push(eq(sections.id, filters.sectionId));
    }

    const sectionList = await this.db.query.sections.findMany({
      where: and(...sectionWhere),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
        roomNumber: true,
        capacity: true,
      },
      with: {
        adviser: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (table, { asc }) => [
        asc(table.schoolYear),
        asc(table.gradeLevel),
        asc(table.name),
      ],
    });

    if (sectionList.length === 0) {
      return {
        data: [],
        totalSections: 0,
        totalStudents: 0,
      };
    }

    const sectionIds = sectionList.map((section) => section.id);

    const rosterRows = await this.db
      .select({
        sectionId: enrollments.sectionId,
        studentId: users.id,
        firstName: users.firstName,
        middleName: users.middleName,
        lastName: users.lastName,
        email: users.email,
        lrn: studentProfiles.lrn,
        gradeLevel: studentProfiles.gradeLevel,
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(
        and(
          inArray(enrollments.sectionId, sectionIds),
          eq(enrollments.status, 'enrolled'),
        ),
      );

    const finalGradeRows = await this.db
      .select({
        sectionId: classes.sectionId,
        studentId: classRecordFinalGrades.studentId,
        avgFinal:
          sql<number>`avg(${classRecordFinalGrades.finalPercentage}::numeric)`.mapWith(
            Number,
          ),
        finalGradeRecordCount:
          sql<number>`count(distinct ${classRecordFinalGrades.classRecordId})`.mapWith(
            Number,
          ),
      })
      .from(classRecordFinalGrades)
      .innerJoin(
        classRecords,
        eq(classRecords.id, classRecordFinalGrades.classRecordId),
      )
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(and(inArray(classes.sectionId, sectionIds), eq(classes.isActive, true)))
      .groupBy(classes.sectionId, classRecordFinalGrades.studentId);

    const classRecordCountRows = await this.db
      .select({
        sectionId: classes.sectionId,
        totalRecords:
          sql<number>`count(distinct ${classRecords.id})`.mapWith(Number),
        finalizedRecords:
          sql<number>`count(distinct case when ${classRecords.status} in ('finalized', 'locked') then ${classRecords.id} end)`.mapWith(
            Number,
          ),
      })
      .from(classes)
      .leftJoin(classRecords, eq(classRecords.classId, classes.id))
      .where(and(inArray(classes.sectionId, sectionIds), eq(classes.isActive, true)))
      .groupBy(classes.sectionId);

    const classRecordCountBySectionId = new Map<
      string,
      { totalRecords: number; finalizedRecords: number }
    >();
    for (const row of classRecordCountRows) {
      classRecordCountBySectionId.set(row.sectionId, {
        totalRecords: Number(row.totalRecords ?? 0),
        finalizedRecords: Number(row.finalizedRecords ?? 0),
      });
    }

    const finalGradeBySectionStudentKey = new Map<
      string,
      { averageFinal: number; finalGradeRecordCount: number }
    >();
    for (const row of finalGradeRows) {
      finalGradeBySectionStudentKey.set(`${row.sectionId}:${row.studentId}`, {
        averageFinal: Number(row.avgFinal ?? 0),
        finalGradeRecordCount: Number(row.finalGradeRecordCount ?? 0),
      });
    }

    const normalizedSearch = filters?.search?.trim().toLowerCase() ?? '';
    const seenRosterKeys = new Set<string>();
    const studentsBySectionId = new Map<
      string,
      Array<{
        id: string;
        firstName: string | null;
        middleName: string | null;
        lastName: string | null;
        email: string;
        lrn: string | null;
        gradeLevel: string | null;
        finalGrade: number | null;
        finalGradePercentage: number | null;
        gradeStatus: AccessStudentGradeStatus;
        isFinalized: boolean;
        isPassing: boolean;
        isFailing: boolean;
        requiredClassRecordCount: number;
        finalizedClassRecordCount: number;
        finalGradeRecordCount: number;
        missingFinalGradeCount: number;
        finalizationLabel: string;
      }>
    >();

    for (const row of rosterRows) {
      const rosterKey = `${row.sectionId}:${row.studentId}`;
      if (seenRosterKeys.has(rosterKey)) continue;
      seenRosterKeys.add(rosterKey);

      const finalGradeKey = `${row.sectionId}:${row.studentId}`;
      const finalGradeValue = finalGradeBySectionStudentKey.get(finalGradeKey);
      const classRecordCounts = classRecordCountBySectionId.get(row.sectionId) ?? {
        totalRecords: 0,
        finalizedRecords: 0,
      };
      const readiness = this.buildPromotionReadiness({
        studentId: row.studentId,
        averageFinal: finalGradeValue?.averageFinal ?? null,
        requiredClassRecordCount: classRecordCounts.totalRecords,
        finalizedClassRecordCount: classRecordCounts.finalizedRecords,
        finalGradeRecordCount: finalGradeValue?.finalGradeRecordCount ?? 0,
      });
      const finalGrade = readiness.finalGrade;
      const searchable = [
        row.firstName ?? '',
        row.middleName ?? '',
        row.lastName ?? '',
        row.email ?? '',
        row.lrn ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (normalizedSearch && !searchable.includes(normalizedSearch)) {
        continue;
      }

      const bucket = studentsBySectionId.get(row.sectionId) ?? [];
      bucket.push({
        id: row.studentId,
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
        email: row.email,
        lrn: row.lrn,
        gradeLevel: row.gradeLevel ?? null,
        finalGrade,
        finalGradePercentage: readiness.finalGrade,
        gradeStatus: readiness.gradeStatus,
        isFinalized: readiness.isFinalized,
        isPassing: readiness.isPassing,
        isFailing: readiness.isFailing,
        requiredClassRecordCount: readiness.requiredClassRecordCount,
        finalizedClassRecordCount: readiness.finalizedClassRecordCount,
        finalGradeRecordCount: readiness.finalGradeRecordCount,
        missingFinalGradeCount: readiness.missingFinalGradeCount,
        finalizationLabel: readiness.finalizationLabel,
      });
      studentsBySectionId.set(row.sectionId, bucket);
    }

    const gradeBuckets = new Map<
      string,
      Array<{
        id: string;
        name: string;
        gradeLevel: string;
        schoolYear: string;
        roomNumber: string | null;
        capacity: number;
        adviser: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
        } | null;
        classRecordCount: number;
        finalizedClassRecordCount: number;
        studentCount: number;
        students: Array<{
          id: string;
          firstName: string | null;
          middleName: string | null;
          lastName: string | null;
          email: string;
          lrn: string | null;
          gradeLevel: string | null;
          finalGrade: number | null;
          finalGradePercentage: number | null;
          gradeStatus: AccessStudentGradeStatus;
          isFinalized: boolean;
          isPassing: boolean;
          isFailing: boolean;
          requiredClassRecordCount: number;
          finalizedClassRecordCount: number;
          finalGradeRecordCount: number;
          missingFinalGradeCount: number;
          finalizationLabel: string;
        }>;
      }>
    >();

    for (const section of sectionList) {
      const students = studentsBySectionId.get(section.id) ?? [];
      const classRecordCounts = classRecordCountBySectionId.get(section.id) ?? {
        totalRecords: 0,
        finalizedRecords: 0,
      };

      const gradeBucket = gradeBuckets.get(section.gradeLevel) ?? [];
      gradeBucket.push({
        id: section.id,
        name: section.name,
        gradeLevel: section.gradeLevel,
        schoolYear: section.schoolYear,
        roomNumber: section.roomNumber ?? null,
        capacity: section.capacity,
        adviser: section.adviser
          ? {
              id: section.adviser.id,
              firstName: section.adviser.firstName,
              lastName: section.adviser.lastName,
              email: section.adviser.email,
            }
          : null,
        classRecordCount: classRecordCounts.totalRecords,
        finalizedClassRecordCount: classRecordCounts.finalizedRecords,
        studentCount: students.length,
        students: students.sort((left, right) => {
          const leftLast = (left.lastName ?? '').toLowerCase();
          const rightLast = (right.lastName ?? '').toLowerCase();
          if (leftLast !== rightLast) return leftLast.localeCompare(rightLast);
          return (left.firstName ?? '')
            .toLowerCase()
            .localeCompare((right.firstName ?? '').toLowerCase());
        }),
      });
      gradeBuckets.set(section.gradeLevel, gradeBucket);
    }

    const data = Array.from(gradeBuckets.entries())
      .sort(
        ([leftGrade], [rightGrade]) =>
          this.parseGradeLevelAsNumber(leftGrade) -
          this.parseGradeLevelAsNumber(rightGrade),
      )
      .map(([gradeLevel, sectionRows]) => ({
        gradeLevel,
        sections: sectionRows.sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      }));

    const totalStudents = data.reduce(
      (studentTotal, gradeBucket) =>
        studentTotal +
        gradeBucket.sections.reduce(
          (sectionTotal, section) => sectionTotal + section.studentCount,
          0,
        ),
      0,
    );
    const totalSections = data.reduce(
      (sectionTotal, gradeBucket) => sectionTotal + gradeBucket.sections.length,
      0,
    );

    return {
      data,
      totalStudents,
      totalSections,
    };
  }

  async getAccessStudentsTargetSections(query: {
    fromSectionId: string;
    mode: 'promote' | 'retain';
    schoolYear?: string;
  }) {
    const fromSection = await this.db.query.sections.findFirst({
      where: eq(sections.id, query.fromSectionId),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
      },
    });

    if (!fromSection) {
      throw new NotFoundException('Source section not found');
    }

    const fromGradeLevel = this.parseGradeLevelAsNumber(fromSection.gradeLevel);
    if (query.mode === 'promote' && fromGradeLevel >= 10) {
      throw new BadRequestException(
        'Grade 10 students cannot be promoted to the next grade level.',
      );
    }

    const targetGradeLevel =
      query.mode === 'promote'
        ? String(fromGradeLevel + 1)
        : fromSection.gradeLevel;
    const targetSchoolYear =
      query.schoolYear ?? this.getNextSchoolYear(fromSection.schoolYear);

    const targetSchoolYearRows = await this.db.query.sections.findMany({
      where: and(
        eq(sections.isActive, true),
        eq(sections.gradeLevel, targetGradeLevel),
      ),
      columns: {
        schoolYear: true,
      },
      orderBy: (table, { asc }) => [asc(table.schoolYear)],
    });

    const availableSchoolYears = Array.from(
      new Set([
        targetSchoolYear,
        ...targetSchoolYearRows.map((section) => section.schoolYear),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    const targetSections = await this.db.query.sections.findMany({
      where: and(
        eq(sections.isActive, true),
        eq(sections.gradeLevel, targetGradeLevel),
        eq(sections.schoolYear, targetSchoolYear),
      ),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
        roomNumber: true,
        capacity: true,
      },
      orderBy: (table, { asc }) => [asc(table.name)],
    });

    return {
      mode: query.mode,
      fromSection,
      targetGradeLevel,
      targetSchoolYear,
      availableSchoolYears,
      sections: targetSections,
    };
  }

  private async validateStudentAssignmentTransfer(
    fromSectionId: string,
    targetSectionId: string,
    studentIds: string[],
  ) {
    const sourceMembershipRows = await this.db
      .select({
        studentId: enrollments.studentId,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.sectionId, fromSectionId),
          eq(enrollments.status, 'enrolled'),
          inArray(enrollments.studentId, studentIds),
        ),
      )
      .groupBy(enrollments.studentId);

    const sourceStudentIdSet = new Set(
      sourceMembershipRows.map((row) => row.studentId),
    );
    const missingStudentIds = studentIds.filter(
      (studentId) => !sourceStudentIdSet.has(studentId),
    );
    if (missingStudentIds.length > 0) {
      throw new BadRequestException(
        `These student(s) are not enrolled in the source section: ${missingStudentIds.join(', ')}`,
      );
    }

    const conflictingAssignments = await this.db
      .select({
        studentId: enrollments.studentId,
        sectionId: enrollments.sectionId,
        sectionName: sections.name,
        sectionGradeLevel: sections.gradeLevel,
      })
      .from(enrollments)
      .innerJoin(sections, eq(sections.id, enrollments.sectionId))
      .where(
        and(
          inArray(enrollments.studentId, studentIds),
          eq(enrollments.status, 'enrolled'),
          isNull(enrollments.classId),
          notInArray(enrollments.sectionId, [fromSectionId, targetSectionId]),
        ),
      );

    if (conflictingAssignments.length > 0) {
      const firstConflict = conflictingAssignments[0];
      throw new ConflictException(
        `Student assignment conflict detected. Student ${firstConflict.studentId} is already assigned to Grade ${firstConflict.sectionGradeLevel} - ${firstConflict.sectionName}.`,
      );
    }
  }

  private async transferStudentsBetweenSections(params: {
    fromSectionId: string;
    targetSectionId: string;
    studentIds: string[];
    targetGradeLevel: string;
  }) {
    const uniqueStudentIds = [...new Set(params.studentIds)];
    if (uniqueStudentIds.length === 0) {
      return 0;
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(enrollments)
        .set({ status: 'dropped' })
        .where(
          and(
            eq(enrollments.sectionId, params.fromSectionId),
            eq(enrollments.status, 'enrolled'),
            inArray(enrollments.studentId, uniqueStudentIds),
          ),
        );

      const alreadyInTargetRows = await tx
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, params.targetSectionId),
            eq(enrollments.status, 'enrolled'),
            isNull(enrollments.classId),
            inArray(enrollments.studentId, uniqueStudentIds),
          ),
        );

      const alreadyInTargetSet = new Set(
        alreadyInTargetRows.map((row) => row.studentId),
      );
      const studentsToInsert = uniqueStudentIds.filter(
        (studentId) => !alreadyInTargetSet.has(studentId),
      );

      if (studentsToInsert.length > 0) {
        await tx.insert(enrollments).values(
          studentsToInsert.map((studentId) => ({
            studentId,
            classId: null,
            sectionId: params.targetSectionId,
            status: 'enrolled' as const,
            enrolledAt: new Date(),
          })),
        );
      }

      await tx
        .update(studentProfiles)
        .set({ gradeLevel: params.targetGradeLevel as any })
        .where(inArray(studentProfiles.userId, uniqueStudentIds));
    });

    return uniqueStudentIds.length;
  }

  async finalizeAccessStudentGrades(
    dto: { sectionId: string; studentIds?: string[] },
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, dto.sectionId),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const recordRows = await this.db
      .select({
        id: classRecords.id,
        status: classRecords.status,
        classId: classes.id,
        subjectName: classes.subjectName,
      })
      .from(classRecords)
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(and(eq(classes.sectionId, section.id), eq(classes.isActive, true)));

    if (recordRows.length === 0) {
      throw new BadRequestException(
        'This section has no class records to finalize yet.',
      );
    }

    const draftRecords = recordRows.filter((record) => record.status === 'draft');
    const finalizedRecords: Array<{ classRecordId: string; subjectName: string }> = [];

    for (const record of draftRecords) {
      await this.classRecordService.finalizeClassRecord(
        record.id,
        actorId ?? 'system',
        actorRoles,
      );
      finalizedRecords.push({
        classRecordId: record.id,
        subjectName: record.subjectName,
      });
    }

    const selectedStudentIds = [...new Set(dto.studentIds ?? [])];
    const studentReadiness = selectedStudentIds.length
      ? Array.from(
          (
            await this.getSectionStudentPromotionReadiness(
              section.id,
              selectedStudentIds,
            )
          ).values(),
        )
      : [];

    await this.auditService.log({
      actorId: actorId ?? 'system',
      action: 'section.students.grades_finalized',
      targetType: 'section',
      targetId: section.id,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        finalizedClassRecordCount: finalizedRecords.length,
        selectedStudentCount: selectedStudentIds.length,
      },
    });

    return {
      section,
      finalizedClassRecordCount: finalizedRecords.length,
      alreadyFinalizedClassRecordCount: recordRows.length - draftRecords.length,
      finalizedRecords,
      students: studentReadiness,
    };
  }

  async moveUpStudents(
    dto: {
      fromSectionId: string;
      targetSectionId: string;
      studentIds: string[];
      allowFailingPromotion?: boolean;
    },
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    if (dto.fromSectionId === dto.targetSectionId) {
      throw new BadRequestException(
        'Source and target sections must be different.',
      );
    }

    const [fromSection, targetSection] = await Promise.all([
      this.db.query.sections.findFirst({
        where: eq(sections.id, dto.fromSectionId),
        columns: {
          id: true,
          name: true,
          gradeLevel: true,
          schoolYear: true,
        },
      }),
      this.db.query.sections.findFirst({
        where: eq(sections.id, dto.targetSectionId),
        columns: {
          id: true,
          name: true,
          gradeLevel: true,
          schoolYear: true,
        },
      }),
    ]);

    if (!fromSection) throw new NotFoundException('Source section not found');
    if (!targetSection) throw new NotFoundException('Target section not found');

    const fromGradeLevel = this.parseGradeLevelAsNumber(fromSection.gradeLevel);
    if (fromGradeLevel >= 10) {
      throw new BadRequestException(
        'Grade 10 students cannot be promoted to the next grade level.',
      );
    }

    const expectedTargetGradeLevel = String(fromGradeLevel + 1);
    if (targetSection.gradeLevel !== expectedTargetGradeLevel) {
      throw new BadRequestException(
        `Target section must be Grade ${expectedTargetGradeLevel} for promotion from Grade ${fromSection.gradeLevel}.`,
      );
    }

    if (targetSection.schoolYear === fromSection.schoolYear) {
      throw new BadRequestException(
        'Target section must belong to a new school year for promotion.',
      );
    }

    const uniqueStudentIds = [...new Set(dto.studentIds)];
    await this.validateStudentAssignmentTransfer(
      fromSection.id,
      targetSection.id,
      uniqueStudentIds,
    );

    const readinessByStudentId = await this.getSectionStudentPromotionReadiness(
      fromSection.id,
      uniqueStudentIds,
    );
    const studentReadiness = Array.from(readinessByStudentId.values());
    const unfinalizedStudents = studentReadiness.filter(
      (student) => !student.isFinalized,
    );

    if (unfinalizedStudents.length > 0) {
      throw new BadRequestException({
        message:
          'Finalize selected student grades before moving students up.',
        unfinalizedStudents,
      });
    }

    const failingStudents = studentReadiness.filter(
      (student) => !student.isPassing,
    );

    if (failingStudents.length > 0) {
      throw new BadRequestException({
        message:
          'Only finalized passing students can be moved up. Retain failing students instead.',
        failingStudents,
      });
    }

    const movedCount = await this.transferStudentsBetweenSections({
      fromSectionId: fromSection.id,
      targetSectionId: targetSection.id,
      studentIds: uniqueStudentIds,
      targetGradeLevel: targetSection.gradeLevel,
    });

    await this.auditService.log({
      actorId: actorId ?? 'system',
      action: 'section.students.promoted',
      targetType: 'section',
      targetId: targetSection.id,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        fromSectionId: fromSection.id,
        targetSectionId: targetSection.id,
        movedCount,
        finalizedPassingStudents: studentReadiness.length,
      },
    });

    return {
      movedCount,
      failingStudents,
      fromSection,
      targetSection,
    };
  }

  async failStudents(
    dto: {
      fromSectionId: string;
      targetSectionId: string;
      studentIds: string[];
    },
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    if (dto.fromSectionId === dto.targetSectionId) {
      throw new BadRequestException(
        'Source and target sections must be different.',
      );
    }

    const [fromSection, targetSection] = await Promise.all([
      this.db.query.sections.findFirst({
        where: eq(sections.id, dto.fromSectionId),
        columns: {
          id: true,
          name: true,
          gradeLevel: true,
          schoolYear: true,
        },
      }),
      this.db.query.sections.findFirst({
        where: eq(sections.id, dto.targetSectionId),
        columns: {
          id: true,
          name: true,
          gradeLevel: true,
          schoolYear: true,
        },
      }),
    ]);

    if (!fromSection) throw new NotFoundException('Source section not found');
    if (!targetSection) throw new NotFoundException('Target section not found');

    if (targetSection.gradeLevel !== fromSection.gradeLevel) {
      throw new BadRequestException(
        `Retained students must stay in Grade ${fromSection.gradeLevel}.`,
      );
    }

    if (targetSection.schoolYear === fromSection.schoolYear) {
      throw new BadRequestException(
        'Target section must belong to a new school year for retention.',
      );
    }

    const uniqueStudentIds = [...new Set(dto.studentIds)];
    await this.validateStudentAssignmentTransfer(
      fromSection.id,
      targetSection.id,
      uniqueStudentIds,
    );

    const readinessByStudentId = await this.getSectionStudentPromotionReadiness(
      fromSection.id,
      uniqueStudentIds,
    );
    const studentReadiness = Array.from(readinessByStudentId.values());
    const unfinalizedStudents = studentReadiness.filter(
      (student) => !student.isFinalized,
    );

    if (unfinalizedStudents.length > 0) {
      throw new BadRequestException({
        message: 'Finalize selected student grades before retaining students.',
        unfinalizedStudents,
      });
    }

    const nonFailingStudents = studentReadiness.filter(
      (student) => !student.isFailing,
    );

    if (nonFailingStudents.length > 0) {
      throw new BadRequestException({
        message:
          'Only finalized failing students can be retained. Move passing students up instead.',
        nonFailingStudents,
      });
    }

    const retainedCount = await this.transferStudentsBetweenSections({
      fromSectionId: fromSection.id,
      targetSectionId: targetSection.id,
      studentIds: uniqueStudentIds,
      targetGradeLevel: targetSection.gradeLevel,
    });

    await this.auditService.log({
      actorId: actorId ?? 'system',
      action: 'section.students.retained',
      targetType: 'section',
      targetId: targetSection.id,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        fromSectionId: fromSection.id,
        targetSectionId: targetSection.id,
        retainedCount,
        finalizedFailingStudents: studentReadiness.length,
      },
    });

    return {
      retainedCount,
      fromSection,
      targetSection,
    };
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

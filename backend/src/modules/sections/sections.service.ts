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
import { AcademicMutation } from '../../database/academic-transaction';
import { AcademicTransitionReadinessService } from '../academic-state/academic-transition-readiness.service';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import type { AcademicOutcome } from '../academic-state/academic-policy';
import type { TransitionBlocker } from '../academic-state/academic-transition-readiness';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { ClassRecordService } from '../class-record/class-record.service';
import {
  sections,
  classes,
  classRecords,
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
  outcome: AcademicOutcome;
  blockers: TransitionBlocker[];
  outcomeManagedByTransition: true;
};

export type SectionVisibilityStatus = 'all' | 'active' | 'archived' | 'hidden';

@Injectable()
export class SectionsService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly classRecordService: ClassRecordService,
    private readonly readinessService: AcademicTransitionReadinessService,
    private readonly policyService: AcademicPolicyService,
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
      isNull(studentProfiles.graduatedAt),
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

    const [activeSectionMemberships, completedSectionMemberships] =
      await Promise.all([
        this.db
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
          ),
        this.db
          .select({
            studentId: enrollments.studentId,
          })
          .from(enrollments)
          .where(
            and(
              inArray(enrollments.studentId, studentIds),
              eq(enrollments.status, 'completed'),
              isNull(enrollments.classId),
            ),
          ),
      ]);

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

    const completedStudentIds = new Set(
      completedSectionMemberships.map((m) => m.studentId),
    );

    const mapped = results.map((candidate) => {
      const membership = membershipByStudentId.get(candidate.id);
      const isCompleted = completedStudentIds.has(candidate.id);
      const hasActiveSectionEnrollment = Boolean(
        membership && membership.sectionId !== sectionId,
      );
      const hasGradeMismatch = Boolean(
        candidate.gradeLevel && candidate.gradeLevel !== section.gradeLevel,
      );
      const isEligible =
        !isCompleted && !hasActiveSectionEnrollment && !hasGradeMismatch;
      const eligibilityReason = isCompleted
        ? 'Student has completed/graduated'
        : hasActiveSectionEnrollment
          ? `Already in section ${membership?.sectionName ?? 'another section'}`
          : hasGradeMismatch
            ? `Grade mismatch (${candidate.gradeLevel ?? 'N/A'} vs ${section.gradeLevel})`
            : null;

      return {
        ...candidate,
        isCompleted,
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

  @AcademicMutation()
  async addStudentsToSection(
    sectionId: string,
    dto: BulkStudentsDto,
    requestingUser?: RequestingUser,
  ) {
    const section = await this.findById(sectionId, requestingUser);
    const state = await this.policyService.currentState();
    if (!section.isActive || section.schoolYear !== state.schoolYear)
      throw new ConflictException(
        'Student membership can be changed only in the active school year',
      );

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
          graduatedAt: studentProfiles.graduatedAt,
        })
        .from(studentProfiles)
        .where(inArray(studentProfiles.userId, dto.studentIds));

      const profileByStudentId = new Map(
        profileRows.map((row) => [row.userId, row]),
      );
      const graduatedIds = dto.studentIds.filter((id) =>
        Boolean(profileByStudentId.get(id)?.graduatedAt),
      );
      if (graduatedIds.length > 0) {
        throw new BadRequestException(
          `Graduated students cannot be added to a section: ${graduatedIds.join(', ')}`,
        );
      }
      const mismatchedIds = dto.studentIds.filter(
        (id) => profileByStudentId.get(id)?.gradeLevel !== section.gradeLevel,
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

  @AcademicMutation()
  async removeStudentFromSection(
    sectionId: string,
    studentId: string,
    requestingUser?: RequestingUser,
  ) {
    const section = await this.findById(sectionId, requestingUser);
    const state = await this.policyService.currentState();
    if (!section.isActive || section.schoolYear !== state.schoolYear)
      throw new ConflictException(
        'Student membership can be changed only in the active school year',
      );

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

  @AcademicMutation()
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

  @AcademicMutation()
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
      updateSectionDto.isActive !== undefined &&
      updateSectionDto.isActive !== existingSection.isActive
    )
      throw new ConflictException(
        'Use the section archive action; active membership cannot be changed through section metadata',
      );
    const identityChanged =
      (updateSectionDto.gradeLevel !== undefined &&
        updateSectionDto.gradeLevel !== existingSection.gradeLevel) ||
      (updateSectionDto.schoolYear !== undefined &&
        updateSectionDto.schoolYear !== existingSection.schoolYear);
    if (identityChanged) {
      const linkedClass = await this.db.query.classes.findFirst({
        where: eq(classes.sectionId, id),
        columns: { id: true },
      });
      const linkedEnrollment = await this.db.query.enrollments.findFirst({
        where: eq(enrollments.sectionId, id),
        columns: { id: true },
      });
      if (linkedClass || linkedEnrollment)
        throw new ConflictException(
          'Section year or grade level cannot change after classes or student membership exist',
        );
    }

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
    presentation: { cardPreset?: string | null; cardBannerUrl?: string | null },
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

    const payload: {
      cardPreset?: string;
      cardBannerUrl?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };
    if (
      presentation.cardPreset !== undefined &&
      presentation.cardPreset !== null
    ) {
      payload.cardPreset = presentation.cardPreset;
    }
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

  @AcademicMutation()
  async archiveSection(
    id: string,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const section = await this.findById(id);
    const activeMembership = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.sectionId, id),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });
    if (activeMembership)
      throw new ConflictException(
        'A section with active students must use academic transition or explicit student withdrawal before archival',
      );
    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx
        .update(enrollments)
        .set({ status: 'completed' })
        .where(
          and(
            eq(enrollments.sectionId, id),
            eq(enrollments.status, 'enrolled'),
          ),
        );

      await tx
        .update(classes)
        .set({ isActive: false, updatedAt: now })
        .where(eq(classes.sectionId, id));

      await tx
        .update(sections)
        .set({
          isActive: false,
          isArchived: true,
          archivedAt: now,
          updatedAt: now,
        })
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
        preservedAdviserId: section.adviserId,
        completedEnrollmentStatus: 'completed',
        linkedClassTeacherStatus: 'preserved_for_history',
      },
    });
  }

  async restoreSection(
    id: string,
    _actorId?: string,
    _actorRoles: string[] = [],
  ) {
    await this.findById(id);
    throw new ConflictException(
      'Archived sections cannot be restored. Purge the archived section instead.',
    );
  }

  @AcademicMutation()
  async deleteSection(id: string, actorId?: string, actorRoles: string[] = []) {
    await this.archiveSection(id, actorId, actorRoles);
  }

  @AcademicMutation()
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
        throw new ConflictException(
          'Archived sections cannot be restored. Purge the archived section instead.',
        );
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

  @AcademicMutation()
  async permanentlyDeleteSection(
    id: string,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    // Verify section exists first
    const section = await this.findById(id);

    const linkedClass = await this.db.query.classes.findFirst({
      where: eq(classes.sectionId, id),
      columns: { id: true },
    });
    if (linkedClass)
      throw new ConflictException(
        'Remove empty linked classes individually; sections containing academic class history cannot be purged',
      );

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

  private mapStudentAcademicReadiness(
    result: Awaited<
      ReturnType<AcademicTransitionReadinessService['getReadiness']>
    >,
    sectionId: string,
    studentIds: string[],
  ) {
    const classRows = result.classReadiness.filter(
      (c) => c.sectionId === sectionId,
    );
    const requiredClassRecordCount = classRows.reduce(
      (sum, c) => sum + c.expectedPeriodRecords,
      0,
    );
    const finalizedClassRecordCount = classRows.reduce(
      (sum, c) => sum + c.finalizedPeriodRecords,
      0,
    );
    const outcomes = new Map(
      result.studentOutcomes.map((o) => [o.studentId, o]),
    );
    return new Map<string, AccessStudentPromotionReadiness>(
      [...new Set(studentIds)].map((studentId) => {
        const blockers = result.blockers.filter((b) =>
          b.studentId
            ? b.studentId === studentId
            : !b.sectionId || b.sectionId === sectionId,
        );
        const outcome =
          outcomes.get(studentId)?.outcome ??
          (blockers.some((b) => b.code === 'pending_remediation')
            ? 'pending_remediation'
            : 'incomplete');
        const isFinalized = blockers.length === 0 && outcomes.has(studentId);
        const isPassing =
          isFinalized && ['promoted', 'graduated'].includes(outcome);
        const isFailing = isFinalized && outcome === 'retained';
        return [
          studentId,
          {
            studentId,
            finalGrade: null,
            gradeStatus: isPassing
              ? 'passing'
              : isFailing
                ? 'failing'
                : 'pending',
            isFinalized,
            isPassing,
            isFailing,
            requiredClassRecordCount,
            finalizedClassRecordCount,
            finalGradeRecordCount: isFinalized ? requiredClassRecordCount : 0,
            missingFinalGradeCount: blockers.filter((b) =>
              b.code.includes('missing'),
            ).length,
            finalizationLabel: blockers.length
              ? blockers[0].message
              : outcome.replaceAll('_', ' '),
            outcome,
            blockers,
            outcomeManagedByTransition: true,
          },
        ];
      }),
    );
  }

  private async getSectionStudentPromotionReadiness(
    sectionId: string,
    studentIds: string[],
  ) {
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });
    if (!section) throw new NotFoundException('Section not found');
    return this.mapStudentAcademicReadiness(
      await this.readinessService.getReadiness(section.schoolYear, [sectionId]),
      sectionId,
      studentIds,
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

    const classRecordCountBySectionId = new Map<
      string,
      { totalRecords: number; finalizedRecords: number }
    >();
    const readinessBySection = new Map<
      string,
      Map<string, AccessStudentPromotionReadiness>
    >();
    for (const year of new Set(
      sectionList.map((section) => section.schoolYear),
    )) {
      const yearSections = sectionList.filter(
        (section) => section.schoolYear === year,
      );
      const result = await this.readinessService.getReadiness(
        year,
        yearSections.map((section) => section.id),
      );
      for (const section of yearSections) {
        const classRows = result.classReadiness.filter(
          (c) => c.sectionId === section.id,
        );
        classRecordCountBySectionId.set(section.id, {
          totalRecords: classRows.reduce(
            (sum, c) => sum + c.expectedPeriodRecords,
            0,
          ),
          finalizedRecords: classRows.reduce(
            (sum, c) => sum + c.finalizedPeriodRecords,
            0,
          ),
        });
        readinessBySection.set(
          section.id,
          this.mapStudentAcademicReadiness(
            result,
            section.id,
            rosterRows
              .filter((r) => r.sectionId === section.id)
              .map((r) => r.studentId),
          ),
        );
      }
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
        outcome: AcademicOutcome;
        blockers: TransitionBlocker[];
        outcomeManagedByTransition: true;
      }>
    >();

    for (const row of rosterRows) {
      const rosterKey = `${row.sectionId}:${row.studentId}`;
      if (seenRosterKeys.has(rosterKey)) continue;
      seenRosterKeys.add(rosterKey);

      const readiness = readinessBySection
        .get(row.sectionId)
        ?.get(row.studentId);
      if (!readiness) continue;
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
        outcome: readiness.outcome,
        blockers: readiness.blockers,
        outcomeManagedByTransition: true,
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
          outcome: AcademicOutcome;
          blockers: TransitionBlocker[];
          outcomeManagedByTransition: true;
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

  @AcademicMutation()
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
      .where(
        and(eq(classes.sectionId, section.id), eq(classes.isActive, true)),
      );

    if (recordRows.length === 0) {
      throw new BadRequestException(
        'This section has no class records to finalize yet.',
      );
    }

    const draftRecords = recordRows.filter(
      (record) => record.status === 'draft',
    );
    const finalizedRecords: Array<{
      classRecordId: string;
      subjectName: string;
    }> = [];

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

  private requireAcademicTransition(): never {
    throw new ConflictException({
      code: 'academic_transition_required',
      message:
        'Promotion, retention, and JHS completion are recorded by the verified school-year transition. Review annual results and SRC evidence in Academic Settings, complete the transition, then assign next-year sections.',
      destination: '/dashboard/admin/system-settings',
    });
  }

  async moveUpStudents(
    _dto: {
      fromSectionId: string;
      targetSectionId: string;
      studentIds: string[];
      allowFailingPromotion?: boolean;
    },
    _actorId?: string,
    _actorRoles: string[] = [],
  ): Promise<never> {
    return this.requireAcademicTransition();
  }
  async failStudents(
    _dto: {
      fromSectionId: string;
      targetSectionId: string;
      studentIds: string[];
    },
    _actorId?: string,
    _actorRoles: string[] = [],
  ): Promise<never> {
    return this.requireAcademicTransition();
  }
  async graduateStudents(
    _dto: { fromSectionId: string; studentIds: string[] },
    _actorId?: string,
    _actorRoles: string[] = [],
  ): Promise<never> {
    return this.requireAcademicTransition();
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

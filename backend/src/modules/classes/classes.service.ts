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
  desc,
  eq,
  ilike,
  isNull,
  ne,
  inArray,
  notInArray,
  or,
  sql,
  SQL,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessments,
  classSchedules,
  classes,
  sections,
  users,
  userRoles,
  roles,
  enrollments,
  studentProfiles,
  lessons,
} from '../../drizzle/schema';
import { normalizeGradeLevel } from '../../common/utils/grade-level.util';
import {
  toCalendarSlot,
  timeToMinutes,
} from '../../common/utils/schedule.util';
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';
import { ScheduleSlotDto } from './DTO/schedule-slot.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClassesService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private ensureTeacherCanAccessClass(
    classRecord: { teacherId: string },
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    if (
      requesterId &&
      requesterRoles &&
      !requesterRoles.includes('admin') &&
      requesterId !== classRecord.teacherId
    ) {
      throw new ForbiddenException('You can only access your own classes');
    }
  }

  /**
   * Find all classes with optional filters
   */
  async findAll(filters?: {
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    subjectGradeLevel?: '7' | '8' | '9' | '10';
    sectionId?: string;
    teacherId?: string;
    schoolYear?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap max limit
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    // Support filtering by subject code or subject name
    if (filters?.subjectCode) {
      whereConditions.push(eq(classes.subjectCode, filters.subjectCode));
    }
    if (filters?.subjectName) {
      whereConditions.push(
        ilike(classes.subjectName, `%${filters.subjectName}%`),
      );
    }

    if (filters?.sectionId) {
      whereConditions.push(eq(classes.sectionId, filters.sectionId));
    }

    if (filters?.teacherId) {
      whereConditions.push(eq(classes.teacherId, filters.teacherId));
    }

    if (filters?.schoolYear) {
      whereConditions.push(eq(classes.schoolYear, filters.schoolYear));
    }

    if (filters?.isActive !== undefined) {
      whereConditions.push(eq(classes.isActive, filters.isActive));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(classes.subjectName, searchPattern),
        ilike(classes.subjectCode, searchPattern),
        ilike(classes.room, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(classes)
      .where(whereClause);

    const classList = await this.db.query.classes.findMany({
      where: whereClause,
      with: {
        section: true,
        schedules: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [
        asc(classes.schoolYear),
        asc(classes.createdAt),
      ],
      limit,
      offset,
    });

    return {
      data: classList.map((c) => ({
        ...c,
        schedules: (c.schedules ?? []).map(toCalendarSlot),
      })),
      total: Number(totalRow?.total ?? 0),
      page,
      limit,
    };
  }

  /**
   * Find a class by ID
   */
  async findById(id: string) {
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, id),
      with: {
        section: true,
        schedules: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    return {
      ...classRecord,
      schedules: (classRecord.schedules ?? []).map(toCalendarSlot),
    };
  }

  /**
   * Create a new class
   */
  async create(createClassDto: CreateClassDto) {
    // Section check
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, createClassDto.sectionId),
    });

    if (!section) {
      throw new BadRequestException(
        `Section with ID "${createClassDto.sectionId}" not found`,
      );
    }

    // Verify the teacher exists and has the teacher (or admin) role
    const teacher = await this.db.query.users.findFirst({
      where: eq(users.id, createClassDto.teacherId),
      with: {
        userRoles: {
          with: { role: { columns: { name: true } } },
        },
      },
      columns: { id: true, firstName: true, lastName: true },
    });

    if (!teacher) {
      throw new BadRequestException(
        `Teacher with ID "${createClassDto.teacherId}" not found`,
      );
    }

    const teacherRoleNames =
      (teacher as any).userRoles?.map((ur: any) => ur.role?.name) ?? [];
    if (
      !teacherRoleNames.includes('teacher') &&
      !teacherRoleNames.includes('admin')
    ) {
      throw new BadRequestException(
        `The specified user does not have a teacher role`,
      );
    }

    // Check if class already exists (same subject, section, and school year)
    const existingClass = await this.db.query.classes.findFirst({
      where: and(
        eq(classes.subjectCode, createClassDto.subjectCode),
        eq(classes.sectionId, createClassDto.sectionId),
        eq(classes.schoolYear, createClassDto.schoolYear),
      ),
    });

    if (existingClass) {
      throw new ConflictException(
        `Class already exists for this subject, section, and school year`,
      );
    }

    // Build a typed payload for insertion
    const insertPayload: any = {
      subjectName: createClassDto.subjectName,
      subjectCode: createClassDto.subjectCode?.toUpperCase(),
      subjectGradeLevel: normalizeGradeLevel(createClassDto.subjectGradeLevel),
      sectionId: createClassDto.sectionId,
      teacherId: createClassDto.teacherId,
      schoolYear: createClassDto.schoolYear,
      room: createClassDto.room,
      cardPreset: createClassDto.cardPreset ?? 'aurora',
      cardBannerUrl: createClassDto.cardBannerUrl ?? null,
    };

    const [newClass] = await this.db
      .insert(classes)
      .values(insertPayload)
      .returning();

    // Insert schedule slots (run collision check first)
    if (createClassDto.schedules?.length) {
      await this.checkCollisions({
        classId: newClass.id,
        sectionId: createClassDto.sectionId,
        teacherId: createClassDto.teacherId,
        room: createClassDto.room,
        slots: createClassDto.schedules,
      });

      await this.db.insert(classSchedules).values(
        createClassDto.schedules.map((slot) => ({
          classId: newClass.id,
          days: slot.days,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      );
    }

    return this.findById(newClass.id);
  }

  /**
   * Update a class
   */
  async update(id: string, updateClassDto: UpdateClassDto) {
    // Verify class exists
    const existing = await this.findById(id);

    // If updating subject fields, no external lookup required (denormalized fields)
    // We accept subjectName/subjectCode/subjectGradeLevel directly in the DTO.

    // If updating section, verify it exists
    if (updateClassDto.sectionId) {
      const section = await this.db.query.sections.findFirst({
        where: eq(sections.id, updateClassDto.sectionId),
      });

      if (!section) {
        throw new BadRequestException(
          `Section with ID "${updateClassDto.sectionId}" not found`,
        );
      }
    }

    // If updating teacher, verify teacher exists
    if (updateClassDto.teacherId) {
      const teacher = await this.db.query.users.findFirst({
        where: eq(users.id, updateClassDto.teacherId),
      });

      if (!teacher) {
        throw new BadRequestException(
          `Teacher with ID "${updateClassDto.teacherId}" not found`,
        );
      }
    }

    // Separate schedule slots from column-level fields
    const { schedules, ...classFields } = updateClassDto;

    const updatePayload: any = {
      ...classFields,
      updatedAt: new Date(),
    };

    if (updatePayload.subjectGradeLevel) {
      updatePayload.subjectGradeLevel = normalizeGradeLevel(
        String(updatePayload.subjectGradeLevel),
      );
    }

    // Ensure subjectCode is always stored uppercase (mirrors create() behaviour)
    if (updatePayload.subjectCode) {
      updatePayload.subjectCode = updatePayload.subjectCode.toUpperCase();
    }

    await this.db.update(classes).set(updatePayload).where(eq(classes.id, id));

    // Full-replacement of schedule slots when provided (even empty array clears all)
    if (schedules !== undefined) {
      const effectiveSectionId = updateClassDto.sectionId ?? existing.sectionId;
      const effectiveTeacherId = updateClassDto.teacherId ?? existing.teacherId;
      const effectiveRoom = updateClassDto.room ?? existing.room;

      if (schedules.length > 0) {
        await this.checkCollisions({
          classId: id,
          sectionId: effectiveSectionId,
          teacherId: effectiveTeacherId,
          room: effectiveRoom,
          slots: schedules,
          excludeClassId: id,
        });
      }

      // Delete current slots then re-insert
      await this.db
        .delete(classSchedules)
        .where(eq(classSchedules.classId, id));

      if (schedules.length > 0) {
        await this.db.insert(classSchedules).values(
          schedules.map((slot) => ({
            classId: id,
            days: slot.days,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        );
      }
    }

    return this.findById(id);
  }

  async updatePresentation(
    id: string,
    presentation: { cardPreset?: string; cardBannerUrl?: string | null },
    requesterId: string,
    requesterRoles: string[],
  ) {
    const existing = await this.findById(id);
    this.ensureTeacherCanAccessClass(existing, requesterId, requesterRoles);

    const payload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (presentation.cardPreset !== undefined) {
      payload.cardPreset = presentation.cardPreset;
    }

    if (presentation.cardBannerUrl !== undefined) {
      payload.cardBannerUrl = presentation.cardBannerUrl;
    }

    await this.db.update(classes).set(payload).where(eq(classes.id, id));

    return this.findById(id);
  }

  /**
   * Delete a class.
   * Blocked when active enrollments OR lessons are attached to prevent data loss.
   */
  async delete(id: string) {
    // Verify class exists
    const classRecord = await this.findById(id);

    const activeEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, id),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });
    if (activeEnrollments.length > 0) {
      throw new ConflictException(
        `Cannot delete a class with ${activeEnrollments.length} active enrollment(s). Unenroll all students first.`,
      );
    }

    const classLessons = await this.db.query.lessons.findMany({
      where: eq(lessons.classId, id),
      columns: { id: true },
    });
    if (classLessons.length > 0) {
      throw new ConflictException(
        `Cannot delete a class with ${classLessons.length} lesson(s). Remove all lessons first.`,
      );
    }

    const classAssessments = await this.db.query.assessments.findMany({
      where: eq(assessments.classId, id),
      columns: { id: true },
    });
    if (classAssessments.length > 0) {
      throw new ConflictException(
        `Cannot delete a class with ${classAssessments.length} assessment(s). Remove all assessments first.`,
      );
    }

    await this.db.delete(classes).where(eq(classes.id, id));

    return classRecord;
  }

  /**
   * Permanently purge an archived class and all related cascade data.
   * This intentionally bypasses delete blockers used by the regular delete flow.
   */
  async purge(id: string) {
    const classRecord = await this.findById(id);

    if (classRecord.isActive) {
      throw new ConflictException(
        'Only archived classes can be permanently deleted. Archive the class first.',
      );
    }

    await this.db.delete(classes).where(eq(classes.id, id));

    return classRecord;
  }

  /**
   * Get classes by teacher ID
   * Ownership enforced: a teacher may only view their own classes unless they are an admin.
   */
  async getClassesByTeacher(
    teacherId: string,
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    if (
      requesterId &&
      requesterRoles &&
      !requesterRoles.includes('admin') &&
      requesterId !== teacherId
    ) {
      throw new ForbiddenException('You can only view your own classes');
    }

    const classList = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      with: {
        section: true,
        schedules: true,
        enrollments: {
          columns: {
            id: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList.map((c) => ({
      ...c,
      schedules: (c.schedules ?? []).map(toCalendarSlot),
    }));
  }

  /**
   * Get classes by section ID
   */
  async getClassesBySection(sectionId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.sectionId, sectionId),
      with: {
        schedules: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList.map((c) => ({
      ...c,
      schedules: (c.schedules ?? []).map(toCalendarSlot),
    }));
  }

  /**
   * Get classes by subject ID
   */
  async getClassesBySubject(subjectId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.subjectCode, subjectId),
      with: {
        section: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList;
  }

  /**
   * Get all classes enrolled by a student
   * Ownership enforced: a student may only view their own enrolled classes.
   */
  async getClassesByStudent(
    studentId: string,
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    if (
      requesterId &&
      requesterRoles &&
      requesterRoles.includes('student') &&
      requesterId !== studentId
    ) {
      throw new ForbiddenException(
        'You can only view your own enrolled classes',
      );
    }

    // First, get all enrollments for this student
    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
      columns: { classId: true },
    });

    if (studentEnrollments.length === 0) {
      return [];
    }

    // Extract unique class IDs
    const classIds = [
      ...new Set(
        studentEnrollments
          .map((e) => e.classId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    // Fetch all classes with those IDs, including enrollments and student count
    const classList = await this.db.query.classes.findMany({
      where: (classTable) => inArray(classTable.id, classIds),
      with: {
        section: true,
        schedules: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        enrollments: {
          columns: {
            id: true,
            studentId: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList.map((c) => ({
      ...c,
      schedules: (c.schedules ?? []).map(toCalendarSlot),
    }));
  }

  /**
   * Toggle class active status
   */
  async toggleActive(id: string) {
    const classRecord = await this.findById(id);

    await this.db
      .update(classes)
      .set({
        isActive: !classRecord.isActive,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, id));

    return this.findById(id);
  }

  /**
   * Get all students enrolled in a class
   */
  async getEnrollments(classId: string) {
    // First verify the class exists
    await this.findById(classId);

    // Get all enrollments for this class with student details
    const classEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                gradeLevel: true,
                lrn: true,
                profilePicture: true,
              },
            },
          },
        },
      },
      orderBy: (enrollments, { asc }) => [asc(enrollments.enrolledAt)],
    });

    return classEnrollments;
  }

  async getStudentProfileForClass(
    classId: string,
    studentId: string,
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    const classRecord = await this.findById(classId);
    this.ensureTeacherCanAccessClass(classRecord, requesterId, requesterRoles);

    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Student is not enrolled in this class');
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

    const sectionRecord = await this.db.query.sections.findFirst({
      where: eq(sections.id, classRecord.sectionId),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
        roomNumber: true,
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
    });

    return {
      classInfo: {
        id: classRecord.id,
        subjectName: classRecord.subjectName,
        subjectCode: classRecord.subjectCode,
      },
      student: {
        ...student,
        profile: student.profile ?? null,
      },
      section: sectionRecord
        ? {
            ...sectionRecord,
            adviser: sectionRecord.adviser ?? null,
          }
        : null,
    };
  }

  async getStudentsMasterlistForClass(
    classId: string,
    requesterId?: string,
    requesterRoles?: string[],
    filters?: {
      gradeLevel?: string;
      sectionId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const classRecord = await this.findById(classId);
    this.ensureTeacherCanAccessClass(classRecord, requesterId, requesterRoles);

    const classGradeLevel = classRecord.section?.gradeLevel;
    const effectiveGradeLevel =
      (filters?.gradeLevel as '7' | '8' | '9' | '10' | undefined) ??
      classGradeLevel;
    const page = Math.max(1, Number(filters?.page ?? 1) || 1);
    const limit = Math.max(
      1,
      Math.min(Number(filters?.limit ?? 20) || 20, 100),
    );
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    const studentRoleSubquery = this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, 'student'));

    whereConditions.push(inArray(users.id, studentRoleSubquery));
    whereConditions.push(ne(users.status, 'DELETED'));

    if (effectiveGradeLevel) {
      whereConditions.push(
        eq(studentProfiles.gradeLevel, effectiveGradeLevel as any),
      );
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern),
        ilike(users.email, searchPattern),
        ilike(studentProfiles.lrn, searchPattern),
      );
      if (searchCondition) whereConditions.push(searchCondition);
    }

    if (filters?.sectionId) {
      const sectionStudentSubquery = this.db
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, filters.sectionId),
            eq(enrollments.status, 'enrolled'),
          ),
        );
      whereConditions.push(inArray(users.id, sectionStudentSubquery));
    }

    const whereClause = and(...whereConditions);

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(users)
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(whereClause);

    const students = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        middleName: users.middleName,
        lastName: users.lastName,
        email: users.email,
        status: users.status,
        profilePicture: studentProfiles.profilePicture,
        lrn: studentProfiles.lrn,
        gradeLevel: studentProfiles.gradeLevel,
      })
      .from(users)
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(whereClause)
      .orderBy(users.lastName, users.firstName)
      .limit(limit)
      .offset(offset);

    const studentIds = students.map((student) => student.id);

    const enrolledRows =
      studentIds.length > 0
        ? await this.db.query.enrollments.findMany({
            where: and(
              inArray(enrollments.studentId, studentIds),
              eq(enrollments.status, 'enrolled'),
            ),
            columns: {
              studentId: true,
              sectionId: true,
              classId: true,
              enrolledAt: true,
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
            orderBy: [desc(enrollments.enrolledAt)],
          })
        : [];

    const classEnrollments =
      studentIds.length > 0
        ? await this.db.query.enrollments.findMany({
            where: and(
              eq(enrollments.classId, classId),
              inArray(enrollments.studentId, studentIds),
              eq(enrollments.status, 'enrolled'),
            ),
            columns: {
              studentId: true,
            },
          })
        : [];

    const alreadyEnrolledIds = new Set(
      classEnrollments.map((e) => e.studentId),
    );

    const studentSectionMap = new Map<
      string,
      {
        id: string;
        name: string;
        gradeLevel: string;
        schoolYear: string;
      } | null
    >();

    for (const row of enrolledRows) {
      if (!row.sectionId || !row.section) continue;
      if (studentSectionMap.has(row.studentId)) continue;

      studentSectionMap.set(row.studentId, {
        id: row.section.id,
        name: row.section.name,
        gradeLevel: row.section.gradeLevel,
        schoolYear: row.section.schoolYear,
      });
    }

    const data = students.map((student) => {
      const studentSection = studentSectionMap.get(student.id) ?? null;
      const hasGradeMismatch =
        !!classGradeLevel && student.gradeLevel !== classGradeLevel;
      const hasSectionMismatch =
        !!studentSection && studentSection.id !== classRecord.sectionId;
      const isAlreadyEnrolled = alreadyEnrolledIds.has(student.id);

      let disabledReason: string | null = null;

      if (isAlreadyEnrolled) {
        disabledReason = 'Already enrolled in this class';
      } else if (hasGradeMismatch) {
        disabledReason = `Different grade level (Class grade ${classGradeLevel})`;
      } else if (!studentSection) {
        disabledReason = 'No section assignment';
      } else if (hasSectionMismatch) {
        disabledReason = `Different section (${studentSection.name})`;
      }

      return {
        ...student,
        section: studentSection,
        isEligible: !disabledReason,
        disabledReason,
      };
    });

    return {
      classContext: {
        classId: classRecord.id,
        sectionId: classRecord.sectionId,
        classGradeLevel,
      },
      data,
      total: Number(totalRow?.total ?? 0),
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(Number(totalRow?.total ?? 0) / limit)),
    };
  }

  /**
   * Get candidate students for enrollment in a class
   * Returns students from the same section who are not yet enrolled in this class
   */
  async getCandidates(classId: string) {
    // Get the class to find its section
    const classRecord = await this.findById(classId);

    // IDs of students already enrolled in this specific class
    const classEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { studentId: true },
    });
    const enrolledStudentIds = classEnrollments.map((e) => e.studentId);

    // Single query: section students with classId=NULL not yet in this class
    const candidateWhere =
      enrolledStudentIds.length > 0
        ? and(
            eq(enrollments.sectionId, classRecord.sectionId),
            isNull(enrollments.classId),
            eq(enrollments.status, 'enrolled'),
            notInArray(enrollments.studentId, enrolledStudentIds),
          )
        : and(
            eq(enrollments.sectionId, classRecord.sectionId),
            isNull(enrollments.classId),
            eq(enrollments.status, 'enrolled'),
          );

    const candidates = await this.db.query.enrollments.findMany({
      where: candidateWhere,
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
    });

    return candidates;
  }

  /**
   * Enroll a student in a class.
   * All reads and the final write are wrapped in a single database transaction
   * to prevent duplicate enrollments under concurrent requests.
   */
  async enrollStudent(classId: string, studentId: string, actorId: string) {
    // Pre-flight checks outside the transaction (cheap, read-only)
    const classRecord = await this.findById(classId);

    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
    });
    if (!student) {
      throw new BadRequestException(`Student with ID "${studentId}" not found`);
    }

    // Run the duplicate-check + write atomically
    const enrollmentId = await this.db.transaction(async (tx) => {
      // Re-check inside the transaction to close the TOCTOU race window
      const existingEnrollment = await tx.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.classId, classId),
        ),
      });
      if (existingEnrollment) {
        throw new ConflictException(
          `Student is already enrolled in this class`,
        );
      }

      const sectionEnrollment = await tx.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.sectionId, classRecord.sectionId),
        ),
      });
      if (!sectionEnrollment) {
        throw new BadRequestException(
          `Student is not enrolled in the section for this class`,
        );
      }

      if (sectionEnrollment.classId === null) {
        // Promote the section-only row to a full class enrollment
        await tx
          .update(enrollments)
          .set({ classId, enrolledAt: new Date() })
          .where(eq(enrollments.id, sectionEnrollment.id));
        return sectionEnrollment.id;
      } else {
        // Student already has another class; create a new enrollment row
        const [newEnrollment] = await tx
          .insert(enrollments)
          .values({
            studentId,
            classId,
            sectionId: classRecord.sectionId,
            status: 'enrolled',
          })
          .returning();
        return newEnrollment.id;
      }
    });

    // Read the fully populated enrollment after the transaction is committed
    const enrollment = await this.getEnrollmentById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(
        `Enrollment "${enrollmentId}" not found after creation`,
      );
    }
    await this.auditService.log({
      actorId,
      action: 'class.enrollment.added',
      targetType: 'class_enrollment',
      targetId: enrollment.id,
      metadata: {
        classId,
        studentId,
      },
    });

    return enrollment;
  }

  /**
   * Remove a student from a class.
   *
   * Critical safety rule: the first enrollment row a student gets in a section
   * starts as classId=NULL and is *promoted* (not duplicated) when they are
   * added to a class.  Deleting that row would silently remove the student from
   * the section entirely.  Instead:
   *   – If a separate section-only (classId=NULL) row already exists → this  is
   *     an additional class-enrollment row; delete it.
   *   – Otherwise → this IS the (promoted) section row; revert classId to NULL.
   */
  async removeStudent(classId: string, studentId: string, actorId: string) {
    const classRecord = await this.findById(classId);

    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
      ),
    });

    if (!enrollment) {
      throw new NotFoundException(`Student is not enrolled in this class`);
    }

    // Determine whether a separate section-only row already exists
    const existingSectionRow = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.sectionId, classRecord.sectionId),
        isNull(enrollments.classId),
      ),
    });

    if (existingSectionRow) {
      // Additional class-enrollment row — safe to delete
      await this.db
        .delete(enrollments)
        .where(eq(enrollments.id, enrollment.id));
    } else {
      // Promoted section row — revert to section-only instead of deleting
      await this.db
        .update(enrollments)
        .set({ classId: null })
        .where(eq(enrollments.id, enrollment.id));
    }

    await this.auditService.log({
      actorId,
      action: 'class.enrollment.removed',
      targetType: 'class_enrollment',
      targetId: enrollment.id,
      metadata: {
        classId,
        studentId,
      },
    });

    return { id: enrollment.id };
  }

  /**
   * Check for schedule collisions across section, teacher, and room.
   * Throws ConflictException with full conflict detail if any overlap is found.
   *
   * Collision rules:
   *  - A section cannot have two classes on the same day at the same time
   *  - A teacher cannot be in two places at the same time
   *  - A room cannot host two classes at the same time
   */
  private async checkCollisions(params: {
    classId: string;
    sectionId: string;
    teacherId: string;
    room?: string | null;
    slots: ScheduleSlotDto[];
    excludeClassId?: string;
  }): Promise<void> {
    const { sectionId, teacherId, room, slots, excludeClassId } = params;
    const conflicts: any[] = [];

    for (const slot of slots) {
      // Validate end > start
      if (timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime)) {
        throw new BadRequestException(
          `endTime "${slot.endTime}" must be after startTime "${slot.startTime}" for days ${slot.days.join(',')}`,
        );
      }

      // Build a proper ARRAY[...]::text[] expression for the days overlap check.
      // Drizzle cannot cast a bound parameter with ::text[], so we construct
      // the array literal explicitly using sql.join.
      const daysArray = sql`ARRAY[${sql.join(
        slot.days.map((d) => sql`${d}`),
        sql`, `,
      )}]::text[]`;

      const conditions: SQL[] = [
        // Day overlap: stored days array has at least one day in common with incoming days
        sql`${classSchedules.days} && ${daysArray}`,
        // Time overlap: existing.start < new.end AND existing.end > new.start
        sql`${classSchedules.startTime} < ${slot.endTime}`,
        sql`${classSchedules.endTime} > ${slot.startTime}`,
      ];

      if (excludeClassId) {
        conditions.push(ne(classSchedules.classId, excludeClassId));
      }

      const scopeParts: SQL[] = [
        eq(classes.sectionId, sectionId),
        eq(classes.teacherId, teacherId),
      ];
      if (room) {
        scopeParts.push(
          and(sql`${classes.room} IS NOT NULL`, eq(classes.room, room)) as SQL,
        );
      }

      const conflictRows = await this.db
        .select({
          slotId: classSchedules.id,
          classId: classSchedules.classId,
          days: classSchedules.days,
          startTime: classSchedules.startTime,
          endTime: classSchedules.endTime,
          subjectName: classes.subjectName,
          classSectionId: classes.sectionId,
          classTeacherId: classes.teacherId,
          classRoom: classes.room,
        })
        .from(classSchedules)
        .innerJoin(classes, eq(classes.id, classSchedules.classId))
        .where(and(...conditions, or(...scopeParts)));

      for (const row of conflictRows) {
        const conflictTypes: string[] = [];
        if (row.classSectionId === sectionId) conflictTypes.push('section');
        if (row.classTeacherId === teacherId) conflictTypes.push('teacher');
        if (room && row.classRoom === room) conflictTypes.push('room');

        conflicts.push({
          conflictType: conflictTypes,
          classId: row.classId,
          subjectName: row.subjectName,
          days: row.days,
          startTime: row.startTime,
          endTime: row.endTime,
        });
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Schedule conflicts detected',
        conflicts,
      });
    }
  }

  /**
   * Get enrollment by ID
   */
  private async getEnrollmentById(enrollmentId: string) {
    const enrollment = await this.db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollmentId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    return enrollment;
  }
}

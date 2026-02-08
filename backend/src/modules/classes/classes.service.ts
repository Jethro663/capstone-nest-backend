import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL, isNull, ne, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { classes, sections, users, enrollments, studentProfiles } from '../../drizzle/schema';

// Normalize grade level into typed union or undefined
const normalizeGradeLevel = (v?: string): '7' | '8' | '9' | '10' | undefined => {
  if (!v) return undefined;
  const s = String(v).trim();
  return s === '7' || s === '8' || s === '9' || s === '10' ? (s as '7' | '8' | '9' | '10') : undefined;
};
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Find all classes with optional filters
   */
  async findAll(filters?: {
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    subjectGradeLevel?: '7'|'8'|'9'|'10';
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
      whereConditions.push(ilike(classes.subjectName, `%${filters.subjectName}%`));
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
        ilike(classes.room, searchPattern),
        ilike(classes.schedule, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const classList = await this.db.query.classes.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
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
      orderBy: (classes, { asc }) => [
        asc(classes.schoolYear),
        asc(classes.createdAt),
      ],
      limit,
      offset,
    });

    return classList;
  }

  /**
   * Find a class by ID
   */
  async findById(id: string) {
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, id),
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
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    return classRecord;
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

    // Verify that teacher exists
    const teacher = await this.db.query.users.findFirst({
      where: eq(users.id, createClassDto.teacherId),
    });

    if (!teacher) {
      throw new BadRequestException(
        `Teacher with ID "${createClassDto.teacherId}" not found`,
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
      schedule: (createClassDto as any).schedule,
      room: createClassDto.room,
    };

    const [newClass] = await this.db
      .insert(classes)
      .values(insertPayload)
      .returning();

    return this.findById(newClass.id);
  }

  /**
   * Update a class
   */
  async update(id: string, updateClassDto: UpdateClassDto) {
    // Verify class exists
    await this.findById(id);

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

    const updatePayload: any = {
      ...updateClassDto,
      updatedAt: new Date(),
    };

    if (updatePayload.subjectGradeLevel) {
      updatePayload.subjectGradeLevel = normalizeGradeLevel(String(updatePayload.subjectGradeLevel));
    }

    await this.db
      .update(classes)
      .set(updatePayload)
      .where(eq(classes.id, id));

    return this.findById(id);
  }

  /**
   * Delete a class
   */
  async delete(id: string) {
    // Verify class exists
    const classRecord = await this.findById(id);

    await this.db.delete(classes).where(eq(classes.id, id));

    return classRecord;
  }

  /**
   * Get classes by teacher ID
   */
  async getClassesByTeacher(teacherId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      with: {
        section: true,
        enrollments: {
          columns: {
            id: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList;
  }

  /**
   * Get classes by section ID
   */
  async getClassesBySection(sectionId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.sectionId, sectionId),
      with: {
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
   */
  async getClassesByStudent(studentId: string) {
    // First, get all enrollments for this student
    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
      columns: { classId: true },
    });

    if (studentEnrollments.length === 0) {
      return [];
    }

    // Extract unique class IDs
    const classIds = [...new Set(studentEnrollments.map(e => e.classId).filter((id): id is string => Boolean(id)))];

    // Fetch all classes with those IDs, including enrollments and student count
    const classList = await this.db.query.classes.findMany({
      where: (classTable) => inArray(classTable.id, classIds),
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
        enrollments: {
          columns: {
            id: true,
            studentId: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList;
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
              },
            },
          },
        },
      },
      orderBy: (enrollments, { asc }) => [asc(enrollments.enrolledAt)],
    });

    return classEnrollments;
  }

  /**
   * Get candidate students for enrollment in a class
   * Returns students from the same section who are not yet enrolled in this class
   */
  async getCandidates(classId: string) {
    // Get the class to find its section
    const classRecord = await this.findById(classId);

    // Get all students in the section (enrolled in section with classId NULL)
    const sectionEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.sectionId, classRecord.sectionId),
        isNull(enrollments.classId),
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
              },
            },
          },
        },
      },
    });

    // Get students already enrolled in this class
    const classEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: {
        studentId: true,
      },
    });

    const enrolledStudentIds = new Set(classEnrollments.map(e => e.studentId));

    // Filter out already enrolled students
    const candidates = sectionEnrollments.filter(
      e => !enrolledStudentIds.has(e.studentId),
    );

    return candidates;
  }

  /**
   * Enroll a student in a class
   * If the student is already in the section (with classId=NULL), update that enrollment
   * Otherwise, create a new enrollment
   */
  async enrollStudent(classId: string, studentId: string) {
    // Verify class exists
    const classRecord = await this.findById(classId);

    // Verify student exists
    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
    });

    if (!student) {
      throw new BadRequestException(`Student with ID "${studentId}" not found`);
    }

    // Check if student is already enrolled in this class
    const existingEnrollment = await this.db.query.enrollments.findFirst({
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

    // Check if student is in the section
    const sectionEnrollment = await this.db.query.enrollments.findFirst({
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

    // If the student has a section-only enrollment (classId=NULL), update it
    if (sectionEnrollment.classId === null) {
      await this.db
        .update(enrollments)
        .set({
          classId: classId,
          enrolledAt: new Date(),
        })
        .where(eq(enrollments.id, sectionEnrollment.id));

      return this.getEnrollmentById(sectionEnrollment.id);
    } else {
      // Student already has a classId, create a new enrollment record
      const [newEnrollment] = await this.db
        .insert(enrollments)
        .values({
          studentId,
          classId,
          sectionId: classRecord.sectionId,
          status: 'enrolled',
        })
        .returning();

      return this.getEnrollmentById(newEnrollment.id);
    }
  }

  /**
   * Remove a student from a class
   * Deletes the enrollment record
   */
  async removeStudent(classId: string, studentId: string) {
    // Verify class exists
    await this.findById(classId);

    // Find and delete the enrollment
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
      ),
    });

    if (!enrollment) {
      throw new NotFoundException(
        `Student is not enrolled in this class`,
      );
    }

    await this.db.delete(enrollments).where(eq(enrollments.id, enrollment.id));

    return { id: enrollment.id };
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

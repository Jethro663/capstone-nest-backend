import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { sections, users, enrollments, studentProfiles } from '../../drizzle/schema';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';

@Injectable()
export class SectionsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Find all sections with optional filters
   */
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
    const limit = Math.min(filters?.limit || 50, 100); // Cap max limit
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    if (filters?.gradeLevel) {
      whereConditions.push(eq(sections.gradeLevel, filters.gradeLevel));
    }

    if (filters?.schoolYear) {
      whereConditions.push(eq(sections.schoolYear, filters.schoolYear));
    }

    if (filters?.isActive !== undefined) {
      whereConditions.push(eq(sections.isActive, filters.isActive));
    }

    if (filters?.adviserId) {
      whereConditions.push(eq(sections.adviserId, filters.adviserId));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(sections.name, searchPattern),
        ilike(sections.gradeLevel, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const sectionsList = await this.db.query.sections.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
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
      orderBy: (sections, { asc }) => [
        asc(sections.gradeLevel),
        asc(sections.name),
      ],
      limit,
      offset,
    });

    return sectionsList;
  }

  /**
   * Find a section by ID
   */
  async findById(id: string) {
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, id),
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

    if (!section) {
      throw new NotFoundException(`Section with ID "${id}" not found`);
    }

    return section;
  }

  /**
   * Get the roster (students) for a section
   */
  async getRoster(sectionId: string) {
    // Verify section exists
    await this.findById(sectionId);

    const roster = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.sectionId, sectionId),
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

    return roster.map(r => ({
      enrollmentId: r.id,
      studentId: r.studentId,
      status: r.status,
      enrolledAt: r.enrolledAt,
      student: r.student,
    }));
  }

  /**
   * Get candidate students who are not yet part of the section
   */
  async getCandidates(sectionId: string, filters?: { gradeLevel?: string; search?: string }) {
    // Verify section exists
    const section = await this.findById(sectionId);

    // Build base query: students who do not have an enrollment for this section
    // We will select users who have a student profile (i.e., are students)
    // We'll fetch users with profiles and apply grade/search filters client-side for simplicity
    // (keeps SQL simple and avoids enum typing issues)

    // Subquery to find students already in this section
    const existing = await this.db.query.enrollments.findMany({
      where: eq(enrollments.sectionId, sectionId),
      columns: { studentId: true },
    });

    const existingStudentIds = existing.map(e => e.studentId);

    // Query users with their student profile (fetch candidates client-side)
    const candidates = await this.db.query.users.findMany({
      with: {
        profile: true,
      },
      orderBy: (users, { asc }) => [asc(users.lastName), asc(users.firstName)],
      limit: 500,
    });

    // Filter out existing students and apply grade/search filters client-side for simplicity
    const filtered = candidates
      .filter(c => c.profile) // only users that have a student profile
      .filter(c => !existingStudentIds.includes(c.id))
      .filter(c => {
        if (filters?.gradeLevel && c.profile?.gradeLevel !== filters.gradeLevel) return false;
        if (filters?.search) {
          const s = filters.search.toLowerCase();
          return (
            c.firstName?.toLowerCase().includes(s) ||
            c.lastName?.toLowerCase().includes(s) ||
            c.email?.toLowerCase().includes(s)
          );
        }
        return true;
      });

    return filtered.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, gradeLevel: u.profile?.gradeLevel }));
  }

  /**
   * Bulk add students to a section (creates enrollments with classId = null)
   */
  async addStudentsToSection(sectionId: string, studentIds: string[]) {
    // Verify section exists
    await this.findById(sectionId);

    const created: any[] = [];

    for (const sid of studentIds) {
      // Verify student exists
      const student = await this.db.query.users.findFirst({ where: eq(users.id, sid) });
      if (!student) continue; // skip invalid ids

      // Check if already enrolled in this section without a class
      const existing = await this.db.query.enrollments.findFirst({
        where: and(eq(enrollments.sectionId, sectionId), eq(enrollments.studentId, sid), eq(enrollments.status, 'enrolled')),
      });

      if (existing) continue; // skip duplicates

      const [newEnrollment] = await this.db.insert(enrollments).values({
        studentId: sid,
        classId: null,
        sectionId: sectionId,
        status: 'enrolled',
        enrolledAt: new Date(),
      }).returning();

      created.push(newEnrollment);
    }

    return {
      createdCount: created.length,
      created,
    };
  }

  /**
   * Remove a student from a section (only if not enrolled in a class)
   */
  async removeStudentFromSection(sectionId: string, studentId: string) {
    // Verify section exists
    await this.findById(sectionId);

    // Find enrollment where student is in this section and not yet assigned to a class
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(eq(enrollments.sectionId, sectionId), eq(enrollments.studentId, studentId)),
    });

    if (!enrollment) {
      throw new BadRequestException('Student is not a member of this section');
    }

    if (enrollment.classId) {
      throw new BadRequestException('Student is enrolled in a class for this section; remove class enrollment first');
    }

    await this.db.delete(enrollments).where(eq(enrollments.id, enrollment.id));

    return { removed: true };
  }

  /**
   * Create a new section
   */
  async createSection(createSectionDto: CreateSectionDto) {
    // Check if section with same name, grade level, and school year already exists
    const existingSection = await this.db.query.sections.findFirst({
      where: and(
        eq(sections.name, createSectionDto.name),
        eq(sections.gradeLevel, createSectionDto.gradeLevel),
        eq(sections.schoolYear, createSectionDto.schoolYear),
      ),
    });

    if (existingSection) {
      throw new ConflictException(
        `Section "${createSectionDto.name}" already exists for ${createSectionDto.gradeLevel} in ${createSectionDto.schoolYear}`,
      );
    }

    // Verify adviser exists if provided
    if (createSectionDto.adviserId) {
      const adviser = await this.db.query.users.findFirst({
        where: eq(users.id, createSectionDto.adviserId),
      });

      if (!adviser) {
        throw new NotFoundException(
          `Adviser with ID "${createSectionDto.adviserId}" not found`,
        );
      }
    }

    // Create the section
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

    // Fetch with adviser details
    return this.findById(newSection.id);
  }

  /**
   * Update a section
   */
  async updateSection(id: string, updateSectionDto: UpdateSectionDto) {
    // Verify section exists
    const existingSection = await this.findById(id);

    // Check for name/grade/year conflicts if any of those are being updated
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
          `Section "${nameToCheck}" already exists for ${gradeToCheck} in ${yearToCheck}`,
        );
      }
    }

    // Verify adviser exists if provided
    if (updateSectionDto.adviserId) {
      const adviser = await this.db.query.users.findFirst({
        where: eq(users.id, updateSectionDto.adviserId),
      });

      if (!adviser) {
        throw new NotFoundException(
          `Adviser with ID "${updateSectionDto.adviserId}" not found`,
        );
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updateSectionDto.name !== undefined) {
      updateData.name = updateSectionDto.name;
    }
    if (updateSectionDto.gradeLevel !== undefined) {
      updateData.gradeLevel = updateSectionDto.gradeLevel;
    }
    if (updateSectionDto.schoolYear !== undefined) {
      updateData.schoolYear = updateSectionDto.schoolYear;
    }
    if (updateSectionDto.capacity !== undefined) {
      updateData.capacity = updateSectionDto.capacity;
    }
    if (updateSectionDto.roomNumber !== undefined) {
      updateData.roomNumber = updateSectionDto.roomNumber;
    }
    if (updateSectionDto.adviserId !== undefined) {
      updateData.adviserId = updateSectionDto.adviserId;
    }
    if (updateSectionDto.isActive !== undefined) {
      updateData.isActive = updateSectionDto.isActive;
    }

    // Perform update
    await this.db
      .update(sections)
      .set(updateData)
      .where(eq(sections.id, id));

    // Fetch updated section with adviser details
    return this.findById(id);
  }

  /**
   * Delete (soft delete) a section by setting isActive to false
   */
  async deleteSection(id: string) {
    // Verify section exists
    await this.findById(id);

    // Soft delete by setting isActive to false
    await this.db
      .update(sections)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(sections.id, id));

    return this.findById(id);
  }

  /**
   * Permanently delete a section (hard delete)
   * Use with caution - this will cascade delete related classes and enrollments
   */
  async permanentlyDeleteSection(id: string) {
    // Verify section exists
    await this.findById(id);

    await this.db.delete(sections).where(eq(sections.id, id));

    return { message: 'Section permanently deleted' };
  }
}

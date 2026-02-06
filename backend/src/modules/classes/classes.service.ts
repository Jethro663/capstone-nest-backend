import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { classes, subjects, sections, users } from '../../drizzle/schema';
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

    if (filters?.subjectId) {
      whereConditions.push(eq(classes.subjectId, filters.subjectId));
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
        subject: true,
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
        subject: true,
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
    // Verify that subject exists
    const subject = await this.db.query.subjects.findFirst({
      where: eq(subjects.id, createClassDto.subjectId),
    });

    if (!subject) {
      throw new BadRequestException(
        `Subject with ID "${createClassDto.subjectId}" not found`,
      );
    }

    // Verify that section exists
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
        eq(classes.subjectId, createClassDto.subjectId),
        eq(classes.sectionId, createClassDto.sectionId),
        eq(classes.schoolYear, createClassDto.schoolYear),
      ),
    });

    if (existingClass) {
      throw new ConflictException(
        `Class already exists for this subject, section, and school year`,
      );
    }

    const [newClass] = await this.db
      .insert(classes)
      .values({
        ...createClassDto,
      })
      .returning();

    return this.findById(newClass.id);
  }

  /**
   * Update a class
   */
  async update(id: string, updateClassDto: UpdateClassDto) {
    // Verify class exists
    await this.findById(id);

    // If updating subject, verify it exists
    if (updateClassDto.subjectId) {
      const subject = await this.db.query.subjects.findFirst({
        where: eq(subjects.id, updateClassDto.subjectId),
      });

      if (!subject) {
        throw new BadRequestException(
          `Subject with ID "${updateClassDto.subjectId}" not found`,
        );
      }
    }

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

    await this.db
      .update(classes)
      .set({
        ...updateClassDto,
        updatedAt: new Date(),
      })
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
        subject: true,
        section: true,
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
        subject: true,
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
      where: eq(classes.subjectId, subjectId),
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
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { classes, sections, users } from '../../drizzle/schema';

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

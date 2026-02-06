import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { subjects } from '../../drizzle/schema';
import { CreateSubjectDto } from './DTO/create-subject.dto';
import { UpdateSubjectDto } from './DTO/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Find all subjects with optional filters
   */
  async findAll(filters?: {
    gradeLevel?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap max limit
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    if (filters?.gradeLevel) {
      whereConditions.push(eq(subjects.gradeLevel, filters.gradeLevel));
    }

    if (filters?.isActive !== undefined) {
      whereConditions.push(eq(subjects.isActive, filters.isActive));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(subjects.name, searchPattern),
        ilike(subjects.code, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const subjectsList = await this.db.query.subjects.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: (subjects, { asc }) => [
        asc(subjects.gradeLevel),
        asc(subjects.name),
      ],
      limit,
      offset,
    });

    return subjectsList;
  }

  /**
   * Find a subject by ID
   */
  async findById(id: string) {
    const subject = await this.db.query.subjects.findFirst({
      where: eq(subjects.id, id),
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID "${id}" not found`);
    }

    return subject;
  }

  /**
   * Find subject by code
   */
  async findByCode(code: string) {
    const subject = await this.db.query.subjects.findFirst({
      where: eq(subjects.code, code.toUpperCase()),
    });

    return subject;
  }

  /**
   * Create a new subject
   */
  async createSubject(createSubjectDto: CreateSubjectDto) {
    // Check if subject with same name already exists
    const existingByName = await this.db.query.subjects.findFirst({
      where: eq(subjects.name, createSubjectDto.name),
    });

    if (existingByName) {
      throw new ConflictException(
        `Subject with name "${createSubjectDto.name}" already exists`,
      );
    }

    // Check if subject with same code already exists
    const existingByCode = await this.findByCode(createSubjectDto.code);

    if (existingByCode) {
      throw new ConflictException(
        `Subject with code "${createSubjectDto.code}" already exists`,
      );
    }

    // Create the subject
    const [newSubject] = await this.db
      .insert(subjects)
      .values({
        name: createSubjectDto.name,
        code: createSubjectDto.code.toUpperCase(),
        description: createSubjectDto.description || null,
        gradeLevel: createSubjectDto.gradeLevel,
        isActive: true,
      })
      .returning();

    return newSubject;
  }

  /**
   * Update a subject
   */
  async updateSubject(id: string, updateSubjectDto: UpdateSubjectDto) {
    // Verify subject exists
    const existingSubject = await this.findById(id);

    // Check for name conflicts (if name is being updated)
    if (
      updateSubjectDto.name &&
      updateSubjectDto.name !== existingSubject.name
    ) {
      const duplicateName = await this.db.query.subjects.findFirst({
        where: and(
          eq(subjects.name, updateSubjectDto.name),
          // Ensure we're not comparing with the same subject
          // Note: We need to use SQL for not equal
        ),
      });

      if (duplicateName && duplicateName.id !== id) {
        throw new ConflictException(
          `Subject with name "${updateSubjectDto.name}" already exists`,
        );
      }
    }

    // Check for code conflicts (if code is being updated)
    if (
      updateSubjectDto.code &&
      updateSubjectDto.code !== existingSubject.code
    ) {
      const duplicateCode = await this.findByCode(updateSubjectDto.code);

      if (duplicateCode && duplicateCode.id !== id) {
        throw new ConflictException(
          `Subject with code "${updateSubjectDto.code}" already exists`,
        );
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updateSubjectDto.name !== undefined) {
      updateData.name = updateSubjectDto.name;
    }
    if (updateSubjectDto.code !== undefined) {
      updateData.code = updateSubjectDto.code.toUpperCase();
    }
    if (updateSubjectDto.description !== undefined) {
      updateData.description = updateSubjectDto.description;
    }
    if (updateSubjectDto.gradeLevel !== undefined) {
      updateData.gradeLevel = updateSubjectDto.gradeLevel;
    }
    if (updateSubjectDto.isActive !== undefined) {
      updateData.isActive = updateSubjectDto.isActive;
    }

    // Perform update
    const [updatedSubject] = await this.db
      .update(subjects)
      .set(updateData)
      .where(eq(subjects.id, id))
      .returning();

    return updatedSubject;
  }

  /**
   * Delete (soft delete) a subject by setting isActive to false
   */
  async deleteSubject(id: string) {
    // Verify subject exists
    await this.findById(id);

    // Soft delete by setting isActive to false
    const [deletedSubject] = await this.db
      .update(subjects)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(subjects.id, id))
      .returning();

    return deletedSubject;
  }

  /**
   * Permanently delete a subject (hard delete)
   * Use with caution - this will cascade delete related classes
   */
  async permanentlyDeleteSubject(id: string) {
    // Verify subject exists
    await this.findById(id);

    await this.db.delete(subjects).where(eq(subjects.id, id));

    return { message: 'Subject permanently deleted' };
  }
}

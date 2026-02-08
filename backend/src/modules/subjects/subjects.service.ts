import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { classes } from '../../drizzle/schema';
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
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap max limit
    const offset = (page - 1) * limit;

    // Query classes and derive distinct subjects from denormalized fields
    const whereConditions: SQL<unknown>[] = [];

    if (filters?.gradeLevel) {
      whereConditions.push(eq(classes.subjectGradeLevel, filters.gradeLevel as '7'|'8'|'9'|'10'));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(classes.subjectName, searchPattern),
        ilike(classes.subjectCode, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const classRows = await this.db.query.classes.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: (classes, { asc }) => [asc(classes.subjectName)],
      limit: limit * 5, // fetch extra to allow de-duplication
      offset,
    });

    const map: Record<string, any> = {};
    classRows.forEach((r) => {
      if (!r.subjectCode) return;
      if (!map[r.subjectCode]) {
        map[r.subjectCode] = {
          name: r.subjectName,
          code: r.subjectCode,
          gradeLevel: r.subjectGradeLevel,
        };
      }
    });

    const subjectsList = Object.values(map).slice(0, limit);

    return subjectsList;
  }

  /**
   * Find a subject by ID
   */
  async findById(id: string) {
    // Treat id as subject code for compatibility
    const subject = await this.db.query.classes.findFirst({
      where: eq(classes.subjectCode, id),
    });

    if (!subject) {
      throw new NotFoundException(`Subject with code "${id}" not found`);
    }

    return {
      name: subject.subjectName,
      code: subject.subjectCode,
      gradeLevel: subject.subjectGradeLevel,
    };
  }

  /**
   * Find subject by code
   */
  async findByCode(code: string) {
    const subject = await this.db.query.classes.findFirst({
      where: eq(classes.subjectCode, code.toUpperCase()),
    });

    if (!subject) return null;

    return {
      name: subject.subjectName,
      code: subject.subjectCode,
      gradeLevel: subject.subjectGradeLevel,
    };
  }

  /**
   * Create a new subject
   */
  async createSubject(createSubjectDto: CreateSubjectDto) {
    // Subjects are now represented within `classes` (denormalized); creating a subject directly is no longer supported.
    throw new BadRequestException(
      'Subjects are now derived from Classes. To add a subject, create a Class with the desired subjectName/subjectCode.',
    );
  }

  /**
   * Update a subject
   */
  async updateSubject(id: string, updateSubjectDto: UpdateSubjectDto) {
    // Subjects are denormalized into Classes; direct subject updates are not supported.
    throw new BadRequestException(
      'Subjects are denormalized into Classes. To change a subject, update the Classes that reference it.',
    );
  }

  /**
   * Delete (soft delete) a subject by setting isActive to false
   */
  async deleteSubject(id: string) {
    throw new BadRequestException('Subjects are denormalized into Classes; deleting subjects directly is not supported.');
  }

  /**
   * Permanently delete a subject (hard delete)
   * Use with caution - this will cascade delete related classes
   */
  async permanentlyDeleteSubject(id: string) {
    throw new BadRequestException('Subjects are denormalized into Classes; permanent deletes are not supported through this endpoint.');
  }
}

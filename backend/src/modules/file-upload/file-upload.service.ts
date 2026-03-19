import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  classes,
  enrollments,
  libraryFolders,
  uploadedFiles,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import {
  FileQueryDto,
  FileScopeDto,
  UpdateFileMetadataDto,
  UpdateLibraryFolderDto,
} from './dto/file-upload.dto';

interface SaveFileRecordDto {
  teacherId: string;
  classId?: string;
  folderId?: string;
  scope?: FileScopeDto;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
}

interface CreateFolderDto {
  name: string;
  parentId?: string;
  scope?: FileScopeDto;
}

interface RequestUser {
  id: string;
  email: string;
  roles: string[];
}

@Injectable()
export class FileUploadService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isAdmin(user: RequestUser) {
    return user.roles.includes('admin');
  }

  private isTeacher(user: RequestUser) {
    return user.roles.includes('teacher');
  }

  private isStudent(user: RequestUser) {
    return user.roles.includes('student');
  }

  private ensureCanWriteScope(
    scope: FileScopeDto | undefined,
    user: RequestUser,
  ) {
    if (scope === FileScopeDto.General && !this.isAdmin(user)) {
      throw new ForbiddenException(
        'Only admins can publish files or folders to General Modules',
      );
    }
  }

  private async ensureClassOwnedByUser(classId: string, user: RequestUser) {
    if (this.isAdmin(user)) return;

    const classRow = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, teacherId: true },
    });

    if (!classRow) {
      throw new NotFoundException(`Class with ID "${classId}" not found`);
    }

    if (classRow.teacherId !== user.id) {
      throw new ForbiddenException(
        'You can only attach files to classes that you teach',
      );
    }
  }

  private async ensureFolderAccessible(id: string, user: RequestUser) {
    const folder = await this.db.query.libraryFolders.findFirst({
      where: and(eq(libraryFolders.id, id), isNull(libraryFolders.deletedAt)),
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID "${id}" not found`);
    }

    if (
      !this.isAdmin(user) &&
      folder.scope !== FileScopeDto.General &&
      folder.ownerId !== user.id
    ) {
      throw new ForbiddenException('You do not have access to this folder');
    }

    return folder;
  }

  private async ensureStudentCanAccessClass(classId: string, user: RequestUser) {
    if (!this.isStudent(user)) return;

    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, user.id),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: {
        id: true,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You do not have access to this class');
    }
  }

  private async ensureFolderWritable(id: string, user: RequestUser) {
    const folder = await this.ensureFolderAccessible(id, user);

    if (!this.isAdmin(user) && folder.ownerId !== user.id) {
      throw new ForbiddenException('You can only modify your own folders');
    }

    return folder;
  }

  private async ensureFileAccessible(id: string, user: RequestUser) {
    const record = await this.db.query.uploadedFiles.findFirst({
      where: and(eq(uploadedFiles.id, id), isNull(uploadedFiles.deletedAt)),
      with: {
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        class: {
          columns: {
            id: true,
            subjectName: true,
            subjectCode: true,
          },
        },
        folder: {
          columns: {
            id: true,
            name: true,
            ownerId: true,
            parentId: true,
            scope: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`File with ID "${id}" not found`);
    }

    if (
      !this.isAdmin(user) &&
      !this.isStudent(user) &&
      record.scope !== FileScopeDto.General &&
      record.teacherId !== user.id
    ) {
      throw new ForbiddenException('You do not have access to this file');
    }

    if (
      this.isStudent(user) &&
      record.scope !== FileScopeDto.General &&
      !record.classId
    ) {
      throw new ForbiddenException('You do not have access to this file');
    }

    if (this.isStudent(user) && record.classId) {
      await this.ensureStudentCanAccessClass(record.classId, user);
    }

    return record;
  }

  private async ensureFileWritable(id: string, user: RequestUser) {
    const record = await this.ensureFileAccessible(id, user);

    if (!this.isAdmin(user) && record.teacherId !== user.id) {
      throw new ForbiddenException('You can only modify your own files');
    }

    return record;
  }

  async saveFileRecord(dto: SaveFileRecordDto, user?: RequestUser) {
    const actingUser = user ?? {
      id: dto.teacherId,
      email: '',
      roles: ['teacher'],
    };

    this.ensureCanWriteScope(dto.scope, actingUser);

    if (dto.classId) {
      await this.ensureClassOwnedByUser(dto.classId, actingUser);
    }

    if (dto.folderId) {
      const folder = await this.ensureFolderWritable(dto.folderId, actingUser);
      if (dto.scope && dto.scope !== folder.scope) {
        throw new BadRequestException(
          'File scope must match the target folder scope',
        );
      }
    }

    const [record] = await this.db
      .insert(uploadedFiles)
      .values({
        teacherId: dto.teacherId,
        classId: dto.classId ?? null,
        folderId: dto.folderId ?? null,
        scope: dto.scope ?? FileScopeDto.Private,
        originalName: dto.originalName,
        storedName: dto.storedName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        filePath: dto.filePath,
      })
      .returning();

    await this.auditService.log({
      actorId: actingUser.id,
      action: 'file.uploaded',
      targetType: 'uploaded_file',
      targetId: record.id,
      metadata: {
        classId: record.classId,
        folderId: record.folderId,
        scope: record.scope,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
      },
    });

    return record;
  }

  async findAll(user: RequestUser, query: FileQueryDto = {}) {
    const isAdmin = this.isAdmin(user);
    const isStudent = this.isStudent(user);
    const filters: any[] = [isNull(uploadedFiles.deletedAt)];
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    if (isStudent) {
      if (query.folderId || query.ownerId) {
        throw new ForbiddenException(
          'Students can only browse class or general module files',
        );
      }

      const classFilters: any[] = [];
      if (query.classId) {
        await this.ensureStudentCanAccessClass(query.classId, user);
        classFilters.push(eq(uploadedFiles.classId, query.classId));
      } else {
        const enrollmentsForStudent = await this.db.query.enrollments.findMany({
          where: and(
            eq(enrollments.studentId, user.id),
            eq(enrollments.status, 'enrolled'),
          ),
          columns: {
            classId: true,
          },
        });
        const classIds = enrollmentsForStudent
          .map((enrollment) => enrollment.classId)
          .filter((classId): classId is string => Boolean(classId));

        if (classIds.length > 0) {
          classFilters.push(inArray(uploadedFiles.classId, classIds));
        }
      }

      filters.push(
        or(
          eq(uploadedFiles.scope, FileScopeDto.General),
          ...(classFilters.length > 0 ? classFilters : []),
        )!,
      );
    }

    if (query.scope) {
      filters.push(eq(uploadedFiles.scope, query.scope));
    } else if (!isAdmin && !isStudent) {
      filters.push(
        or(
          eq(uploadedFiles.teacherId, user.id),
          eq(uploadedFiles.scope, FileScopeDto.General),
        )!,
      );
    }

    if (!isAdmin && !isStudent && query.scope === FileScopeDto.Private) {
      filters.push(eq(uploadedFiles.teacherId, user.id));
    }

    if (query.ownerId) {
      if (!isAdmin && query.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only filter by your own ownership',
        );
      }
      filters.push(eq(uploadedFiles.teacherId, query.ownerId));
    }

    if (query.classId) {
      filters.push(eq(uploadedFiles.classId, query.classId));
    }

    if (query.folderId) {
      filters.push(eq(uploadedFiles.folderId, query.folderId));
    }

    if (query.search?.trim()) {
      filters.push(
        ilike(uploadedFiles.originalName, `%${query.search.trim()}%`),
      );
    }

    const whereClause = and(...filters);
    const [data, totalResult] = await Promise.all([
      this.db.query.uploadedFiles.findMany({
        where: whereClause,
        with: {
          teacher: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          class: {
            columns: {
              id: true,
              subjectName: true,
              subjectCode: true,
            },
          },
          folder: {
            columns: {
              id: true,
              name: true,
              ownerId: true,
              parentId: true,
              scope: true,
            },
          },
        },
        orderBy: [desc(uploadedFiles.uploadedAt)],
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(uploadedFiles).where(whereClause),
    ]);

    const total = Number(totalResult[0]?.total ?? 0);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  async findOne(id: string, user: RequestUser) {
    return this.ensureFileAccessible(id, user);
  }

  async updateFileMetadata(
    id: string,
    dto: UpdateFileMetadataDto,
    user: RequestUser,
  ) {
    const record = await this.ensureFileWritable(id, user);
    this.ensureCanWriteScope(dto.scope, user);

    if (dto.classId) {
      await this.ensureClassOwnedByUser(dto.classId, user);
    }

    if (dto.folderId) {
      const folder = await this.ensureFolderWritable(dto.folderId, user);
      const targetScope = dto.scope ?? record.scope;
      if (folder.scope !== targetScope) {
        throw new BadRequestException(
          'File scope must match the target folder scope',
        );
      }
    }

    await this.db
      .update(uploadedFiles)
      .set({
        originalName: dto.originalName ?? record.originalName,
        folderId:
          dto.folderId === undefined ? record.folderId : (dto.folderId ?? null),
        classId:
          dto.classId === undefined ? record.classId : (dto.classId ?? null),
        scope: dto.scope ?? record.scope,
      })
      .where(eq(uploadedFiles.id, id));

    return this.findOne(id, user);
  }

  async softDelete(id: string, user: RequestUser) {
    const record = await this.ensureFileWritable(id, user);

    await this.db
      .update(uploadedFiles)
      .set({ deletedAt: new Date() })
      .where(eq(uploadedFiles.id, id));

    await this.auditService.log({
      actorId: user.id,
      action: 'file.deleted',
      targetType: 'uploaded_file',
      targetId: id,
      metadata: {
        classId: record.classId,
        folderId: record.folderId,
        scope: record.scope,
      },
    });
  }

  async getFilePath(id: string, user: RequestUser): Promise<string> {
    const record = await this.ensureFileAccessible(id, user);
    return record.filePath;
  }

  async listFolders(user: RequestUser, query: FileQueryDto = {}) {
    const isAdmin = this.isAdmin(user);
    const filters: any[] = [isNull(libraryFolders.deletedAt)];

    if (query.scope) {
      filters.push(eq(libraryFolders.scope, query.scope));
    } else if (!isAdmin) {
      filters.push(
        or(
          eq(libraryFolders.ownerId, user.id),
          eq(libraryFolders.scope, FileScopeDto.General),
        )!,
      );
    }

    if (!isAdmin && query.scope === FileScopeDto.Private) {
      filters.push(eq(libraryFolders.ownerId, user.id));
    }

    if (query.ownerId) {
      if (!isAdmin && query.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only filter by your own ownership',
        );
      }
      filters.push(eq(libraryFolders.ownerId, query.ownerId));
    }

    if (query.folderId) {
      filters.push(eq(libraryFolders.parentId, query.folderId));
    } else {
      filters.push(isNull(libraryFolders.parentId));
    }

    if (query.search?.trim()) {
      filters.push(ilike(libraryFolders.name, `%${query.search.trim()}%`));
    }

    return this.db.query.libraryFolders.findMany({
      where: and(...filters),
      with: {
        owner: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [desc(libraryFolders.updatedAt)],
    });
  }

  async createFolder(dto: CreateFolderDto, user: RequestUser) {
    const scope = dto.scope ?? FileScopeDto.Private;
    this.ensureCanWriteScope(scope, user);

    if (dto.parentId) {
      const parent = await this.ensureFolderWritable(dto.parentId, user);
      if (parent.scope !== scope) {
        throw new BadRequestException(
          'Folder scope must match the parent folder scope',
        );
      }
    }

    const [folder] = await this.db
      .insert(libraryFolders)
      .values({
        name: dto.name.trim(),
        ownerId: user.id,
        parentId: dto.parentId ?? null,
        scope,
      })
      .returning();

    return folder;
  }

  async updateFolder(
    id: string,
    dto: UpdateLibraryFolderDto,
    user: RequestUser,
  ) {
    const folder = await this.ensureFolderWritable(id, user);
    const nextScope = (dto.scope ?? folder.scope) as FileScopeDto;
    this.ensureCanWriteScope(nextScope, user);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Folder cannot be its own parent');
      }

      const parent = await this.ensureFolderWritable(dto.parentId, user);
      if (parent.scope !== nextScope) {
        throw new BadRequestException(
          'Folder scope must match the parent folder scope',
        );
      }
    }

    await this.db
      .update(libraryFolders)
      .set({
        name: dto.name?.trim() ?? folder.name,
        parentId:
          dto.parentId === undefined ? folder.parentId : (dto.parentId ?? null),
        scope: nextScope,
        updatedAt: new Date(),
      })
      .where(eq(libraryFolders.id, id));

    return this.ensureFolderAccessible(id, user);
  }

  async deleteFolder(id: string, user: RequestUser) {
    await this.ensureFolderWritable(id, user);

    const childCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(libraryFolders)
      .where(
        and(eq(libraryFolders.parentId, id), isNull(libraryFolders.deletedAt)),
      );

    if (Number(childCount[0]?.count ?? 0) > 0) {
      throw new BadRequestException(
        'Delete or move child folders before removing this folder',
      );
    }

    await this.db
      .update(uploadedFiles)
      .set({ folderId: null })
      .where(eq(uploadedFiles.folderId, id));

    await this.db
      .update(libraryFolders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(libraryFolders.id, id));
  }

  async getStorageSummary() {
    const rows = await this.db.query.uploadedFiles.findMany({
      where: isNull(uploadedFiles.deletedAt),
      columns: { sizeBytes: true },
    });

    const totalFiles = rows.length;
    const totalBytes = rows.reduce((sum, r) => sum + Number(r.sizeBytes), 0);

    return {
      totalFiles,
      totalBytes,
      totalMB: parseFloat((totalBytes / 1_048_576).toFixed(2)),
      totalGB: parseFloat((totalBytes / 1_073_741_824).toFixed(4)),
    };
  }
}

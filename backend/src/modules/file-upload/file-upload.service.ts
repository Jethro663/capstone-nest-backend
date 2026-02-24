import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { uploadedFiles } from '../../drizzle/schema';

interface SaveFileRecordDto {
  teacherId: string;
  classId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
}

interface RequestUser {
  id: string;
  email: string;
  roles: string[];
}

@Injectable()
export class FileUploadService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Persist a file record after successful upload + validation
   */
  async saveFileRecord(dto: SaveFileRecordDto) {
    const [record] = await this.db
      .insert(uploadedFiles)
      .values({
        teacherId: dto.teacherId,
        classId: dto.classId,
        originalName: dto.originalName,
        storedName: dto.storedName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        filePath: dto.filePath,
      })
      .returning();
    return record;
  }

  /**
   * List files:
   *  - Admin → all non-deleted files with teacher + class info
   *  - Teacher → only their own non-deleted files
   */
  async findAll(user: RequestUser) {
    const isAdmin = user.roles.includes('admin');

    const rows = await this.db.query.uploadedFiles.findMany({
      where: isAdmin
        ? isNull(uploadedFiles.deletedAt)
        : and(
            eq(uploadedFiles.teacherId, user.id),
            isNull(uploadedFiles.deletedAt),
          ),
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
      },
      orderBy: [desc(uploadedFiles.uploadedAt)],
    });

    return rows;
  }

  /**
   * Retrieve a single file record with ownership enforcement
   */
  async findOne(id: string, user: RequestUser) {
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
      },
    });

    if (!record) {
      throw new NotFoundException(`File with ID "${id}" not found`);
    }

    const isAdmin = user.roles.includes('admin');
    if (!isAdmin && record.teacherId !== user.id) {
      throw new ForbiddenException('You do not have access to this file');
    }

    return record;
  }

  /**
   * Soft-delete a file record
   */
  async softDelete(id: string, user: RequestUser) {
    // findOne handles ownership + existence check
    await this.findOne(id, user);

    await this.db
      .update(uploadedFiles)
      .set({ deletedAt: new Date() })
      .where(eq(uploadedFiles.id, id));
  }

  /**
   * Returns the stored file path for streaming; enforces ownership
   */
  async getFilePath(id: string, user: RequestUser): Promise<string> {
    const record = await this.findOne(id, user);
    return record.filePath;
  }

  /**
   * Storage summary for admin dashboard
   */
  async getStorageSummary() {
    const rows = await this.db.query.uploadedFiles.findMany({
      where: isNull(uploadedFiles.deletedAt),
      columns: { sizeBytes: true },
    });

    const totalFiles = rows.length;
    const totalBytes = rows.reduce((sum, r) => sum + r.sizeBytes, 0);

    return {
      totalFiles,
      totalBytes,
      totalMB: parseFloat((totalBytes / 1_048_576).toFixed(2)),
      totalGB: parseFloat((totalBytes / 1_073_741_824).toFixed(4)),
    };
  }
}

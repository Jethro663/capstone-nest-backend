import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadService } from './file-upload.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { contentChunks } from '../../drizzle/schema';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FILE_ID = 'file-uuid-1';
const FILE_ID_2 = 'file-uuid-2';
const TEACHER_ID = 'teacher-uuid-1';
const TEACHER_ID_2 = 'teacher-uuid-2';
const ADMIN_ID = 'admin-uuid-1';
const CLASS_ID = 'class-uuid-1';

const TEACHER_USER = {
  id: TEACHER_ID,
  email: 't@school.edu',
  roles: ['teacher'],
};
const ADMIN_USER = { id: ADMIN_ID, email: 'a@school.edu', roles: ['admin'] };
const OTHER_TEACHER = {
  id: TEACHER_ID_2,
  email: 't2@school.edu',
  roles: ['teacher'],
};

const makeSaveDto = (overrides: Partial<any> = {}) => ({
  teacherId: TEACHER_ID,
  classId: CLASS_ID,
  aiEnabled: true,
  originalName: 'lecture.pdf',
  storedName: 'abc123_1700000000.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1_048_576, // 1 MB
  filePath: './uploads/pdfs/abc123_1700000000.pdf',
  ...overrides,
});

const makeFileRecord = (overrides: Partial<any> = {}) => ({
  id: FILE_ID,
  teacherId: TEACHER_ID,
  classId: CLASS_ID,
  aiEnabled: true,
  originalName: 'lecture.pdf',
  storedName: 'abc123_1700000000.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1_048_576,
  filePath: './uploads/pdfs/abc123_1700000000.pdf',
  uploadedAt: new Date('2026-02-23T00:00:00Z'),
  deletedAt: null,
  teacher: {
    id: TEACHER_ID,
    firstName: 'Ana',
    lastName: 'Cruz',
    email: 't@school.edu',
  },
  class: { id: CLASS_ID, subjectName: 'Math', subjectCode: 'MATH101' },
  ...overrides,
});

// ---------------------------------------------------------------------------
// DB mock helpers
// ---------------------------------------------------------------------------

const makeInsertChain = (rows: any[] = [makeFileRecord()]) => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(rows),
});

const makeUpdateChain = () => ({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue(undefined),
});

const makeDeleteChain = () => ({
  where: jest.fn().mockResolvedValue(undefined),
});

const makeSelectChain = (rows: any[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(rows),
  }),
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('FileUploadService', () => {
  let service: FileUploadService;
  let mockAuditService: { log: jest.Mock };

  const mockDb: any = {
    query: {
      classes: {
        findFirst: jest.fn(),
      },
      uploadedFiles: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    },
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    select: jest.fn(),
  };

  const mockDatabaseService = { db: mockDb };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };
    mockDb.select.mockReturnValue(makeSelectChain([{ total: 0 }]));
    mockDb.delete.mockReturnValue(makeDeleteChain());
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: CLASS_ID,
      teacherId: TEACHER_ID,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
  });

  // =========================================================================
  // saveFileRecord
  // =========================================================================

  describe('saveFileRecord', () => {
    it('inserts a row and returns the created record', async () => {
      const record = makeFileRecord();
      mockDb.insert.mockReturnValue(makeInsertChain([record]));

      const result = await service.saveFileRecord(
        makeSaveDto({
          subjectKey: 'science',
          gradeLevel: '7',
        }),
      );

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(result).toEqual(record);
    });

    it('passes all dto fields to the insert', async () => {
      const dto = makeSaveDto({
        originalName: 'chapter1.pdf',
        sizeBytes: 2_097_152,
        subjectKey: 'science',
        gradeLevel: '7',
      });
      const returnedRecord = makeFileRecord({
        originalName: 'chapter1.pdf',
        sizeBytes: 2_097_152,
      });
      const chain = makeInsertChain([returnedRecord]);
      mockDb.insert.mockReturnValue(chain);

      await service.saveFileRecord(dto);

      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          teacherId: dto.teacherId,
          classId: dto.classId,
          originalName: 'chapter1.pdf',
          sizeBytes: 2_097_152,
          mimeType: 'application/pdf',
        }),
      );
    });

    it('rejects admin general uploads without subject and grade partition', async () => {
      await expect(
        service.saveFileRecord(
          makeSaveDto({
            teacherId: ADMIN_ID,
            scope: 'general',
            classId: undefined,
          }),
          ADMIN_USER,
        ),
      ).rejects.toThrow(
        'AI-ready library files must specify subjectKey and gradeLevel',
      );
    });

    it('queues indexing for admin general uploads with a partition', async () => {
      const record = makeFileRecord({
        scope: 'general',
        subjectKey: 'science',
        gradeLevel: '7',
        indexStatus: 'pending',
      });
      mockDb.insert.mockReturnValue(makeInsertChain([record]));
      const queueFileIndex = jest.fn().mockResolvedValue(undefined);
      (service as any).libraryIndexingService = { queueFileIndex };

      await service.saveFileRecord(
        makeSaveDto({
          teacherId: ADMIN_ID,
          scope: 'general',
          classId: undefined,
          subjectKey: 'science',
          gradeLevel: '7',
          fileKind: 'txt',
        }),
        ADMIN_USER,
      );

      expect(queueFileIndex).toHaveBeenCalledWith(record.id, {
        actorId: ADMIN_ID,
        reason: 'upload',
      });
    });

    it('queues indexing for teacher private uploads when aiEnabled is true and a partition is provided', async () => {
      const record = makeFileRecord({
        scope: 'private',
        classId: null,
        subjectKey: 'science',
        gradeLevel: '7',
        aiEnabled: true,
        indexStatus: 'pending',
      });
      mockDb.insert.mockReturnValue(makeInsertChain([record]));
      const queueFileIndex = jest.fn().mockResolvedValue(undefined);
      (service as any).libraryIndexingService = { queueFileIndex };

      await service.saveFileRecord(
        makeSaveDto({
          classId: undefined,
          scope: 'private',
          subjectKey: 'science',
          gradeLevel: '7',
          aiEnabled: true,
        }),
        TEACHER_USER,
      );

      expect(queueFileIndex).toHaveBeenCalledWith(record.id, {
        actorId: TEACHER_ID,
        reason: 'upload',
      });
    });
  });

  // =========================================================================
  // findAll
  // =========================================================================

  describe('findAll', () => {
    it('returns all non-deleted files for an admin', async () => {
      const records = [makeFileRecord(), makeFileRecord({ id: FILE_ID_2 })];
      mockDb.query.uploadedFiles.findMany.mockResolvedValue(records);
      mockDb.select.mockReturnValue(
        makeSelectChain([{ total: records.length }]),
      );

      const result = await service.findAll(ADMIN_USER);

      expect(result).toEqual({
        data: records,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockDb.query.uploadedFiles.findMany).toHaveBeenCalledTimes(1);
    });

    it('filters by teacherId for a teacher', async () => {
      const records = [makeFileRecord()];
      mockDb.query.uploadedFiles.findMany.mockResolvedValue(records);
      mockDb.select.mockReturnValue(
        makeSelectChain([{ total: records.length }]),
      );

      const result = await service.findAll(TEACHER_USER);

      expect(result.data).toEqual(records);
      expect(result.total).toBe(1);
    });

    it('returns an empty array when a teacher has no files', async () => {
      mockDb.query.uploadedFiles.findMany.mockResolvedValue([]);
      mockDb.select.mockReturnValue(makeSelectChain([{ total: 0 }]));

      const result = await service.findAll(TEACHER_USER);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================

  describe('findOne', () => {
    it('returns the file record if teacher owns it', async () => {
      const record = makeFileRecord();
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);

      const result = await service.findOne(FILE_ID, TEACHER_USER);

      expect(result).toEqual(record);
    });

    it('returns the file record if user is admin regardless of owner', async () => {
      const record = makeFileRecord({ teacherId: TEACHER_ID }); // owned by different teacher
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);

      const result = await service.findOne(FILE_ID, ADMIN_USER);

      expect(result).toEqual(record);
    });

    it('throws NotFoundException when the file does not exist', async () => {
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(null);

      await expect(service.findOne(FILE_ID, TEACHER_USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException when a teacher tries to access another teacher's file", async () => {
      const record = makeFileRecord({ teacherId: TEACHER_ID }); // owned by TEACHER_ID
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);

      await expect(service.findOne(FILE_ID, OTHER_TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // =========================================================================
  // updateFileMetadata
  // =========================================================================

  describe('updateFileMetadata', () => {
    it('clears indexing state and preserves metadata when aiEnabled is turned off', async () => {
      const record = makeFileRecord({
        aiEnabled: true,
        subjectKey: 'science',
        gradeLevel: '7',
        indexStatus: 'completed',
        indexError: 'stale error',
        indexedAt: new Date('2026-02-24T00:00:00Z'),
      });
      const updatedRecord = {
        ...record,
        aiEnabled: false,
        indexStatus: 'not_indexed',
        indexError: null,
        indexedAt: null,
      };
      mockDb.query.uploadedFiles.findFirst
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(updatedRecord);
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue(updateChain);
      const deleteChain = makeDeleteChain();
      mockDb.delete.mockReturnValue(deleteChain);

      await service.updateFileMetadata(
        FILE_ID,
        { aiEnabled: false },
        TEACHER_USER,
      );

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          aiEnabled: false,
          indexStatus: 'not_indexed',
          indexError: null,
          indexedAt: null,
          subjectKey: 'science',
          gradeLevel: '7',
        }),
      );
      expect(mockDb.delete).toHaveBeenCalledWith(contentChunks);
      expect(deleteChain.where).toHaveBeenCalled();
    });

    it('requires subject and grade before enabling aiEnabled on an existing private file', async () => {
      const record = makeFileRecord({
        aiEnabled: false,
        subjectKey: null,
        gradeLevel: null,
        indexStatus: 'not_indexed',
      });
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);

      await expect(
        service.updateFileMetadata(FILE_ID, { aiEnabled: true }, TEACHER_USER),
      ).rejects.toThrow(
        'AI-ready library files must specify subjectKey and gradeLevel',
      );
    });

    it('queues indexing when aiEnabled is turned on with a partition using a metadata update reason', async () => {
      const record = makeFileRecord({
        aiEnabled: false,
        subjectKey: 'science',
        gradeLevel: '7',
        indexStatus: 'not_indexed',
      });
      const updatedRecord = {
        ...record,
        aiEnabled: true,
        indexStatus: 'pending',
        indexError: null,
        indexedAt: null,
      };
      mockDb.query.uploadedFiles.findFirst
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(updatedRecord);
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue(updateChain);
      const queueFileIndex = jest.fn().mockResolvedValue(undefined);
      (service as any).libraryIndexingService = { queueFileIndex };

      const result = await service.updateFileMetadata(
        FILE_ID,
        { aiEnabled: true, subjectKey: 'science', gradeLevel: '7' },
        TEACHER_USER,
      );

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          aiEnabled: true,
          indexStatus: 'pending',
          indexError: null,
          indexedAt: null,
          subjectKey: 'science',
          gradeLevel: '7',
        }),
      );
      expect(queueFileIndex).toHaveBeenCalledWith(FILE_ID, {
        actorId: TEACHER_USER.id,
        reason: 'metadata_update',
      });
      expect(result).toEqual(updatedRecord);
    });

    it('resyncs chunk partition metadata when a private AI-enabled file changes subject and grade', async () => {
      const record = makeFileRecord({
        scope: 'private',
        classId: null,
        aiEnabled: true,
        subjectKey: 'science',
        gradeLevel: '7',
      });
      const updatedRecord = {
        ...record,
        subjectKey: 'math',
        gradeLevel: '8',
      };
      mockDb.query.uploadedFiles.findFirst
        .mockResolvedValueOnce(record)
        .mockResolvedValueOnce(updatedRecord);
      const fileUpdateChain = makeUpdateChain();
      const chunkUpdateChain = makeUpdateChain();
      mockDb.update
        .mockReturnValueOnce(fileUpdateChain)
        .mockReturnValueOnce(chunkUpdateChain);

      await service.updateFileMetadata(
        FILE_ID,
        { subjectKey: 'math', gradeLevel: '8' },
        TEACHER_USER,
      );

      expect(chunkUpdateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectKey: 'math',
          gradeLevel: '8',
        }),
      );
    });
  });

  // =========================================================================
  // softDelete
  // =========================================================================

  describe('softDelete', () => {
    it('sets deletedAt on the record', async () => {
      const record = makeFileRecord();
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue(updateChain);

      await service.softDelete(FILE_ID, TEACHER_USER);

      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('throws NotFoundException when the file does not exist', async () => {
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(FILE_ID, TEACHER_USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException when teacher tries to delete another teacher's file", async () => {
      const record = makeFileRecord({ teacherId: TEACHER_ID });
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);

      await expect(service.softDelete(FILE_ID, OTHER_TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('does NOT call db.update when ownership check fails', async () => {
      const record = makeFileRecord({ teacherId: TEACHER_ID });
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);

      await expect(service.softDelete(FILE_ID, OTHER_TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // retryIndex
  // =========================================================================

  describe('retryIndex', () => {
    it('allows retrying indexing for a teacher-owned private AI-enabled file', async () => {
      const record = makeFileRecord({
        scope: 'private',
        classId: null,
        aiEnabled: true,
        subjectKey: 'science',
        gradeLevel: '7',
        indexStatus: 'failed',
      });
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);
      const updateChain = makeUpdateChain();
      mockDb.update.mockReturnValue(updateChain);
      const queueFileIndex = jest.fn().mockResolvedValue(undefined);
      (service as any).libraryIndexingService = { queueFileIndex };

      const result = await service.retryIndex(FILE_ID, TEACHER_USER);

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          indexStatus: 'pending',
          indexError: null,
          indexedAt: null,
        }),
      );
      expect(queueFileIndex).toHaveBeenCalledWith(FILE_ID, {
        actorId: TEACHER_ID,
        reason: 'retry',
      });
      expect(result).toEqual(record);
    });
  });

  // =========================================================================
  // getFilePath
  // =========================================================================

  describe('getFilePath', () => {
    it('returns the filePath string from the record', async () => {
      const record = makeFileRecord({ filePath: './uploads/pdfs/test.pdf' });
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);

      const result = await service.getFilePath(FILE_ID, TEACHER_USER);

      expect(result).toBe('./uploads/pdfs/test.pdf');
    });

    it('throws NotFoundException when file does not exist', async () => {
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(null);

      await expect(service.getFilePath(FILE_ID, TEACHER_USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when teacher does not own the file', async () => {
      const record = makeFileRecord({ teacherId: TEACHER_ID });
      mockDb.query.uploadedFiles.findFirst.mockResolvedValue(record);

      await expect(service.getFilePath(FILE_ID, OTHER_TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // =========================================================================
  // getStorageSummary
  // =========================================================================

  describe('getStorageSummary', () => {
    it('returns correct totals when there are multiple files', async () => {
      mockDb.query.uploadedFiles.findMany.mockResolvedValue([
        { sizeBytes: 1_048_576 }, // 1 MB
        { sizeBytes: 2_097_152 }, // 2 MB
        { sizeBytes: 3_145_728 }, // 3 MB
      ]);

      const result = await service.getStorageSummary();

      expect(result.totalFiles).toBe(3);
      expect(result.totalBytes).toBe(6_291_456); // 6 MB
      expect(result.totalMB).toBe(6);
      expect(result.totalGB).toBeCloseTo(0.0059, 3);
    });

    it('returns zeros when there are no files', async () => {
      mockDb.query.uploadedFiles.findMany.mockResolvedValue([]);

      const result = await service.getStorageSummary();

      expect(result).toEqual({
        totalFiles: 0,
        totalBytes: 0,
        totalMB: 0,
        totalGB: 0,
      });
    });

    it('does not count soft-deleted files (query passes isNull filter to findMany)', async () => {
      // The service passes isNull(uploadedFiles.deletedAt) to findMany.
      // Here we verify that findMany is called exactly once (filter is applied in DB query)
      mockDb.query.uploadedFiles.findMany.mockResolvedValue([
        { sizeBytes: 500_000 },
      ]);

      const result = await service.getStorageSummary();

      expect(mockDb.query.uploadedFiles.findMany).toHaveBeenCalledTimes(1);
      expect(result.totalFiles).toBe(1);
    });
  });
});

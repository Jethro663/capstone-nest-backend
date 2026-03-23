import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';

// ---------------------------------------------------------------------------
// Mock fs so existsSync + mkdirSync are controllable in unit tests
// ---------------------------------------------------------------------------

const mockExistsSync = jest.fn().mockReturnValue(true);
const mockMkdirSync = jest.fn();

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FILE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CLASS_ID = 'cccccccc-dddd-eeee-ffff-000000000000';

const TEACHER_USER = {
  id: 'teacher-1',
  email: 't@school.edu',
  roles: ['teacher'],
};
const ADMIN_USER = { id: 'admin-1', email: 'a@school.edu', roles: ['admin'] };

const makeFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'lecture.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    path: './uploads/pdfs/uuid_1700000000.pdf',
    filename: 'uuid_1700000000.pdf',
    size: 1_048_576,
    destination: './uploads/pdfs',
    buffer: Buffer.alloc(0),
    stream: null as any,
    ...overrides,
  }) as Express.Multer.File;

const makeRecord = (overrides: Partial<any> = {}) => ({
  id: FILE_ID,
  teacherId: TEACHER_USER.id,
  classId: CLASS_ID,
  originalName: 'lecture.pdf',
  storedName: 'uuid_1700000000.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1_048_576,
  filePath: './uploads/pdfs/uuid_1700000000.pdf',
  uploadedAt: new Date('2026-02-23T00:00:00Z'),
  deletedAt: null,
  teacher: {
    id: TEACHER_USER.id,
    firstName: 'Ana',
    lastName: 'Cruz',
    email: 't@school.edu',
  },
  class: { id: CLASS_ID, subjectName: 'Math', subjectCode: 'MATH101' },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Service mock
// ---------------------------------------------------------------------------

const mockFileUploadService = {
  saveFileRecord: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  softDelete: jest.fn(),
  getFilePath: jest.fn(),
  getStorageSummary: jest.fn(),
};

// Minimal Express response mock used in download tests
const makeMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  setHeader: jest.fn(),
  sendFile: jest.fn(),
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('FileUploadController', () => {
  let controller: FileUploadController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileUploadController],
      providers: [
        { provide: FileUploadService, useValue: mockFileUploadService },
      ],
    }).compile();

    controller = module.get<FileUploadController>(FileUploadController);
  });

  // =========================================================================
  // uploadFile — POST /files/upload
  // =========================================================================

  describe('uploadFile', () => {
    it('saves the file record and returns success:true with the record', async () => {
      const record = makeRecord();
      mockFileUploadService.saveFileRecord.mockResolvedValue(record);

      const result = await controller.uploadFile(
        makeFile(),
        { classId: CLASS_ID },
        TEACHER_USER,
      );

      expect(result).toEqual({
        success: true,
        message: 'PDF uploaded successfully',
        data: record,
      });
    });

    it('calls saveFileRecord with all mapped fields from file + body + user', async () => {
      const file = makeFile({ originalname: 'chapter2.pdf', size: 2_097_152 });
      const record = makeRecord();
      mockFileUploadService.saveFileRecord.mockResolvedValue(record);

      await controller.uploadFile(file, { classId: CLASS_ID }, TEACHER_USER);

      expect(mockFileUploadService.saveFileRecord).toHaveBeenCalledWith(
        {
          teacherId: TEACHER_USER.id,
          classId: CLASS_ID,
          originalName: 'chapter2.pdf',
          storedName: file.filename,
          mimeType: file.mimetype,
          sizeBytes: 2_097_152,
          filePath: 'uploads/pdfs/uuid_1700000000.pdf',
          folderId: undefined,
          scope: 'private',
        },
        TEACHER_USER,
      );
    });

    it('propagates service errors (e.g. DB failure)', async () => {
      mockFileUploadService.saveFileRecord.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        controller.uploadFile(makeFile(), { classId: CLASS_ID }, TEACHER_USER),
      ).rejects.toThrow('DB error');
    });
  });

  // =========================================================================
  // listFiles — GET /files
  // =========================================================================

  describe('listFiles', () => {
    it('returns success:true and the files array with a count', async () => {
      const records = [makeRecord(), makeRecord({ id: 'file-uuid-2' })];
      mockFileUploadService.findAll.mockResolvedValue({
        data: records,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.listFiles(TEACHER_USER);

      expect(result).toEqual({
        success: true,
        message: 'Files retrieved successfully',
        data: records,
        count: 2,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('returns count: 0 when there are no files', async () => {
      mockFileUploadService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await controller.listFiles(TEACHER_USER);

      expect(result.count).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('forwards the current user to the service', async () => {
      mockFileUploadService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await controller.listFiles(ADMIN_USER, {} as any);

      expect(mockFileUploadService.findAll).toHaveBeenCalledWith(
        ADMIN_USER,
        {},
      );
    });
  });

  // =========================================================================
  // getStorageSummary — GET /files/storage-summary
  // =========================================================================

  describe('getStorageSummary', () => {
    it('returns success:true and the storage summary', async () => {
      const summary = {
        totalFiles: 5,
        totalBytes: 10_000_000,
        totalMB: 9.54,
        totalGB: 0.0093,
      };
      mockFileUploadService.getStorageSummary.mockResolvedValue(summary);

      const result = await controller.getStorageSummary();

      expect(result).toEqual({
        success: true,
        message: 'Storage summary retrieved',
        data: summary,
      });
    });
  });

  // =========================================================================
  // getFile — GET /files/:id
  // =========================================================================

  describe('getFile', () => {
    it('returns success:true and the file metadata', async () => {
      const record = makeRecord();
      mockFileUploadService.findOne.mockResolvedValue(record);

      const result = await controller.getFile(FILE_ID, TEACHER_USER);

      expect(result).toEqual({
        success: true,
        message: 'File retrieved successfully',
        data: record,
      });
    });

    it('passes the id and user to findOne', async () => {
      mockFileUploadService.findOne.mockResolvedValue(makeRecord());

      await controller.getFile(FILE_ID, ADMIN_USER);

      expect(mockFileUploadService.findOne).toHaveBeenCalledWith(
        FILE_ID,
        ADMIN_USER,
      );
    });

    it('propagates NotFoundException from service', async () => {
      mockFileUploadService.findOne.mockRejectedValue(
        new NotFoundException(`File with ID "${FILE_ID}" not found`),
      );

      await expect(controller.getFile(FILE_ID, TEACHER_USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('propagates ForbiddenException from service', async () => {
      mockFileUploadService.findOne.mockRejectedValue(
        new ForbiddenException('You do not have access to this file'),
      );

      await expect(controller.getFile(FILE_ID, TEACHER_USER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // =========================================================================
  // downloadFile — GET /files/:id/download
  // =========================================================================

  describe('downloadFile', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true); // default: file exists on disk
    });

    it('calls sendFile with the resolved absolute path and sets PDF header', async () => {
      const storedRelPath = './uploads/pdfs/uuid_1700000000.pdf';
      mockFileUploadService.getFilePath.mockResolvedValue(storedRelPath);

      const res = makeMockRes();
      await controller.downloadFile(FILE_ID, TEACHER_USER, res as any);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(res.sendFile).toHaveBeenCalled();
    });

    it('returns 404 JSON when the file does not exist on disk', async () => {
      mockExistsSync.mockReturnValue(false);
      mockFileUploadService.getFilePath.mockResolvedValue(
        './uploads/pdfs/missing.pdf',
      );

      const res = makeMockRes();
      await controller.downloadFile(FILE_ID, TEACHER_USER, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, statusCode: 404 }),
      );
    });

    it('propagates NotFoundException from service before touching disk', async () => {
      mockFileUploadService.getFilePath.mockRejectedValue(
        new NotFoundException(`File with ID "${FILE_ID}" not found`),
      );

      const res = makeMockRes();

      await expect(
        controller.downloadFile(FILE_ID, TEACHER_USER, res as any),
      ).rejects.toThrow(NotFoundException);

      expect(res.sendFile).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deleteFile — DELETE /files/:id
  // =========================================================================

  describe('deleteFile', () => {
    it('returns success:true after soft-deleting', async () => {
      mockFileUploadService.softDelete.mockResolvedValue(undefined);

      const result = await controller.deleteFile(FILE_ID, TEACHER_USER);

      expect(result).toEqual({
        success: true,
        message: 'File deleted successfully',
      });
    });

    it('calls softDelete with id and user', async () => {
      mockFileUploadService.softDelete.mockResolvedValue(undefined);

      await controller.deleteFile(FILE_ID, ADMIN_USER);

      expect(mockFileUploadService.softDelete).toHaveBeenCalledWith(
        FILE_ID,
        ADMIN_USER,
      );
    });

    it('propagates NotFoundException from service', async () => {
      mockFileUploadService.softDelete.mockRejectedValue(
        new NotFoundException(`File with ID "${FILE_ID}" not found`),
      );

      await expect(
        controller.deleteFile(FILE_ID, TEACHER_USER),
      ).rejects.toThrow(NotFoundException);
    });

    it("propagates ForbiddenException when teacher tries to delete another's file", async () => {
      mockFileUploadService.softDelete.mockRejectedValue(
        new ForbiddenException('You do not have access to this file'),
      );

      await expect(
        controller.deleteFile(FILE_ID, TEACHER_USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

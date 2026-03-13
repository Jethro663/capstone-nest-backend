import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RosterImportController } from './roster-import.controller';
import { RosterImportService } from './roster-import.service';

// simple user fixtures
const TEACHER = { id: 't1', email: 't@school.edu', roles: ['teacher'] };
const ADMIN = { id: 'a1', email: 'a@school.edu', roles: ['admin'] };

// stubbed file object
const makeFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'roster.xlsx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    path: '/tmp/roster/fake.xlsx',
    filename: 'fake.xlsx',
    size: 1024,
    destination: '/tmp/roster',
    buffer: Buffer.alloc(0),
    stream: null as any,
    ...overrides,
  }) as any;

const mockService = {
  parseAndPreview: jest.fn(),
  commitRoster: jest.fn(),
  getPendingRoster: jest.fn(),
  resolvePendingRow: jest.fn(),
};

let controller: RosterImportController;

describe('RosterImportController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RosterImportController],
      providers: [{ provide: RosterImportService, useValue: mockService }],
    }).compile();

    controller = module.get<RosterImportController>(RosterImportController);
  });

  describe('preview', () => {
    it('forwards file & sectionId to service and returns its result', async () => {
      const resp = { registered: [], pending: [], errors: [], summary: {} };
      mockService.parseAndPreview.mockResolvedValue(resp);

      const file = makeFile();
      const result = await controller.preview('sec-123', file, TEACHER);

      expect(result).toBe(resp);
      expect(mockService.parseAndPreview).toHaveBeenCalledWith(
        'sec-123',
        file,
        TEACHER,
      );
    });

    it('propagates exceptions from service', async () => {
      mockService.parseAndPreview.mockRejectedValue(
        new NotFoundException('no section'),
      );
      await expect(
        controller.preview('sec-123', makeFile(), TEACHER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('commit', () => {
    const dto = { sectionId: 'sec-1', enrolledRows: [], pendingRows: [] };
    it('passes through payload and returns service result', async () => {
      const resp = {
        enrolledUserIds: [],
        pendingRosterIds: [],
        alreadyEnrolledSkipped: 0,
        summary: {},
      };
      mockService.commitRoster.mockResolvedValue(resp);

      expect(await controller.commit('sec-1', dto as any, ADMIN)).toBe(resp);
      expect(mockService.commitRoster).toHaveBeenCalledWith(
        'sec-1',
        dto,
        ADMIN,
      );
    });

    it('bubbles up BadRequestExceptions', async () => {
      mockService.commitRoster.mockRejectedValue(
        new BadRequestException('bad'),
      );
      await expect(
        controller.commit('sec-1', dto as any, ADMIN),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPending', () => {
    it('returns array from service', async () => {
      const arr = [{ id: 'p1' }];
      mockService.getPendingRoster.mockResolvedValue(arr);
      expect(await controller.getPending('sec', TEACHER)).toBe(arr);
      expect(mockService.getPendingRoster).toHaveBeenCalledWith('sec', TEACHER);
    });
  });

  describe('resolvePending', () => {
    it('forwards id and dto', async () => {
      const row = { id: 'p1' };
      mockService.resolvePendingRow.mockResolvedValue(row);
      const dto = { resolvedUserId: null };
      expect(await controller.resolvePending('p1', dto as any, ADMIN)).toBe(
        row,
      );
      expect(mockService.resolvePendingRow).toHaveBeenCalledWith(
        'p1',
        null,
        ADMIN,
      );
    });
  });
});

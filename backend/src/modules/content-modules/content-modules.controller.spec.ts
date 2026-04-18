import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { ContentModulesController } from './content-modules.controller';
import { ContentModulesService } from './content-modules.service';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}));

const CLASS_ID = '00000000-0000-0000-0000-000000000201';
const MODULE_ID = '00000000-0000-0000-0000-000000000202';
const ITEM_ID = '00000000-0000-0000-0000-000000000204';
const USER = {
  userId: '00000000-0000-0000-0000-000000000203',
  roles: ['student'],
};

const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

function makeMockRes() {
  const res: any = {
    setHeader: jest.fn(),
    sendFile: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('ContentModulesController', () => {
  let controller: ContentModulesController;

  const mockService = {
    getModulesByClass: jest.fn(),
    getModuleByClass: jest.fn(),
    getAttachedFileForDownload: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentModulesController],
      providers: [
        {
          provide: ContentModulesService,
          useValue: mockService,
        },
      ],
    }).compile();
    controller = module.get<ContentModulesController>(ContentModulesController);
  });

  it('returns class module list envelope with count', async () => {
    mockService.getModulesByClass.mockResolvedValue([
      { id: MODULE_ID },
      { id: 'module-2' },
    ]);

    const result = await controller.getByClass(CLASS_ID, USER);

    expect(mockService.getModulesByClass).toHaveBeenCalledWith(
      CLASS_ID,
      USER.userId,
      USER.roles,
    );
    expect(result).toEqual({
      success: true,
      message: 'Modules retrieved successfully',
      data: [{ id: MODULE_ID }, { id: 'module-2' }],
      count: 2,
    });
  });

  it('returns module detail envelope for class + module id', async () => {
    mockService.getModuleByClass.mockResolvedValue({ id: MODULE_ID });

    const result = await controller.getByClassAndModule(
      CLASS_ID,
      MODULE_ID,
      USER,
    );

    expect(mockService.getModuleByClass).toHaveBeenCalledWith(
      CLASS_ID,
      MODULE_ID,
      USER.userId,
      USER.roles,
    );
    expect(result).toEqual({
      success: true,
      message: 'Module retrieved successfully',
      data: { id: MODULE_ID },
    });
  });

  describe('downloadAttachedFile', () => {
    it('sends the resolved attached file and applies headers', async () => {
      mockService.getAttachedFileForDownload.mockResolvedValue({
        id: 'file-1',
        originalName: 'Private Notes.pdf',
        mimeType: 'application/pdf',
        filePath: './uploads/library/private-notes.pdf',
      });

      const res = makeMockRes();
      await controller.downloadAttachedFile(ITEM_ID, USER, res);

      expect(mockService.getAttachedFileForDownload).toHaveBeenCalledWith(
        ITEM_ID,
        USER.userId,
        USER.roles,
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(res.sendFile).toHaveBeenCalled();
    });

    it('returns 404 json when the attached file is missing on disk', async () => {
      mockExistsSync.mockReturnValue(false);
      mockService.getAttachedFileForDownload.mockResolvedValue({
        id: 'file-1',
        originalName: 'Private Notes.pdf',
        mimeType: 'application/pdf',
        filePath: './uploads/library/private-notes.pdf',
      });

      const res = makeMockRes();
      await controller.downloadAttachedFile(ITEM_ID, USER, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, statusCode: 404 }),
      );
    });

    it('propagates service not found before touching disk', async () => {
      mockService.getAttachedFileForDownload.mockRejectedValue(
        new NotFoundException(`File with ID "${ITEM_ID}" not found`),
      );

      const res = makeMockRes();
      await expect(
        controller.downloadAttachedFile(ITEM_ID, USER, res),
      ).rejects.toThrow(NotFoundException);
      expect(res.sendFile).not.toHaveBeenCalled();
    });
  });
});

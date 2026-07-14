import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { InternalUploadsController } from './internal-uploads.controller';

jest.mock('fs');

describe('InternalUploadsController', () => {
  const config = {
    get: jest.fn((key: string) =>
      key === 'AI_SERVICE_SHARED_SECRET' ? 'shared-secret' : undefined,
    ),
  } as unknown as ConfigService;

  let controller: InternalUploadsController;
  let response: { sendFile: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new InternalUploadsController(config);
    response = { sendFile: jest.fn() };
  });

  it('serves uploads-prefixed paths from the backend uploads root', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    await controller.readUpload(
      'uploads/pdfs/lesson.pdf',
      'shared-secret',
      response as any,
    );

    expect(response.sendFile).toHaveBeenCalledWith(
      path.resolve('uploads', 'pdfs', 'lesson.pdf'),
    );
  });

  it('serves dot-slash uploads paths from the backend uploads root', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    await controller.readUpload(
      './uploads/pdfs/lesson.pdf',
      'shared-secret',
      response as any,
    );

    expect(response.sendFile).toHaveBeenCalledWith(
      path.resolve('uploads', 'pdfs', 'lesson.pdf'),
    );
  });

  it('rejects traversal outside uploads', async () => {
    await expect(
      controller.readUpload('../secret.pdf', 'shared-secret', response as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a wrong internal service token before reading the file', async () => {
    await expect(
      controller.readUpload(
        'uploads/pdfs/lesson.pdf',
        'wrong-secret',
        response as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('fails closed when the internal shared secret is not configured', async () => {
    const unconfigured = new InternalUploadsController({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await expect(
      unconfigured.readUpload(
        'uploads/pdfs/lesson.pdf',
        undefined,
        response as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('returns not found when the upload is missing on disk', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    await expect(
      controller.readUpload(
        'uploads/pdfs/missing.pdf',
        'shared-secret',
        response as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('redirects s3:// URLs to signed download URL without corrupting key', async () => {
    const mockStorageService = {
      driver: 's3' as const,
      getSignedDownloadUrl: jest
        .fn()
        .mockResolvedValue('https://s3.signed/url'),
    };
    const s3Controller = new InternalUploadsController(
      config,
      mockStorageService as any,
    );
    const mockRes = { redirect: jest.fn() };

    await s3Controller.readUpload(
      's3://library/science/file.pdf',
      'shared-secret',
      mockRes as any,
    );

    expect(mockStorageService.getSignedDownloadUrl).toHaveBeenCalledWith(
      'library/science/file.pdf',
    );
    expect(mockRes.redirect).toHaveBeenCalledWith(302, 'https://s3.signed/url');
  });
});

import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { storageCleanupFailures } from '../../../monitoring/utils/metrics';
import type { StorageProviderInterface } from './storage.provider';
import { StorageService } from './storage.service';

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    promises: {
      ...actual.promises,
      readFile: jest.fn(),
      unlink: jest.fn(),
    },
  };
});

describe('StorageService cleanup observability', () => {
  const originalStorageDriver = process.env.STORAGE_DRIVER;

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.STORAGE_DRIVER = originalStorageDriver;
  });

  it('reports local cleanup failure without failing a successful S3 upload', async () => {
    process.env.STORAGE_DRIVER = 's3';
    const provider = {
      putObject: jest.fn().mockResolvedValue({ key: 'library/upload.pdf' }),
    } as unknown as StorageProviderInterface;
    const service = new StorageService(provider);
    jest.mocked(fs.existsSync).mockReturnValue(true);
    jest.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('pdf'));
    jest.mocked(fs.promises.unlink).mockRejectedValue(new Error('disk busy'));
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const increment = jest
      .spyOn(storageCleanupFailures, 'inc')
      .mockImplementation(() => undefined);

    const result = await service.saveUploadedFile(
      {
        path: '/tmp/upload.pdf',
        originalname: 'upload.pdf',
        mimetype: 'application/pdf',
        size: 3,
      } as Express.Multer.File,
      'library',
    );

    expect(result.storageProvider).toBe('s3');
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'storage_cleanup_failed',
        filePath: '/tmp/upload.pdf',
      }),
    );
    expect(increment).toHaveBeenCalledWith({
      component: 'storage-service',
      operation: 'unlink-after-s3-upload',
    });
  });
});

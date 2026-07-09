import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_PROVIDER_TOKEN } from './storage.provider';
import type {
  SignedUploadDescriptor,
  StorageProviderInterface,
  StoredObjectDescriptor,
} from './storage.provider';
import { UPLOAD_ROOT } from '../constants/file-upload.constants';

@Injectable()
export class StorageService implements StorageProviderInterface {
  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly provider: StorageProviderInterface,
  ) {}

  get driver(): 'local' | 's3' {
    const d = (
      process.env.STORAGE_DRIVER ||
      process.env.STORAGE_PROVIDER ||
      'local'
    ).toLowerCase();
    return d === 's3' || d === 'r2' ? 's3' : 'local';
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType?: string;
  }): Promise<StoredObjectDescriptor> {
    return this.provider.putObject(input);
  }

  async deleteObject(key: string): Promise<void> {
    return this.provider.deleteObject(key);
  }

  async getSignedDownloadUrl(
    key: string,
    filename?: string,
    expiresInSeconds?: number,
  ): Promise<string> {
    return this.provider.getSignedDownloadUrl(key, filename, expiresInSeconds);
  }

  async getSignedUploadUrl(input: {
    key: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<SignedUploadDescriptor> {
    return this.provider.getSignedUploadUrl(input);
  }

  resolvePublicUrl(key: string): string | null {
    if (this.provider.resolvePublicUrl) {
      return this.provider.resolvePublicUrl(key);
    }
    return null;
  }

  async getObject(key: string): Promise<Buffer> {
    return this.provider.getObject(key);
  }

  async serveOrRedirect(
    res: Response,
    fileRecord: {
      storageKey?: string | null;
      storageProvider?: string | null;
      filePath?: string | null;
      originalName?: string | null;
    },
    customFilename?: string,
  ): Promise<void> {
    const filename = customFilename || fileRecord.originalName || 'download';
    const provider = (fileRecord.storageProvider || this.driver).toLowerCase();
    let key = fileRecord.storageKey || null;
    if (!key && fileRecord.filePath) {
      key = fileRecord.filePath
        .replace(/^(\.\/)?uploads\//, '')
        .replace(/^\.\//, '');
    }

    if (provider === 's3' && key) {
      const signedUrl = await this.getSignedDownloadUrl(key, filename);
      res.redirect(302, signedUrl);
      return;
    }

    // Local fallback
    let absolutePath = fileRecord.filePath
      ? path.resolve(fileRecord.filePath)
      : null;
    if ((!absolutePath || !fs.existsSync(absolutePath)) && key) {
      absolutePath = path.resolve(UPLOAD_ROOT, key);
    }
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      throw new NotFoundException('File not found on local storage');
    }
    res.sendFile(absolutePath);
  }

  async saveUploadedFile(
    file: Express.Multer.File,
    folderPrefix: string,
    customFilename?: string,
  ): Promise<{
    storageKey: string;
    storageProvider: 'local' | 's3';
    storageBucket?: string;
    filePath: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url?: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const ext = path.extname(file.originalname || '');
    const filename =
      customFilename || file.filename || `${uuidv4()}_${Date.now()}${ext}`;
    const key = path.join(folderPrefix, filename).replace(/\\/g, '/');
    let buffer: Buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      buffer = await fs.promises.readFile(file.path);
    } else {
      throw new BadRequestException('Uploaded file content is empty or missing');
    }

    const res = await this.putObject({
      key,
      body: buffer,
      contentType: file.mimetype,
    });

    if (file.path && fs.existsSync(file.path) && this.driver === 's3') {
      try {
        await fs.promises.unlink(file.path);
      } catch {}
    }

    const filePath =
      this.driver === 'local' ? path.join(UPLOAD_ROOT, key) : `s3://${res.key}`;

    return {
      storageKey: key,
      storageProvider: this.driver,
      storageBucket:
        process.env.STORAGE_BUCKET ||
        process.env.AWS_S3_BUCKET ||
        'nexora-uploads',
      filePath,
      originalName: file.originalname || filename,
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size || buffer.length,
      url: res.url,
    };
  }

  async checkHealth(): Promise<{
    ok: boolean;
    message?: string;
    driver: string;
  }> {
    const driver = this.driver;
    if (driver === 'local') {
      try {
        const root = path.resolve(UPLOAD_ROOT);
        if (!fs.existsSync(root)) {
          fs.mkdirSync(root, { recursive: true });
        }
        fs.accessSync(root, fs.constants.R_OK | fs.constants.W_OK);
        return { ok: true, driver };
      } catch (err) {
        return {
          ok: false,
          driver,
          message:
            err instanceof Error
              ? err.message
              : 'Local upload directory not accessible',
        };
      }
    } else {
      const bucket =
        process.env.STORAGE_BUCKET ||
        process.env.AWS_S3_BUCKET ||
        'nexora-uploads';
      if (!bucket) {
        return {
          ok: false,
          driver,
          message: 'S3 bucket name is not configured',
        };
      }
      if (typeof this.provider.checkHealth === 'function') {
        const res = await this.provider.checkHealth();
        return {
          ok: res.ok,
          driver,
          message: res.message,
        };
      }
      return { ok: true, driver };
    }
  }
}

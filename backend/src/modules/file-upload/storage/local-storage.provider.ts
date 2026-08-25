import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type {
  SignedUploadDescriptor,
  StorageProviderInterface,
  StoredObjectDescriptor,
} from './storage.provider';
import { UPLOAD_ROOT } from '../constants/file-upload.constants';

@Injectable()
export class LocalStorageProvider implements StorageProviderInterface {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadRoot: string;

  constructor() {
    this.uploadRoot = path.resolve(UPLOAD_ROOT);
    if (!fs.existsSync(this.uploadRoot)) {
      fs.mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  private resolveSafePath(key: string): string {
    const fullPath = path.resolve(this.uploadRoot, key);
    if (!fullPath.startsWith(this.uploadRoot)) {
      throw new BadRequestException('Path traversal attempt detected');
    }
    return fullPath;
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType?: string;
  }): Promise<StoredObjectDescriptor> {
    const safePath = this.resolveSafePath(input.key);
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(safePath, input.body);
    return {
      key: input.key,
      url: `/api/files/local-object?key=${encodeURIComponent(input.key)}`,
    };
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const safePath = this.resolveSafePath(key);
      if (fs.existsSync(safePath)) {
        await fs.promises.unlink(safePath);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to delete local object ${key}: ${(error as Error).message}`,
      );
    }
  }

  async getSignedDownloadUrl(
    key: string,
    filename?: string,
    _expiresInSeconds?: number,
  ): Promise<string> {
    let url = `/api/files/local-object?key=${encodeURIComponent(key)}`;
    if (filename) {
      url += `&filename=${encodeURIComponent(filename)}`;
    }
    return url;
  }

  async getSignedUploadUrl(input: {
    key: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<SignedUploadDescriptor> {
    return {
      key: input.key,
      url: `/api/files/local-upload?key=${encodeURIComponent(input.key)}`,
    };
  }

  resolvePublicUrl(key: string): string | null {
    return `/api/files/local-object?key=${encodeURIComponent(key)}`;
  }

  async getObject(key: string): Promise<Buffer> {
    const safePath = this.resolveSafePath(key);
    if (!fs.existsSync(safePath)) {
      throw new NotFoundException(`Object not found: ${key}`);
    }
    return fs.promises.readFile(safePath);
  }
}

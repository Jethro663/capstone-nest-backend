import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Optional,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '../auth/decorators/public.decorator';
import { StorageService } from './storage/storage.service';
import { UPLOAD_ROOT } from './constants/file-upload.constants';

@Controller('internal/uploads')
export class InternalUploadsController {
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly storageService?: StorageService,
  ) {}

  private assertAuthorized(token?: string) {
    const sharedSecret =
      this.configService.get<string>('AI_SERVICE_SHARED_SECRET')?.trim() ?? '';

    if (!sharedSecret || token !== sharedSecret) {
      throw new ForbiddenException('Invalid internal service token');
    }
  }

  @Public()
  @Get('raw')
  async readUpload(
    @Query('path') requestedPath: string,
    @Headers('x-internal-service-token') token: string | undefined,
    @Res() res: Response,
  ) {
    this.assertAuthorized(token);

    const normalized = (requestedPath || '').trim();
    if (!normalized) {
      throw new NotFoundException('Upload path is required');
    }

    const uploadsRoot = path.resolve(UPLOAD_ROOT);
    const rootDirName = path.basename(uploadsRoot);
    const normalizedSlashes = normalized.replace(/\\/g, '/');
    const uploadRelativePath = normalizedSlashes
      .replace(/^\.\//, '')
      .replace(new RegExp(`^${rootDirName}/`), '')
      .replace(/^uploads\//, '');
    const absolutePath = path.isAbsolute(normalized)
      ? path.resolve(normalized)
      : path.resolve(uploadsRoot, uploadRelativePath);
    const relativeToUploads = path.relative(uploadsRoot, absolutePath);

    if (
      relativeToUploads.startsWith('..') ||
      path.isAbsolute(relativeToUploads)
    ) {
      throw new ForbiddenException('Upload path must stay inside uploads');
    }

    if (
      this.storageService &&
      (normalized.startsWith('s3://') ||
        (this.storageService.driver === 's3' && !fs.existsSync(absolutePath)))
    ) {
      let key = normalized.replace(/^s3:\/\//, '');
      const bucket =
        process.env.STORAGE_BUCKET ||
        process.env.AWS_S3_BUCKET ||
        'nexora-uploads';
      if (key.startsWith(`${bucket}/`)) {
        key = key.slice(bucket.length + 1);
      }
      key = key.replace(/^(\.\/)?uploads\//, '').replace(/^\.\//, '');
      const signedUrl = await this.storageService.getSignedDownloadUrl(key);
      res.redirect(302, signedUrl);
      return;
    }

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Upload file not found on disk');
    }

    res.sendFile(absolutePath);
  }
}

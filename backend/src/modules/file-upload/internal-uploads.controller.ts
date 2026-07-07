import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '../auth/decorators/public.decorator';
import { UPLOAD_ROOT } from './constants/file-upload.constants';

@Controller('internal/uploads')
export class InternalUploadsController {
  constructor(private readonly configService: ConfigService) {}

  private assertAuthorized(token?: string) {
    const sharedSecret =
      this.configService.get<string>('AI_SERVICE_SHARED_SECRET') ?? '';

    if (sharedSecret && token !== sharedSecret) {
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
      .replace(new RegExp(`^${rootDirName}\/`), '')
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

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Upload file not found on disk');
    }

    res.sendFile(absolutePath);
  }
}

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

    const absolutePath = path.resolve(normalized);
    const uploadsRoot = path.resolve('uploads');

    if (!absolutePath.startsWith(uploadsRoot)) {
      throw new ForbiddenException('Upload path must stay inside uploads');
    }

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Upload file not found on disk');
    }

    res.sendFile(absolutePath);
  }
}

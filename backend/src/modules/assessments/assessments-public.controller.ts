import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '../auth/decorators/public.decorator';

const IMAGE_UPLOAD_DEST = './uploads/question-images';

@Controller('assessments')
export class AssessmentsPublicController {
  @Public()
  @Get('questions/images/:filename')
  async serveQuestionImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const sanitized = path.basename(filename);
    const filePath = path.join(IMAGE_UPLOAD_DEST, sanitized);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Image not found');
    }

    return res.sendFile(path.resolve(filePath));
  }
}

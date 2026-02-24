import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { FileUploadService } from './file-upload.service';
import { PdfValidationPipe } from './pipes/pdf-validation.pipe';
import { UploadFileDto } from './dto/file-upload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  MAX_FILE_SIZE_BYTES,
  UPLOAD_DEST,
} from './constants/file-upload.constants';

// Multer disk-storage config ─────────────────────────────────────────────────
const multerOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      // Ensure the directory exists at runtime
      fs.mkdirSync(UPLOAD_DEST, { recursive: true });
      cb(null, UPLOAD_DEST);
    },
    filename: (_req, _file, cb) => {
      // Generate a collision-resistant name; extension is always .pdf
      cb(null, `${uuidv4()}_${Date.now()}.pdf`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 100 MB hard limit at multer level
    files: 1,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    // Coarse MIME pre-check (spoofable — PdfValidationPipe does the real check)
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false); // Reject silently; PdfValidationPipe will throw proper exception
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('File Uploads')
@ApiBearerAuth('token')
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  /**
   * POST /api/files/upload
   * Upload a PDF (teacher only). classId is required as a form field.
   */
  @Post('upload')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadFile(
    @UploadedFile(new PdfValidationPipe()) file: Express.Multer.File,
    @Body() body: UploadFileDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const record = await this.fileUploadService.saveFileRecord({
      teacherId: user.id,
      classId: body.classId,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      filePath: file.path,
    });

    return {
      success: true,
      message: 'PDF uploaded successfully',
      data: record,
    };
  }

  /**
   * GET /api/files
   * Admin → all files. Teacher → their own files.
   */
  @Get()
  @Roles('admin', 'teacher')
  async listFiles(
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const files = await this.fileUploadService.findAll(user);

    return {
      success: true,
      message: 'Files retrieved successfully',
      data: files,
      count: files.length,
    };
  }

  /**
   * GET /api/files/storage-summary
   * Admin only: total file count + storage size consumed.
   */
  @Get('storage-summary')
  @Roles('admin')
  async getStorageSummary() {
    const summary = await this.fileUploadService.getStorageSummary();

    return {
      success: true,
      message: 'Storage summary retrieved',
      data: summary,
    };
  }

  /**
   * GET /api/files/:id
   * Retrieve metadata for a single file. Teacher must own it.
   */
  @Get(':id')
  @Roles('admin', 'teacher')
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const file = await this.fileUploadService.findOne(id, user);

    return {
      success: true,
      message: 'File retrieved successfully',
      data: file,
    };
  }

  /**
   * GET /api/files/:id/download
   * Stream the PDF through the API — never exposes raw disk paths.
   * Teacher must own it; admin can always download.
   */
  @Get(':id/download')
  @Roles('admin', 'teacher')
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
    @Res() res: Response,
  ) {
    const filePath = await this.fileUploadService.getFilePath(id, user);

    // Resolve to an absolute path for sendFile
    const absolutePath = path.resolve(filePath);

    // Safety check: ensure the resolved path is still under uploads/pdfs
    const uploadsRoot = path.resolve(UPLOAD_DEST);
    if (!absolutePath.startsWith(uploadsRoot)) {
      res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Access denied',
      });
      return;
    }

    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'File not found on disk',
      });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${path.basename(absolutePath)}"`,
    );
    res.sendFile(absolutePath);
  }

  /**
   * DELETE /api/files/:id
   * Soft-delete. Teacher must own the file; admins can delete any.
   */
  @Delete(':id')
  @Roles('admin', 'teacher')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.fileUploadService.softDelete(id, user);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}

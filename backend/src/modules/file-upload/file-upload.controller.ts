import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Param,
  Body,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  MAX_FILE_SIZE_BYTES,
  UPLOAD_DEST,
} from './constants/file-upload.constants';
import {
  CreateLibraryFolderDto,
  FileQueryDto,
  FileScopeDto,
  UpdateFileMetadataDto,
  UpdateLibraryFolderDto,
  UploadFileDto,
} from './dto/file-upload.dto';

const multerOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOAD_DEST, { recursive: true });
      cb(null, UPLOAD_DEST);
    },
    filename: (_req, _file, cb) => {
      cb(null, `${uuidv4()}_${Date.now()}.pdf`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(null, false);
  },
};

@ApiTags('File Uploads')
@ApiBearerAuth('token')
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('upload')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadFile(
    @UploadedFile(new PdfValidationPipe()) file: Express.Multer.File,
    @Query() query: UploadFileDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const scope = query.scope ?? FileScopeDto.Private;

    const record = await this.fileUploadService.saveFileRecord(
      {
        teacherId: user.id,
        classId: query.classId,
        folderId: query.folderId,
        scope,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        filePath: path.posix.join('uploads', 'pdfs', file.filename),
      },
      user,
    );

    return {
      success: true,
      message: 'PDF uploaded successfully',
      data: record,
    };
  }

  @Get()
  @Roles(RoleName.Admin, RoleName.Teacher)
  async listFiles(
    @CurrentUser() user: { id: string; email: string; roles: string[] },
    @Query() query: FileQueryDto,
  ) {
    const files = await this.fileUploadService.findAll(user, query);

    return {
      success: true,
      message: 'Files retrieved successfully',
      data: files,
      count: files.length,
    };
  }

  @Get('folders')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async listFolders(
    @CurrentUser() user: { id: string; email: string; roles: string[] },
    @Query() query: FileQueryDto,
  ) {
    const folders = await this.fileUploadService.listFolders(user, query);

    return {
      success: true,
      message: 'Folders retrieved successfully',
      data: folders,
      count: folders.length,
    };
  }

  @Post('folders')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async createFolder(
    @Body() dto: CreateLibraryFolderDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const folder = await this.fileUploadService.createFolder(dto, user);

    return {
      success: true,
      message: 'Folder created successfully',
      data: folder,
    };
  }

  @Patch('folders/:id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLibraryFolderDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const folder = await this.fileUploadService.updateFolder(id, dto, user);

    return {
      success: true,
      message: 'Folder updated successfully',
      data: folder,
    };
  }

  @Delete('folders/:id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.OK)
  async deleteFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    await this.fileUploadService.deleteFolder(id, user);

    return {
      success: true,
      message: 'Folder deleted successfully',
    };
  }

  @Get('storage-summary')
  @Roles(RoleName.Admin)
  async getStorageSummary() {
    const summary = await this.fileUploadService.getStorageSummary();

    return {
      success: true,
      message: 'Storage summary retrieved',
      data: summary,
    };
  }

  @Get(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
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

  @Patch(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFileMetadataDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    const file = await this.fileUploadService.updateFileMetadata(id, dto, user);

    return {
      success: true,
      message: 'File updated successfully',
      data: file,
    };
  }

  @Get(':id/download')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
    @Res() res: Response,
  ) {
    const filePath = await this.fileUploadService.getFilePath(id, user);
    const absolutePath = path.resolve(filePath);
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

  @Delete(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
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

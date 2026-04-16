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
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { FileUploadService } from './file-upload.service';
import {
  getLibraryFileKind,
  LibraryFileValidationPipe,
} from './pipes/library-file-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
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
      const ext = path.extname(_file.originalname).toLowerCase();
      cb(null, `${uuidv4()}_${Date.now()}${ext}`);
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
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as any)) cb(null, true);
    else cb(null, false);
  },
};

@ApiTags('File Uploads')
@ApiBearerAuth('token')
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  private normalizeUser(user: any) {
    return {
      id: user?.userId ?? user?.id,
      email: user?.email ?? '',
      roles: Array.isArray(user?.roles) ? user.roles : [],
    };
  }

  private async computeContentHash(filePath: string) {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    return hash.digest('hex');
  }

  @Post('upload')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadFile(
    @UploadedFile(new LibraryFileValidationPipe()) file: Express.Multer.File,
    @Query() query: UploadFileDto,
    @CurrentUser() user: any,
  ) {
    const scope = query.scope ?? FileScopeDto.Private;
    const currentUser = this.normalizeUser(user);
    const fileKind = getLibraryFileKind(file);
    const contentHash = Buffer.isBuffer(file.buffer)
      ? createHash('sha256').update(file.buffer).digest('hex')
      : await this.computeContentHash(file.path);

    const record = await this.fileUploadService.saveFileRecord(
      {
        teacherId: currentUser.id,
        classId: query.classId,
        folderId: query.folderId,
        scope,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        filePath: path.posix.join('uploads', 'library', file.filename),
        subjectKey: query.subjectKey,
        gradeLevel: query.gradeLevel,
        teacherVisible: query.teacherVisible,
        contentHash,
        fileKind,
      },
      currentUser,
    );

    return {
      success: true,
      message: 'Library file uploaded successfully',
      data: record,
    };
  }

  @Get()
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async listFiles(@CurrentUser() user: any, @Query() query: FileQueryDto = {}) {
    const files = await this.fileUploadService.findAll(
      this.normalizeUser(user),
      query,
    );

    return {
      success: true,
      message: 'Files retrieved successfully',
      data: files.data,
      count: files.data.length,
      total: files.total,
      page: files.page,
      limit: files.limit,
      totalPages: files.totalPages,
    };
  }

  @Get('folders')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async listFolders(@CurrentUser() user: any, @Query() query: FileQueryDto) {
    const folders = await this.fileUploadService.listFolders(
      this.normalizeUser(user),
      query,
    );

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
    @CurrentUser() user: any,
  ) {
    const folder = await this.fileUploadService.createFolder(
      dto,
      this.normalizeUser(user),
    );

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
    @CurrentUser() user: any,
  ) {
    const folder = await this.fileUploadService.updateFolder(
      id,
      dto,
      this.normalizeUser(user),
    );

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
    @CurrentUser() user: any,
  ) {
    await this.fileUploadService.deleteFolder(id, this.normalizeUser(user));

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
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const file = await this.fileUploadService.findOne(
      id,
      this.normalizeUser(user),
    );

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
    @CurrentUser() user: any,
  ) {
    const file = await this.fileUploadService.updateFileMetadata(
      id,
      dto,
      this.normalizeUser(user),
    );

    return {
      success: true,
      message: 'File updated successfully',
      data: file,
    };
  }

  @Get(':id/download')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const record = await this.fileUploadService.getFileForDownload(
      id,
      this.normalizeUser(user),
    );
    const filePath = record.filePath;
    const absolutePath = path.resolve(filePath);
    const uploadsRoot = path.resolve('uploads');

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

    res.setHeader('Content-Type', record.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${record.originalName.replace(/"/g, '')}"`,
    );
    res.sendFile(absolutePath);
  }

  @Post(':id/index/retry')
  @Roles(RoleName.Admin)
  async retryIndex(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const file = await this.fileUploadService.retryIndex(
      id,
      this.normalizeUser(user),
    );

    return {
      success: true,
      message: 'Library indexing queued',
      data: file,
    };
  }

  @Delete(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.fileUploadService.softDelete(id, this.normalizeUser(user));

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}

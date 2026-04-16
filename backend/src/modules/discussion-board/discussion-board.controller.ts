import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../../common/constants/role.constants';
import { DiscussionBoardService } from './discussion-board.service';
import {
  CreateDiscussionThreadDto,
  QueryDiscussionThreadsDto,
  UpdateDiscussionThreadDto,
} from './DTO/discussion-thread.dto';
import {
  CreateDiscussionCommentDto,
  SetDiscussionReactionDto,
} from './DTO/discussion-comment.dto';

const DISCUSSION_UPLOAD_DEST = './uploads/discussion-board';
const MAX_DISCUSSION_UPLOAD_SIZE = 20 * 1024 * 1024;

const threadAttachmentMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(DISCUSSION_UPLOAD_DEST, { recursive: true });
      cb(null, DISCUSSION_UPLOAD_DEST);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${uuidv4()}_${Date.now()}${ext}`);
    },
  }),
  limits: {
    fileSize: MAX_DISCUSSION_UPLOAD_SIZE,
    files: 1,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const mimeType = file.mimetype.toLowerCase();
    if (mimeType.startsWith('image/') || mimeType.includes('pdf')) {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
};

const commentImageMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(DISCUSSION_UPLOAD_DEST, { recursive: true });
      cb(null, DISCUSSION_UPLOAD_DEST);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${uuidv4()}_${Date.now()}${ext}`);
    },
  }),
  limits: {
    fileSize: MAX_DISCUSSION_UPLOAD_SIZE,
    files: 1,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (file.mimetype.toLowerCase().startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
};

@ApiTags('Discussion Board')
@ApiBearerAuth('token')
@Controller('classes/:classId/discussion-threads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscussionBoardController {
  constructor(
    private readonly discussionBoardService: DiscussionBoardService,
  ) {}

  private sendFileResponse(
    res: Response,
    file: { filePath: string; mimeType: string; originalName: string },
    disposition: 'inline' | 'attachment',
  ) {
    const absolutePath = path.resolve(file.filePath);
    const uploadsRoot = path.resolve('uploads');

    if (!absolutePath.startsWith(uploadsRoot)) {
      throw new BadRequestException('Invalid file path.');
    }

    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException('File not found on disk.');
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${file.originalName.replace(/"/g, '')}"`,
    );
    return res.sendFile(absolutePath);
  }

  @Post('uploads')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', threadAttachmentMulterOptions))
  async uploadThreadAttachment(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Attachment file is required.');
    }

    const data = await this.discussionBoardService.uploadThreadAttachmentFile(
      classId,
      user.userId,
      user.roles,
      file,
    );

    return {
      success: true,
      message: 'Discussion thread attachment uploaded.',
      data,
    };
  }

  @Post(':threadId/comments/uploads')
  @Roles(RoleName.Admin, RoleName.Student)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', commentImageMulterOptions))
  async uploadCommentImage(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Comment image file is required.');
    }

    const data = await this.discussionBoardService.uploadCommentImageFile(
      classId,
      threadId,
      user.userId,
      user.roles,
      file,
    );

    return {
      success: true,
      message: 'Discussion comment image uploaded.',
      data,
    };
  }

  @Post()
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  async createThread(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: CreateDiscussionThreadDto,
  ) {
    const data = await this.discussionBoardService.createThread(
      classId,
      user.userId,
      user.roles,
      dto,
    );

    return {
      success: true,
      message: 'Discussion thread created.',
      data,
    };
  }

  @Get()
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async listThreads(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Query() query: QueryDiscussionThreadsDto,
  ) {
    return {
      success: true,
      message: 'Discussion threads retrieved.',
      data: await this.discussionBoardService.listThreads(
        classId,
        user.userId,
        user.roles,
        query,
      ),
    };
  }

  @Get(':threadId')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getThread(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.discussionBoardService.getThread(
      classId,
      threadId,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Discussion thread retrieved.',
      data,
    };
  }

  @Patch(':threadId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateThread(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: UpdateDiscussionThreadDto,
  ) {
    const data = await this.discussionBoardService.updateThread(
      classId,
      threadId,
      user.userId,
      user.roles,
      dto,
    );

    return {
      success: true,
      message: 'Discussion thread updated.',
      data,
    };
  }

  @Post(':threadId/publish')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async publishThread(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.discussionBoardService.publishThread(
      classId,
      threadId,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Discussion thread published.',
      data,
    };
  }

  @Post(':threadId/close')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async closeThread(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.discussionBoardService.closeThread(
      classId,
      threadId,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Discussion thread closed.',
      data,
    };
  }

  @Post(':threadId/reopen')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async reopenThread(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.discussionBoardService.reopenThread(
      classId,
      threadId,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Discussion thread reopened.',
      data,
    };
  }

  @Delete(':threadId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async archiveThread(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.discussionBoardService.archiveThread(
      classId,
      threadId,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Discussion thread archived.',
      data,
    };
  }

  @Post(':threadId/comments')
  @Roles(RoleName.Admin, RoleName.Student)
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: CreateDiscussionCommentDto,
  ) {
    const data = await this.discussionBoardService.createComment(
      classId,
      threadId,
      user.userId,
      user.roles,
      dto,
    );

    return {
      success: true,
      message: 'Discussion comment created.',
      data,
    };
  }

  @Delete(':threadId/comments/:commentId')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async deleteComment(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.discussionBoardService.deleteComment(
      classId,
      threadId,
      commentId,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Discussion comment deleted.',
      data,
    };
  }

  @Put(':threadId/comments/:commentId/reaction')
  @Roles(RoleName.Admin, RoleName.Student)
  async setReaction(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: SetDiscussionReactionDto,
  ) {
    const data = await this.discussionBoardService.setCommentReaction(
      classId,
      threadId,
      commentId,
      user.userId,
      user.roles,
      dto,
    );

    return {
      success: true,
      message: 'Discussion comment reaction updated.',
      data,
    };
  }

  @Delete(':threadId/comments/:commentId/reaction')
  @Roles(RoleName.Admin, RoleName.Student)
  async removeReaction(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.discussionBoardService.removeCommentReaction(
      classId,
      threadId,
      commentId,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Discussion comment reaction removed.',
      data,
    };
  }

  @Get(':threadId/attachments/:attachmentId/inline')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async openThreadAttachmentInline(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Res() res: Response,
  ) {
    const file = await this.discussionBoardService.getThreadAttachmentFile(
      classId,
      threadId,
      attachmentId,
      user.userId,
      user.roles,
      'inline',
    );
    return this.sendFileResponse(res, file, 'inline');
  }

  @Get(':threadId/attachments/:attachmentId/download')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async downloadThreadAttachment(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Res() res: Response,
  ) {
    const file = await this.discussionBoardService.getThreadAttachmentFile(
      classId,
      threadId,
      attachmentId,
      user.userId,
      user.roles,
      'download',
    );
    return this.sendFileResponse(res, file, 'attachment');
  }

  @Get(':threadId/comments/:commentId/attachments/:attachmentId/inline')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async openCommentAttachmentInline(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Res() res: Response,
  ) {
    const file = await this.discussionBoardService.getCommentAttachmentFile(
      classId,
      threadId,
      commentId,
      attachmentId,
      user.userId,
      user.roles,
      'inline',
    );
    return this.sendFileResponse(res, file, 'inline');
  }

  @Get(':threadId/comments/:commentId/attachments/:attachmentId/download')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async downloadCommentAttachment(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Res() res: Response,
  ) {
    const file = await this.discussionBoardService.getCommentAttachmentFile(
      classId,
      threadId,
      commentId,
      attachmentId,
      user.userId,
      user.roles,
      'download',
    );
    return this.sendFileResponse(res, file, 'attachment');
  }
}

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TeacherProfilesService } from './teacher-profiles.service';
import { UpdateTeacherProfileDto } from './DTO/update-teacher-profile.dto';

type AuthUser = {
  userId: string;
  roles?: string[];
};

const AVATAR_UPLOAD_DEST = './uploads/profile-pictures';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

@ApiTags('Teacher Profiles')
@ApiBearerAuth('token')
@Controller('teacher-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherProfilesController {
  constructor(
    private readonly teacherProfilesService: TeacherProfilesService,
  ) {}

  @Get('me')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getMyProfile(@CurrentUser() user: AuthUser) {
    const data = await this.teacherProfilesService.findByUserId(user.userId);
    return { success: true, data: data ?? null };
  }

  @Get(':userId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getByUserId(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const primaryRole = user.roles?.[0];
    if (primaryRole !== 'admin' && user.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this profile');
    }

    const data = await this.teacherProfilesService.findByUserId(userId);
    return { success: true, data: data ?? null };
  }

  @Put(':userId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async updateByUserId(
    @Param('userId') userId: string,
    @Body() dto: UpdateTeacherProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    const primaryRole = user.roles?.[0];
    if (primaryRole !== 'admin' && user.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this profile');
    }

    const data = await this.teacherProfilesService.updateProfile(
      userId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );
    return {
      success: true,
      message: 'Teacher profile updated successfully',
      data,
    };
  }

  @Post('me/avatar')
  @Roles(RoleName.Teacher)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(AVATAR_UPLOAD_DEST, { recursive: true });
          cb(null, AVATAR_UPLOAD_DEST);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}_${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_AVATAR_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only JPEG, PNG, GIF and WebP images are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadMyAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const profilePicture = `/api/profiles/images/${file.filename}`;
    const profile = await this.teacherProfilesService.updateProfile(
      user.userId,
      {
        profilePicture,
      },
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Teacher profile picture updated successfully',
      data: {
        profile,
        profilePicture,
      },
    };
  }
}

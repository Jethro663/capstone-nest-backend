import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Put,
  ForbiddenException,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './DTO/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

const AVATAR_UPLOAD_DEST = './uploads/profile-pictures';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

@ApiTags('Profiles')
@ApiBearerAuth('token')
@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  // Get current user's profile
  @Get('me')
  @Roles(RoleName.Student, RoleName.Teacher, RoleName.Admin)
  async getMyProfile(@CurrentUser() user: any) {
    const profile = await this.profilesService.findByUserId(user.userId);
    return {
      success: true,
      data: profile || null,
    };
  }

  @Get('me/academic-summary')
  @Roles(RoleName.Student)
  async getMyAcademicSummary(@CurrentUser() user: any) {
    const data = await this.profilesService.getAcademicSummary(user.userId);
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Get('images/:filename')
  async serveProfileImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const sanitized = path.basename(filename);
    const filePath = path.join(AVATAR_UPLOAD_DEST, sanitized);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Image not found');
    }

    return res.sendFile(path.resolve(filePath));
  }

  // Get profile by userId — admin or owner only
  @Get(':userId')
  @Roles(RoleName.Admin, RoleName.Student, RoleName.Teacher)
  async getProfileByUserId(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    const primaryRole = user.roles?.[0];
    // Allow admins or the owner to view the profile
    if (primaryRole !== 'admin' && user.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this profile');
    }

    const profile = await this.profilesService.findByUserId(userId);
    return {
      success: true,
      data: profile || null,
    };
  }

  // Admin: create profile for a user
  @Post('create')
  @Roles(RoleName.Admin)
  async createProfile(@Body() dto: UpdateProfileDto & { userId: string }) {
    const { userId, ...data } = dto as any;
    const profile = await this.profilesService.createProfile(userId, data);
    return {
      success: true,
      message: 'Profile created successfully',
      data: profile,
    };
  }

  // Update profile - admins can update any; users can update their own
  @Put('update/:userId')
  @Roles(RoleName.Student, RoleName.Teacher, RoleName.Admin)
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: any,
  ) {
    // Allow only admins or the owner to update
    const primaryRole = user.roles?.[0];
    if (primaryRole !== 'admin' && user.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this profile');
    }

    const updated = await this.profilesService.updateProfile(userId, dto);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    };
  }

  @Post('me/avatar')
  @Roles(RoleName.Student)
  @ApiConsumes('multipart/form-data')
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
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const profilePicture = `/api/profiles/images/${file.filename}`;
    const updated = await this.profilesService.updateProfile(user.userId, {
      profilePicture,
    });

    return {
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profile: updated,
        profilePicture,
      },
    };
  }
}

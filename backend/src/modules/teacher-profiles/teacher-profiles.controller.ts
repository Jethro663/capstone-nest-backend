import {
  Controller,
  Get,
  Param,
  Put,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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

    const data = await this.teacherProfilesService.updateProfile(userId, dto);
    return {
      success: true,
      message: 'Teacher profile updated successfully',
      data,
    };
  }
}

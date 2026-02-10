import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Put,
  ForbiddenException,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './DTO/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Profiles')
@ApiBearerAuth('token')
@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  // Get current user's profile
  @Get('me')
  @Roles('student', 'teacher', 'admin')
  async getMyProfile(@CurrentUser() user: any) {
    const profile = await this.profilesService.findByUserId(user.userId);
    console.log(profile);
    return {
      success: true,
      data: profile || null,
    };
  }

  // Get profile by userId — admin or owner only
  @Get(':userId')
  @Roles('admin', 'student', 'teacher')
  async getProfileByUserId(@Param('userId') userId: string, @CurrentUser() user: any) {
    const primaryRole = user.roles?.[0];
    console.log('Requested profile for userId:', userId);
    console.log('Current user:', user);
    console.log('userId', user.userId);
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
  @Roles('admin')
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
  @Roles('student', 'teacher', 'admin')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: any,
  ) {
    // Allow only admins or the owner to update
    const primaryRole = user.roles?.[0];
    if (primaryRole !== 'admin' && user.id !== userId) {
      throw new ForbiddenException('Not authorized to update this profile');
    }

    const updated = await this.profilesService.updateProfile(userId, dto);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    };
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '../../common/constants/role.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnnouncementsService } from './announcements.service';
import { QueryTeacherAnnouncementsDto } from './DTO/query-announcements.dto';

@ApiTags('Announcements')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teacher/announcements')
export class TeacherAnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles(RoleName.Teacher)
  @ApiOperation({
    summary: 'List announcements across classes assigned to the teacher',
  })
  async findAll(
    @Query() query: QueryTeacherAnnouncementsDto,
    @CurrentUser() user: { userId: string },
  ) {
    const data = await this.announcementsService.findTeacherFeed(
      user.userId,
      query,
    );

    return {
      success: true,
      message: 'Teacher announcements retrieved.',
      data,
    };
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '../../common/constants/role.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnnouncementsService } from './announcements.service';
import { QueryAdminAnnouncementsDto } from './DTO/query-announcements.dto';

@ApiTags('Announcements')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/announcements')
export class AdminAnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles(RoleName.Admin)
  @ApiOperation({
    summary: 'List a bounded announcement page across all classes',
  })
  async findAll(
    @Query() query: QueryAdminAnnouncementsDto,
    @CurrentUser() user: { userId: string },
  ) {
    const page = await this.announcementsService.findAdminFeed(
      user.userId,
      query,
    );
    return {
      success: true,
      message: 'Administrator announcements retrieved.',
      data: page.items,
      page: page.page,
      limit: page.limit,
      total: page.total,
      totalPages: page.totalPages,
    };
  }
}

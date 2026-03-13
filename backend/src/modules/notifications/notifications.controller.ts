import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from '../../common/constants/role.constants';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './DTO/query-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(RoleName.Teacher, RoleName.Student, RoleName.Admin)
  @ApiOperation({
    summary: 'Get paginated notification inbox for the current user',
  })
  async findAll(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryNotificationsDto,
  ) {
    const data = await this.notificationsService.findByUser(user.userId, query);
    return { success: true, message: 'Notifications retrieved.', data };
  }

  @Get('unread-count')
  @Roles(RoleName.Teacher, RoleName.Student, RoleName.Admin)
  @ApiOperation({
    summary: 'Get unread notification count for the current user',
  })
  async getUnreadCount(@CurrentUser() user: { userId: string }) {
    const count = await this.notificationsService.getUnreadCount(user.userId);
    return {
      success: true,
      message: 'Unread count retrieved.',
      data: { count },
    };
  }

  @Patch('read-all')
  @Roles(RoleName.Teacher, RoleName.Student, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all notifications as read for the current user',
  })
  async markAllRead(@CurrentUser() user: { userId: string }) {
    const data = await this.notificationsService.markAllRead(user.userId);
    return {
      success: true,
      message: 'All notifications marked as read.',
      data,
    };
  }

  @Patch(':id/read')
  @Roles(RoleName.Teacher, RoleName.Student, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', type: String })
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const data = await this.notificationsService.markRead(id, user.userId);
    return { success: true, message: 'Notification marked as read.', data };
  }
}

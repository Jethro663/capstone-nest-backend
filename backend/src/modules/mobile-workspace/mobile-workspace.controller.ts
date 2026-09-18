import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '../../common/constants/role.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MobileCalendarQueryDto } from './dto/mobile-calendar-query.dto';
import { MobileWorkspaceService } from './mobile-workspace.service';

@ApiTags('Mobile workspace')
@ApiBearerAuth('token')
@Controller('mobile-workspace')
export class MobileWorkspaceController {
  constructor(private readonly service: MobileWorkspaceService) {}

  @Get('student/overview')
  @Roles(RoleName.Student)
  @ApiOperation({ summary: 'Get the bounded student mobile course overview' })
  async studentOverview(@CurrentUser() user: { userId: string }) {
    return {
      success: true,
      data: await this.service.getStudentOverview(user.userId),
    };
  }

  @Get('teacher/overview')
  @Roles(RoleName.Teacher)
  @ApiOperation({ summary: 'Get the bounded teacher mobile home overview' })
  async teacherOverview(@CurrentUser() user: { userId: string }) {
    return {
      success: true,
      data: await this.service.getTeacherOverview(user.userId),
    };
  }

  @Get('teacher/library-index')
  @Roles(RoleName.Teacher)
  @ApiOperation({ summary: 'Get the bounded teacher mobile module index' })
  async teacherLibraryIndex(@CurrentUser() user: { userId: string }) {
    return {
      success: true,
      data: await this.service.getTeacherLibraryIndex(user.userId),
    };
  }

  @Get('student/calendar')
  @Roles(RoleName.Student)
  @ApiOperation({ summary: 'Get a bounded student mobile calendar window' })
  async studentCalendar(
    @CurrentUser() user: { userId: string },
    @Query() query: MobileCalendarQueryDto,
  ) {
    return {
      success: true,
      data: await this.service.getCalendar(user.userId, 'student', query),
    };
  }

  @Get('teacher/calendar')
  @Roles(RoleName.Teacher)
  @ApiOperation({ summary: 'Get a bounded teacher mobile calendar window' })
  async teacherCalendar(
    @CurrentUser() user: { userId: string },
    @Query() query: MobileCalendarQueryDto,
  ) {
    return {
      success: true,
      data: await this.service.getCalendar(user.userId, 'teacher', query),
    };
  }
}

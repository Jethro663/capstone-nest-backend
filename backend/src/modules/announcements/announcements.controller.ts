import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleName } from '../../common/constants/role.constants';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './DTO/create-announcement.dto';
import { UpdateAnnouncementDto } from './DTO/update-announcement.dto';
import { QueryAnnouncementsDto } from './DTO/query-announcements.dto';

@ApiTags('Announcements')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes/:classId/announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // ─── Teacher: create ────────────────────────────────────────────────────────

  @Post()
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Teacher posts a new announcement to a class' })
  @ApiParam({ name: 'classId', type: String })
  async create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.announcementsService.create(
      classId,
      user.userId,
      dto,
      user.roles.includes(RoleName.Admin),
    );
    return { success: true, message: 'Announcement created.', data };
  }

  // ─── Shared: list ───────────────────────────────────────────────────────────

  @Get()
  @Roles(RoleName.Teacher, RoleName.Student, RoleName.Admin)
  @ApiOperation({ summary: 'List announcements for a class' })
  @ApiParam({ name: 'classId', type: String })
  async findAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: QueryAnnouncementsDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const isTeacher =
      user.roles.includes(RoleName.Teacher) ||
      user.roles.includes(RoleName.Admin);
    const data = await this.announcementsService.findAllByClass(
      classId,
      user.userId,
      isTeacher,
      query,
    );
    return { success: true, message: 'Announcements retrieved.', data };
  }

  // ─── Shared: get one ────────────────────────────────────────────────────────

  @Get(':id')
  @Roles(RoleName.Teacher, RoleName.Student, RoleName.Admin)
  @ApiOperation({ summary: 'Get a single announcement' })
  @ApiParam({ name: 'classId', type: String })
  @ApiParam({ name: 'id', type: String })
  async findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const isTeacher =
      user.roles.includes(RoleName.Teacher) ||
      user.roles.includes(RoleName.Admin);
    const data = await this.announcementsService.findOne(
      classId,
      id,
      isTeacher,
    );
    return { success: true, message: 'Announcement retrieved.', data };
  }

  // ─── Teacher: update ────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Teacher edits an announcement' })
  @ApiParam({ name: 'classId', type: String })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.announcementsService.update(
      classId,
      id,
      user.userId,
      dto,
      user.roles.includes(RoleName.Admin),
    );
    return { success: true, message: 'Announcement updated.', data };
  }

  // ─── Teacher: soft-delete ───────────────────────────────────────────────────

  @Delete(':id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teacher archives (soft-deletes) an announcement' })
  @ApiParam({ name: 'classId', type: String })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.announcementsService.remove(
      classId,
      id,
      user.userId,
      user.roles.includes(RoleName.Admin),
    );
    return { success: true, ...data };
  }
}

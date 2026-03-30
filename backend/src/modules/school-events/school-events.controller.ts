import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '../../common/constants/role.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSchoolEventDto } from './DTO/create-school-event.dto';
import { QuerySchoolEventsDto } from './DTO/query-school-events.dto';
import { UpdateSchoolEventDto } from './DTO/update-school-event.dto';
import { SchoolEventsService } from './school-events.service';

@ApiTags('School Events')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('school-events')
export class SchoolEventsController {
  constructor(private readonly schoolEventsService: SchoolEventsService) {}

  @Get()
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  @ApiOperation({ summary: 'List school events by school year or date range' })
  async findAll(@Query() query: QuerySchoolEventsDto) {
    const data = await this.schoolEventsService.findAll(query);
    return { success: true, message: 'School events retrieved.', data };
  }

  @Post()
  @Roles(RoleName.Admin)
  @ApiOperation({ summary: 'Create a school event (admin only)' })
  async create(
    @Body() dto: CreateSchoolEventDto,
    @CurrentUser() user: { userId: string },
  ) {
    const data = await this.schoolEventsService.create(dto, user.userId);
    return { success: true, message: 'School event created.', data };
  }

  @Patch(':id')
  @Roles(RoleName.Admin)
  @ApiOperation({ summary: 'Update a school event (admin only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolEventDto,
    @CurrentUser() user: { userId: string },
  ) {
    const data = await this.schoolEventsService.update(id, dto, user.userId);
    return { success: true, message: 'School event updated.', data };
  }

  @Delete(':id')
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a school event (admin only)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    const data = await this.schoolEventsService.remove(id, user.userId);
    return { success: true, ...data };
  }
}

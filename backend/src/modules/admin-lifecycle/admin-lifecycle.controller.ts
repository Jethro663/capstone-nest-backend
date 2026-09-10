import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ExecuteClassLifecycleDto,
  ExecutePurgeLifecycleDto,
  ExecuteSectionLifecycleDto,
  ExecuteStudentLifecycleDto,
  PreviewClassLifecycleDto,
  PreviewPurgeLifecycleDto,
  PreviewSectionLifecycleDto,
  PreviewStudentLifecycleDto,
} from './DTO/admin-lifecycle.dto';
import { AdminLifecycleService } from './admin-lifecycle.service';

type Actor = { userId: string; roles: string[] };

@Controller('admin/lifecycle')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class AdminLifecycleController {
  constructor(private readonly lifecycle: AdminLifecycleService) {}

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }

  @Post('students/preview')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async previewStudent(@Body() dto: PreviewStudentLifecycleDto) {
    return this.response(
      'Student lifecycle preview generated',
      await this.lifecycle.previewStudent(dto),
    );
  }

  @Post('students/execute')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async executeStudent(
    @Body() dto: ExecuteStudentLifecycleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Student lifecycle operation completed',
      await this.lifecycle.executeStudent(dto, actor.userId),
    );
  }

  @Post('classes/preview')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async previewClass(@Body() dto: PreviewClassLifecycleDto) {
    return this.response(
      'Class lifecycle preview generated',
      await this.lifecycle.previewClass(dto),
    );
  }

  @Post('classes/execute')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async executeClass(
    @Body() dto: ExecuteClassLifecycleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Class lifecycle operation completed',
      await this.lifecycle.executeClass(dto, actor.userId),
    );
  }

  @Post('sections/preview')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async previewSection(@Body() dto: PreviewSectionLifecycleDto) {
    return this.response(
      'Section lifecycle preview generated',
      await this.lifecycle.previewSection(dto),
    );
  }

  @Post('sections/execute')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async executeSection(
    @Body() dto: ExecuteSectionLifecycleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Section lifecycle operation completed',
      await this.lifecycle.executeSection(dto, actor.userId),
    );
  }

  @Post('purge/preview')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async previewPurge(@Body() dto: PreviewPurgeLifecycleDto) {
    return this.response(
      'Permanent deletion preview generated',
      await this.lifecycle.previewPurge(dto),
    );
  }

  @Post('purge/execute')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async executePurge(
    @Body() dto: ExecutePurgeLifecycleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Permanent deletion operation completed',
      await this.lifecycle.executePurge(dto, actor.userId),
    );
  }

  @Get('operations/:id')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async operation(@Param('id', ParseUUIDPipe) id: string) {
    return this.response(
      'Lifecycle operation retrieved',
      await this.lifecycle.getOperation(id),
    );
  }
}

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
  ExecutePurgeBatchDto,
  ExecuteSectionLifecycleDto,
  ExecuteStudentLifecycleDto,
  PreviewClassLifecycleDto,
  PreviewPurgeLifecycleDto,
  PreviewPurgeBatchDto,
  PreviewSectionLifecycleDto,
  PreviewStudentLifecycleDto,
} from './DTO/admin-lifecycle.dto';
import { AdminLifecycleService } from './admin-lifecycle.service';

type Actor = { userId: string; roles: string[] };

@Controller('admin/maintenance')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class AdminMaintenanceLifecycleController {
  constructor(private readonly lifecycle: AdminLifecycleService) {}

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }

  @Post('students/preview')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async previewStudent(
    @Body() dto: PreviewStudentLifecycleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Student maintenance preview generated',
      await this.lifecycle.previewStudent(dto, actor.userId),
    );
  }

  @Post('students/execute')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async executeStudent(
    @Body() dto: ExecuteStudentLifecycleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Student maintenance operation completed',
      await this.lifecycle.executeStudent(dto, actor.userId, {
        requireMaintenance: true,
      }),
    );
  }

  @Post('classes/preview')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async previewClass(@Body() dto: PreviewClassLifecycleDto) {
    return this.response(
      'Class maintenance preview generated',
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
      'Class maintenance operation completed',
      await this.lifecycle.executeClass(dto, actor.userId, {
        requireMaintenance: true,
      }),
    );
  }

  @Post('sections/preview')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async previewSection(
    @Body() dto: PreviewSectionLifecycleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Section maintenance preview generated',
      await this.lifecycle.previewSection(dto, actor.userId),
    );
  }

  @Post('sections/execute')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async executeSection(
    @Body() dto: ExecuteSectionLifecycleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Section maintenance operation completed',
      await this.lifecycle.executeSection(dto, actor.userId, {
        requireMaintenance: true,
      }),
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
      await this.lifecycle.executePurge(dto, actor.userId, {
        requireMaintenance: true,
      }),
    );
  }

  @Post('purge/batch/preview')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async previewPurgeBatch(
    @Body() dto: PreviewPurgeBatchDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Permanent deletion batch preview generated',
      await this.lifecycle.previewPurgeBatch(dto, actor.userId),
    );
  }

  @Post('purge/batch/execute')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async executePurgeBatch(
    @Body() dto: ExecutePurgeBatchDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Permanent deletion batch accepted',
      await this.lifecycle.executePurgeBatch(dto, actor.userId),
    );
  }

  @Post('operations/:id/retry-cleanup')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async retryCleanup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Permanent deletion cleanup retry accepted',
      await this.lifecycle.retryErasureCleanup(id, actor.userId),
    );
  }

  @Get('operations/:id')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async operation(@Param('id', ParseUUIDPipe) id: string) {
    return this.response(
      'Maintenance operation retrieved',
      await this.lifecycle.getOperation(id),
    );
  }
}

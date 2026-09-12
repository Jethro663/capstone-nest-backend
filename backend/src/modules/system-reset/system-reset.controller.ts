import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ResetExecuteDto,
  ResetPolicyDto,
  ResetPreviewDto,
} from './system-reset.dto';
import { SystemResetService } from './system-reset.service';

const response = (message: string, data: unknown) => ({
  success: true,
  message,
  data,
});

@Controller('admin/system-reset')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class SystemResetController {
  constructor(private readonly reset: SystemResetService) {}
  @Get()
  async capability(@CurrentUser() actor: { userId: string }) {
    return response(
      'Reset capability retrieved',
      await this.reset.capability(actor.userId),
    );
  }
  @Get('policy')
  async policy(@Query() input: ResetPolicyDto) {
    return response(
      'Reset target policy retrieved',
      await this.reset.policy(input.schoolYear),
    );
  }
  @Post('preview')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async preview(
    @Body() input: ResetPreviewDto,
    @CurrentUser() actor: { userId: string },
  ) {
    return response(
      'Reset preview generated',
      await this.reset.preview(input, actor.userId),
    );
  }
  @Post('execute')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async execute(
    @Body() input: ResetExecuteDto,
    @CurrentUser() actor: { userId: string },
  ) {
    return response(
      'Reset request accepted',
      await this.reset.execute(input, actor.userId),
    );
  }
  @Get('operations/:id')
  async operation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: { userId: string },
  ) {
    return response(
      'Reset operation retrieved',
      await this.reset.operation(id, actor.userId),
    );
  }
}

@Controller('system-maintenance')
export class SystemMaintenanceController {
  constructor(private readonly reset: SystemResetService) {}
  @Get()
  @Public()
  async status() {
    return response(
      'Maintenance status retrieved',
      await this.reset.maintenance(),
    );
  }
}

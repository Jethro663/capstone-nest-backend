import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SystemCapabilitiesService } from './system-capabilities.service';
import type { SystemCapabilitiesActor } from './system-capabilities.types';

@Controller('system/capabilities')
export class SystemCapabilitiesController {
  constructor(private readonly systemCapabilities: SystemCapabilitiesService) {}

  @Get()
  async getCapabilities(@CurrentUser() actor: SystemCapabilitiesActor) {
    return {
      success: true,
      message: 'System capabilities retrieved',
      data: await this.systemCapabilities.getSnapshot(actor),
    };
  }
}

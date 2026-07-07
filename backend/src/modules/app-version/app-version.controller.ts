import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AppVersionService } from './app-version.service';
import { CheckAppVersionDto } from './dto/check-app-version.dto';

@ApiTags('App Version')
@Controller('app-version')
export class AppVersionController {
  constructor(private readonly appVersionService: AppVersionService) {}

  @Public()
  @Get('check')
  @ApiOperation({
    summary: 'Check if mobile app requires an OTA or APK update',
  })
  @ApiResponse({
    status: 200,
    description: 'App version check evaluated successfully',
  })
  async check(@Query() query: CheckAppVersionDto) {
    const data = await this.appVersionService.checkVersion(query);
    return {
      success: true,
      message: 'App version evaluated successfully.',
      data,
    };
  }
}

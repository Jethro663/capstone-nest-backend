import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AppVersionService } from './app-version.service';
import { CheckAppVersionDto } from './dto/check-app-version.dto';
import { CreateAppVersionDto } from './dto/create-app-version.dto';

@ApiTags('App Version')
@Controller('app-version')
export class AppVersionController {
  constructor(
    private readonly appVersionService: AppVersionService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('check')
  @Header('Cache-Control', 'no-store')
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

  @Public()
  @Post('register')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Register a new app version release (CI/CD internal endpoint, guarded by X-CI-Secret header)',
  })
  @ApiResponse({
    status: 200,
    description: 'App version registered or updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid CI secret',
  })
  @ApiResponse({
    status: 400,
    description: 'Version code regression or invalid payload',
  })
  async register(
    @Headers('x-ci-secret') ciSecret: string,
    @Body() dto: CreateAppVersionDto,
  ) {
    this.validateCiSecret(ciSecret);

    const data = await this.appVersionService.registerVersion(dto);
    return {
      success: true,
      message: `App version ${dto.nativeVersion} (code ${dto.versionCode}) registered for ${dto.platform}.`,
      data,
    };
  }

  /**
   * Validates the incoming X-CI-Secret header against the configured CI_ADMIN_SECRET.
   * Throws UnauthorizedException if missing, empty, or mismatched.
   */
  private validateCiSecret(headerValue: string | undefined): void {
    const expected =
      this.configService.get<string>('CI_ADMIN_SECRET')?.trim() ?? '';

    if (!expected) {
      throw new UnauthorizedException(
        'CI_ADMIN_SECRET is not configured on the server. Version registration is disabled.',
      );
    }

    if (!headerValue || headerValue.trim() !== expected) {
      throw new UnauthorizedException('Invalid or missing X-CI-Secret header.');
    }
  }
}

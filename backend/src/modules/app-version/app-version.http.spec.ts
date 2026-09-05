import {
  Controller,
  Get,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DatabaseService } from '../../database/database.service';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { AppVersionModule } from './app-version.module';

@Controller()
class LearningController {
  @Get('learning') learning() {
    return { success: true, data: 'lesson' };
  }
  @Get('health/live') health() {
    return { healthy: true };
  }
  @Get('auth/mobile/logout') logout() {
    return { success: true };
  }
}

describe('Android API update policy', () => {
  let app: INestApplication;
  const findFirst = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AppVersionModule,
      ],
      controllers: [LearningController],
    })
      .overrideProvider(DatabaseService)
      .useValue({ db: { query: { appVersions: { findFirst } } } })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue({
      platform: 'android',
      versionCode: 21,
      minSupportedVersionCode: 21,
      nativeVersion: '0.1.20',
      apkDownloadUrl: 'https://example.com/app.apk',
      requiresFullApk: true,
      apkSizeBytes: 100,
      apkSha256: 'a'.repeat(64),
    });
  });

  it('rejects outdated Android API access with a structured recovery response', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/learning')
      .set('X-App-Platform', 'android')
      .set('X-App-Version-Code', '20')
      .expect(403);
    expect(response.body).toMatchObject({
      success: false,
      code: 'APP_UPDATE_REQUIRED',
      data: { latestVersionCode: 21, updateType: 'apk_forced' },
    });
  });
  it.each(['21', '22'])('admits supported Android build %s', async (build) => {
    await request(app.getHttpServer())
      .get('/api/learning')
      .set('X-App-Platform', 'android')
      .set('X-App-Version-Code', build)
      .expect(200);
  });
  it.each(['', 'ios'])(
    'preserves platform %s without consulting Android policy',
    async (platform) => {
      await request(app.getHttpServer())
        .get('/api/learning')
        .set('X-App-Platform', platform)
        .set('X-App-Version-Code', '3')
        .expect(200);
      expect(findFirst).not.toHaveBeenCalled();
    },
  );
  it.each(['', '0', '-1', '20x', '1.5'])(
    'rejects identified Android with invalid build %s',
    async (build) => {
      const response = await request(app.getHttpServer())
        .get('/api/learning')
        .set('X-App-Platform', 'android')
        .set('X-App-Version-Code', build)
        .expect(403);
      expect(response.body.code).toBe('APP_UPDATE_REQUIRED');
    },
  );
  it.each([
    '/api/health/live',
    '/api/auth/mobile/logout',
    '/api/app-version/check?platform=android&currentVersionCode=20',
  ])('retains recovery access at %s', async (path) => {
    await request(app.getHttpServer())
      .get(path)
      .set('X-App-Platform', 'android')
      .set('X-App-Version-Code', '20')
      .expect(200);
  });
  it('fails closed for Android when policy cannot be verified', async () => {
    findFirst.mockRejectedValue(new Error('unavailable'));
    const response = await request(app.getHttpServer())
      .get('/api/learning')
      .set('X-App-Platform', 'android')
      .set('X-App-Version-Code', '21')
      .expect(503);
    expect(response.body.code).toBe('APP_UPDATE_CHECK_FAILED');
    expect(JSON.stringify(response.body)).not.toContain('unavailable');
  });

  it('prevents cached update-policy responses from retaining a revoked approval', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/app-version/check?platform=ios&currentVersionCode=3')
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });
});

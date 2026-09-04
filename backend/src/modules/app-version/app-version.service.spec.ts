import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../database/database.service';
import { AppVersionService } from './app-version.service';

describe('AppVersionService', () => {
  let service: AppVersionService;
  let mockDb: {
    query: {
      appVersions: {
        findFirst: jest.Mock;
      };
    };
  };

  beforeEach(async () => {
    mockDb = {
      query: {
        appVersions: {
          findFirst: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppVersionService,
        {
          provide: DatabaseService,
          useValue: { db: mockDb },
        },
      ],
    }).compile();

    service = module.get<AppVersionService>(AppVersionService);
  });

  it('should return fallback decision when no policy row exists', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue(null);

    const result = await service.checkVersion({
      platform: 'android',
      currentVersionCode: 1,
      currentOtaVersion: '1',
    });

    expect(result.updateType).toBe('none');
    expect(result.isForceUpdate).toBe(false);
  });

  it('should return forced APK update when client is below minSupportedVersionCode', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue({
      platform: 'android',
      versionCode: 10,
      minSupportedVersionCode: 5,
      nativeVersion: '1.2.0',
      otaRuntimeVersion: 'exposdk:54.0.0',
      apkDownloadUrl: 'https://example.com/app.apk',
      apkSha256: null,
      apkSizeBytes: null,
      isForceUpdate: false,
      requiresFullApk: false,
    });

    const result = await service.checkVersion({
      platform: 'android',
      currentVersionCode: 3,
      currentOtaVersion: 'exposdk:54.0.0',
    });

    expect(result.updateType).toBe('apk_forced');
    expect(result.isForceUpdate).toBe(true);
  });

  it('should return optional APK update when requiresFullApk is true and client versionCode is within supported window', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue({
      platform: 'android',
      versionCode: 10,
      minSupportedVersionCode: 5,
      nativeVersion: '1.2.0',
      otaRuntimeVersion: 'exposdk:54.0.0',
      apkDownloadUrl: 'https://example.com/app.apk',
      apkSha256: null,
      apkSizeBytes: null,
      isForceUpdate: false,
      requiresFullApk: true,
    });

    const result = await service.checkVersion({
      platform: 'android',
      currentVersionCode: 8,
      currentOtaVersion: 'exposdk:54.0.0',
    });

    expect(result.updateType).toBe('apk_optional');
    expect(result.isForceUpdate).toBe(false);
  });

  it.each([10, 11])(
    'should return none when same-or-newer client code %i reports a runtime mismatch',
    async (currentVersionCode) => {
      mockDb.query.appVersions.findFirst.mockResolvedValue({
        platform: 'android',
        versionCode: 10,
        minSupportedVersionCode: 5,
        nativeVersion: '1.2.0',
        otaRuntimeVersion: 'exposdk:54.0.0',
        apkDownloadUrl: 'https://example.com/app.apk',
        apkSha256: null,
        apkSizeBytes: null,
        isForceUpdate: false,
        requiresFullApk: false,
      });

      const result = await service.checkVersion({
        platform: 'android',
        currentVersionCode,
        currentOtaVersion: 'exposdk:53.0.0',
      });

      expect(result.updateType).toBe('none');
      expect(result.isForceUpdate).toBe(false);
    },
  );

  it('should return an optional APK update when an older client reports a runtime mismatch', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue({
      platform: 'android',
      versionCode: 11,
      minSupportedVersionCode: 5,
      nativeVersion: '1.3.0',
      otaRuntimeVersion: 'exposdk:54.0.0',
      apkDownloadUrl: 'https://example.com/app.apk',
      apkSha256: null,
      apkSizeBytes: null,
      isForceUpdate: false,
      requiresFullApk: false,
    });

    const result = await service.checkVersion({
      platform: 'android',
      currentVersionCode: 10,
      currentOtaVersion: 'exposdk:53.0.0',
    });

    expect(result.updateType).toBe('apk_optional');
    expect(result.isForceUpdate).toBe(false);
  });

  it('should return none when client version matches latest policy, letting OTA be checked on-device', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue({
      platform: 'android',
      versionCode: 10,
      minSupportedVersionCode: 5,
      nativeVersion: '1.2.0',
      otaRuntimeVersion: 'exposdk:54.0.0',
      apkDownloadUrl: 'https://example.com/app.apk',
      apkSha256: null,
      apkSizeBytes: null,
      isForceUpdate: false,
      requiresFullApk: false,
    });

    const result = await service.checkVersion({
      platform: 'android',
      currentVersionCode: 10,
      currentOtaVersion: 'exposdk:54.0.0',
    });

    expect(result.updateType).toBe('none');
    expect(result.isForceUpdate).toBe(false);
  });
});

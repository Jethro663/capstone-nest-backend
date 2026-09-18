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

  it('does not approve Android when no release policy exists', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue(null);

    await expect(
      service.checkVersion({
        platform: 'android',
        currentVersionCode: 1,
        currentOtaVersion: '1',
      }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('returns a forced iOS binary update from the stored iOS policy', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue({
      platform: 'ios',
      versionCode: 46,
      minSupportedVersionCode: 46,
      nativeVersion: '0.1.45',
      requiresFullApk: true,
      artifactKind: 'ipa',
      artifactDownloadUrl: 'https://example.com/nexora.ipa',
      artifactSha256: 'b'.repeat(64),
      artifactSizeBytes: 1234,
      distributionChannel: 'sidestore',
      sourceRevision: 'a'.repeat(40),
      apkDownloadUrl: 'https://example.com/nexora.ipa',
    });
    const result = await service.checkVersion({
      platform: 'ios',
      currentVersionCode: 45,
    });
    expect(result).toMatchObject({
      platform: 'ios',
      updateAction: 'binary_forced',
      updateType: 'none',
      isForceUpdate: true,
      artifactKind: 'ipa',
      artifactDownloadUrl: 'https://example.com/nexora.ipa',
      distributionChannel: 'sidestore',
    });
  });

  it('fails closed when the iOS release policy database lookup is unavailable', async () => {
    mockDb.query.appVersions.findFirst.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(
      service.checkVersion({ platform: 'ios', currentVersionCode: 3 }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('returns no iOS update when the installed build matches the policy', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue({
      platform: 'ios',
      versionCode: 46,
      minSupportedVersionCode: 45,
      nativeVersion: '0.1.45',
      requiresFullApk: true,
      artifactKind: 'ipa',
      artifactDownloadUrl: 'https://example.com/nexora.ipa',
      artifactSha256: 'b'.repeat(64),
      artifactSizeBytes: 1234,
      distributionChannel: 'sidestore',
      sourceRevision: 'a'.repeat(40),
      apkDownloadUrl: 'https://example.com/nexora.ipa',
    });

    await expect(
      service.checkVersion({ platform: 'ios', currentVersionCode: 46 }),
    ).resolves.toMatchObject({
      updateAction: 'none',
      updateType: 'none',
      isForceUpdate: false,
    });
  });

  it.each([undefined, 0, -1, 1.5])(
    'rejects unknown or invalid Android build %s',
    async (currentVersionCode) => {
      mockDb.query.appVersions.findFirst.mockResolvedValue({
        platform: 'android',
        versionCode: 20,
        minSupportedVersionCode: 20,
        nativeVersion: '0.1.19',
        apkDownloadUrl: 'https://example.com/app.apk',
      });
      await expect(
        service.checkVersion({ platform: 'android', currentVersionCode }),
      ).rejects.toMatchObject({ status: 400 });
    },
  );

  it('rejects a release floor above its target before writing', async () => {
    await expect(
      service.registerVersion({
        platform: 'android',
        versionCode: 20,
        minSupportedVersionCode: 21,
        nativeVersion: '0.1.19',
        apkDownloadUrl: 'https://example.com/app.apk',
      }),
    ).rejects.toThrow('cannot exceed');
  });

  it('rejects reusing an iOS build number for a different immutable artifact', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue({
      platform: 'ios',
      versionCode: 46,
      minSupportedVersionCode: 46,
      nativeVersion: '0.1.45',
      artifactKind: 'ipa',
      artifactDownloadUrl:
        'https://github.com/example/releases/download/ios-v46-aaaaaaaa/old.ipa',
      artifactSha256: 'a'.repeat(64),
      artifactSizeBytes: 1_000,
      sourceRevision: 'a'.repeat(40),
      distributionChannel: 'sidestore',
    });

    await expect(
      service.registerVersion({
        platform: 'ios',
        versionCode: 46,
        minSupportedVersionCode: 46,
        nativeVersion: '0.1.45',
        artifactKind: 'ipa',
        artifactDownloadUrl:
          'https://github.com/example/releases/download/ios-v46-bbbbbbbb/new.ipa',
        artifactSha256: 'b'.repeat(64),
        artifactSizeBytes: 1_001,
        sourceRevision: 'b'.repeat(40),
        distributionChannel: 'sidestore',
        requiresFullApk: true,
      }),
    ).rejects.toThrow('already belongs to a different immutable artifact');
  });

  it('does not advertise a same-build reinstall for a corrupt stored floor', async () => {
    mockDb.query.appVersions.findFirst.mockResolvedValue({
      platform: 'android',
      versionCode: 20,
      minSupportedVersionCode: 21,
    });
    await expect(
      service.checkVersion({ platform: 'android', currentVersionCode: 20 }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it.each([20, 21])(
    'admits build %i when the floor equals the latest published build',
    async (currentVersionCode) => {
      mockDb.query.appVersions.findFirst.mockResolvedValue({
        platform: 'android',
        versionCode: 20,
        minSupportedVersionCode: 20,
        nativeVersion: '0.1.19',
        requiresFullApk: true,
        otaRuntimeVersion: 'new',
        apkDownloadUrl: 'https://example.com/app.apk',
      });
      expect(
        await service.checkVersion({
          platform: 'android',
          currentVersionCode,
          currentOtaVersion: 'old',
        }),
      ).toMatchObject({ updateType: 'none', isForceUpdate: false });
    },
  );

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

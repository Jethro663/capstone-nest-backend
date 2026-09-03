import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppVersionDto } from './create-app-version.dto';

const validFullApk = {
  platform: 'android',
  versionCode: 15,
  minSupportedVersionCode: 1,
  nativeVersion: '0.1.14',
  otaRuntimeVersion: '0.1.14',
  apkDownloadUrl:
    'https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk',
  requiresFullApk: true,
  releaseNotes: 'Updater reliability hardening.',
  apkSha256: 'a'.repeat(64),
  apkSizeBytes: 40174571,
};

async function propertiesWithErrors(value: Record<string, unknown>) {
  const errors = await validate(plainToInstance(CreateAppVersionDto, value));
  return errors.map((error) => error.property);
}

describe('CreateAppVersionDto', () => {
  it('accepts complete full-APK metadata', async () => {
    await expect(propertiesWithErrors(validFullApk)).resolves.toEqual([]);
  });

  it('requires size and SHA-256 for a full APK', async () => {
    const { apkSha256: _sha, apkSizeBytes: _size, ...payload } = validFullApk;
    const properties = await propertiesWithErrors(payload);

    expect(properties).toEqual(
      expect.arrayContaining(['apkSha256', 'apkSizeBytes']),
    );
  });

  it('rejects malformed SHA-256 and a zero byte size', async () => {
    const properties = await propertiesWithErrors({
      ...validFullApk,
      apkSha256: 'not-a-sha256',
      apkSizeBytes: 0,
    });

    expect(properties).toEqual(
      expect.arrayContaining(['apkSha256', 'apkSizeBytes']),
    );
  });

  it('allows a non-APK policy to omit package metadata', async () => {
    const { apkSha256: _sha, apkSizeBytes: _size, ...payload } = validFullApk;

    await expect(
      propertiesWithErrors({ ...payload, requiresFullApk: false }),
    ).resolves.toEqual([]);
  });

  it('allows a non-APK policy to retain explicit null package metadata', async () => {
    await expect(
      propertiesWithErrors({
        ...validFullApk,
        requiresFullApk: false,
        apkSha256: null,
        apkSizeBytes: null,
      }),
    ).resolves.toEqual([]);
  });
});

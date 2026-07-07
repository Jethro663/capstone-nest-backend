import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { appVersions } from '../../drizzle/schema';
import { CheckAppVersionDto } from './dto/check-app-version.dto';

export type UpdateType = 'none' | 'apk_optional' | 'apk_forced';

export interface AppVersionDecision {
  platform: string;
  latestVersionCode: number;
  minSupportedVersionCode: number;
  latestNativeVersion: string;
  otaRuntimeVersion: string;
  apkDownloadUrl: string;
  apkSha256: string | null;
  apkSizeBytes: number | null;
  isForceUpdate: boolean;
  requiresFullApk: boolean;
  releaseNotes: string | null;
  updateType: UpdateType;
}

@Injectable()
export class AppVersionService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async checkVersion(query: CheckAppVersionDto): Promise<AppVersionDecision> {
    const platform = query.platform ?? 'android';
    const clientVersionCode = query.currentVersionCode ?? 0;
    const clientOtaVersion = query.currentOtaVersion ?? '';

    const policy = await this.db.query.appVersions.findFirst({
      where: eq(appVersions.platform, platform),
      orderBy: [desc(appVersions.versionCode)],
    });

    if (!policy) {
      return {
        platform,
        latestVersionCode: 1,
        minSupportedVersionCode: 1,
        latestNativeVersion: '0.1.0',
        otaRuntimeVersion: '1',
        apkDownloadUrl: '',
        apkSha256: null,
        apkSizeBytes: null,
        isForceUpdate: false,
        requiresFullApk: false,
        releaseNotes: null,
        updateType: 'none',
      };
    }

    let updateType: UpdateType = 'none';
    let isForceUpdate = false;

    const hasRuntimeMismatch =
      Boolean(clientOtaVersion) &&
      Boolean(policy.otaRuntimeVersion) &&
      clientOtaVersion !== policy.otaRuntimeVersion;

    // Evaluate binary / APK update requirements:
    // 1. Forced APK update if clientVersionCode < minSupportedVersionCode
    if (clientVersionCode > 0 && clientVersionCode < policy.minSupportedVersionCode) {
      updateType = 'apk_forced';
      isForceUpdate = true;
    }
    // 2. Optional APK update if:
    //    a) client is within supported window but behind latest versionCode AND this release mandates native binary upgrade (requiresFullApk is true), OR
    //    b) the client has an incompatible native runtime mismatch regardless of version lag
    else if ((clientVersionCode < policy.versionCode && policy.requiresFullApk) || hasRuntimeMismatch) {
      updateType = 'apk_optional';
      isForceUpdate = false;
    }
    // 3. Otherwise proceed normally and let OTA availability be checked on-device
    else {
      updateType = 'none';
      isForceUpdate = false;
    }

    return {
      platform: policy.platform,
      latestVersionCode: policy.versionCode,
      minSupportedVersionCode: policy.minSupportedVersionCode,
      latestNativeVersion: policy.nativeVersion,
      otaRuntimeVersion: policy.otaRuntimeVersion,
      apkDownloadUrl: policy.apkDownloadUrl,
      apkSha256: policy.apkSha256,
      apkSizeBytes: policy.apkSizeBytes,
      isForceUpdate,
      requiresFullApk: policy.requiresFullApk,
      releaseNotes: policy.releaseNotes,
      updateType,
    };
  }
}

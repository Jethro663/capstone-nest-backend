import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { appVersions } from '../../drizzle/schema';
import { CheckAppVersionDto } from './dto/check-app-version.dto';
import { CreateAppVersionDto } from './dto/create-app-version.dto';

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
  private readonly logger = new Logger(AppVersionService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Register or update a version release for a given platform.
   * Prevents version code regressions and upserts by platform + versionCode.
   */
  async registerVersion(dto: CreateAppVersionDto) {
    // Guard against version regression: new versionCode must be >= existing latest
    const existing = await this.db.query.appVersions.findFirst({
      where: eq(appVersions.platform, dto.platform),
      orderBy: [desc(appVersions.versionCode)],
    });

    if (existing && dto.versionCode < existing.versionCode) {
      throw new BadRequestException(
        `Version code regression: incoming ${dto.versionCode} is lower than current latest ${existing.versionCode} for platform "${dto.platform}".`,
      );
    }

    // Check if this exact platform + versionCode already exists (upsert)
    const duplicate = await this.db.query.appVersions.findFirst({
      where: and(
        eq(appVersions.platform, dto.platform),
        eq(appVersions.versionCode, dto.versionCode),
      ),
    });

    if (duplicate) {
      // Update existing record in-place
      const [updated] = await this.db
        .update(appVersions)
        .set({
          minSupportedVersionCode: dto.minSupportedVersionCode,
          nativeVersion: dto.nativeVersion,
          otaRuntimeVersion:
            dto.otaRuntimeVersion ?? duplicate.otaRuntimeVersion,
          apkDownloadUrl: dto.apkDownloadUrl,
          requiresFullApk: dto.requiresFullApk ?? duplicate.requiresFullApk,
          releaseNotes: dto.releaseNotes ?? duplicate.releaseNotes,
          apkSha256: dto.apkSha256 ?? duplicate.apkSha256,
          apkSizeBytes: dto.apkSizeBytes ?? duplicate.apkSizeBytes,
          updatedAt: new Date(),
        })
        .where(eq(appVersions.id, duplicate.id))
        .returning();

      this.logger.log(
        `Updated app version record for ${dto.platform} versionCode=${dto.versionCode}`,
      );
      return updated;
    }

    // Insert new version record
    const [created] = await this.db
      .insert(appVersions)
      .values({
        platform: dto.platform,
        versionCode: dto.versionCode,
        minSupportedVersionCode: dto.minSupportedVersionCode,
        nativeVersion: dto.nativeVersion,
        otaRuntimeVersion: dto.otaRuntimeVersion ?? '1',
        apkDownloadUrl: dto.apkDownloadUrl,
        requiresFullApk: dto.requiresFullApk ?? false,
        releaseNotes: dto.releaseNotes ?? null,
        apkSha256: dto.apkSha256 ?? null,
        apkSizeBytes: dto.apkSizeBytes ?? null,
      })
      .returning();

    this.logger.log(
      `Registered new app version for ${dto.platform} versionCode=${dto.versionCode} (${dto.nativeVersion})`,
    );
    return created;
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
    if (
      clientVersionCode > 0 &&
      clientVersionCode < policy.minSupportedVersionCode
    ) {
      updateType = 'apk_forced';
      isForceUpdate = true;
    }
    // 2. Optional APK update if:
    //    a) client is within supported window but behind latest versionCode AND this release mandates native binary upgrade (requiresFullApk is true), OR
    //    b) the client has an incompatible native runtime mismatch regardless of version lag
    else if (
      (clientVersionCode < policy.versionCode && policy.requiresFullApk) ||
      hasRuntimeMismatch
    ) {
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

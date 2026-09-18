import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { appVersions } from '../../drizzle/schema';
import { CheckAppVersionDto } from './dto/check-app-version.dto';
import { CreateAppVersionDto } from './dto/create-app-version.dto';

export type UpdateType = 'none' | 'apk_optional' | 'apk_forced';
export type UpdateAction = 'none' | 'binary_optional' | 'binary_forced';

export interface AppVersionDecision {
  platform: string;
  latestVersionCode: number;
  minSupportedVersionCode: number;
  latestNativeVersion: string;
  otaRuntimeVersion: string;
  artifactKind: string;
  artifactDownloadUrl: string;
  artifactSha256: string | null;
  artifactSizeBytes: number | null;
  sourceRevision: string | null;
  distributionChannel: string;
  apkDownloadUrl: string;
  apkSha256: string | null;
  apkSizeBytes: number | null;
  isForceUpdate: boolean;
  requiresFullApk: boolean;
  releaseNotes: string | null;
  updateAction: UpdateAction;
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
    if (dto.minSupportedVersionCode > dto.versionCode) {
      throw new BadRequestException(
        'Minimum supported build cannot exceed the released build.',
      );
    }
    const artifactKind =
      dto.artifactKind ?? (dto.platform === 'ios' ? 'ipa' : 'apk');
    const artifactDownloadUrl = dto.artifactDownloadUrl ?? dto.apkDownloadUrl;
    const artifactSha256 = dto.artifactSha256 ?? dto.apkSha256 ?? null;
    const artifactSizeBytes = dto.artifactSizeBytes ?? dto.apkSizeBytes ?? null;
    const distributionChannel =
      dto.distributionChannel ??
      (dto.platform === 'ios' ? 'sidestore' : 'website');
    if (!artifactDownloadUrl) {
      throw new BadRequestException('A release artifact URL is required.');
    }
    if (
      dto.requiresFullApk === true &&
      (artifactSha256 === null || artifactSizeBytes === null)
    ) {
      throw new BadRequestException(
        'A directly distributed binary requires its SHA-256 and byte size.',
      );
    }
    if (dto.platform === 'ios' && !dto.sourceRevision) {
      throw new BadRequestException(
        'An iOS release requires the exact source revision.',
      );
    }
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
    if (existing && dto.versionCode === existing.versionCode) {
      const existingArtifactUrl =
        existing.artifactDownloadUrl ?? existing.apkDownloadUrl;
      const existingArtifactSha =
        existing.artifactSha256 ?? existing.apkSha256 ?? null;
      const existingArtifactSize =
        existing.artifactSizeBytes ?? existing.apkSizeBytes ?? null;
      const reusesBuildForDifferentArtifact =
        existing.nativeVersion !== dto.nativeVersion ||
        (existing.artifactKind ?? (dto.platform === 'ios' ? 'ipa' : 'apk')) !==
          artifactKind ||
        existingArtifactUrl !== artifactDownloadUrl ||
        (existingArtifactSha !== null &&
          artifactSha256 !== null &&
          existingArtifactSha !== artifactSha256) ||
        (existingArtifactSize !== null &&
          artifactSizeBytes !== null &&
          existingArtifactSize !== artifactSizeBytes) ||
        (existing.sourceRevision != null &&
          dto.sourceRevision !== undefined &&
          existing.sourceRevision !== dto.sourceRevision);
      if (reusesBuildForDifferentArtifact) {
        throw new BadRequestException(
          `Version code ${dto.versionCode} already belongs to a different immutable artifact. Advance the build number.`,
        );
      }
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
          artifactKind,
          artifactDownloadUrl,
          artifactSha256,
          artifactSizeBytes,
          sourceRevision: dto.sourceRevision ?? duplicate.sourceRevision,
          distributionChannel,
          apkDownloadUrl: artifactDownloadUrl,
          requiresFullApk: dto.requiresFullApk ?? duplicate.requiresFullApk,
          releaseNotes: dto.releaseNotes ?? duplicate.releaseNotes,
          apkSha256: artifactSha256,
          apkSizeBytes: artifactSizeBytes,
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
        artifactKind,
        artifactDownloadUrl,
        artifactSha256,
        artifactSizeBytes,
        sourceRevision: dto.sourceRevision ?? null,
        distributionChannel,
        apkDownloadUrl: artifactDownloadUrl,
        requiresFullApk: dto.requiresFullApk ?? false,
        releaseNotes: dto.releaseNotes ?? null,
        apkSha256: artifactSha256,
        apkSizeBytes: artifactSizeBytes,
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

    if (!Number.isSafeInteger(clientVersionCode) || clientVersionCode < 1) {
      throw new BadRequestException(
        'A valid installed mobile build is required to check for updates.',
      );
    }

    let policy: typeof appVersions.$inferSelect | undefined;
    try {
      policy = await this.db.query.appVersions.findFirst({
        where: eq(appVersions.platform, platform),
        orderBy: [desc(appVersions.versionCode)],
      });
    } catch {
      throw new ServiceUnavailableException(
        `The ${platform} release policy is not available. Please retry.`,
      );
    }

    if (!policy) {
      throw new ServiceUnavailableException(
        `The ${platform} release policy is not available. Please retry.`,
      );
    }
    if (
      !Number.isSafeInteger(policy.versionCode) ||
      policy.versionCode < 1 ||
      !Number.isSafeInteger(policy.minSupportedVersionCode) ||
      policy.minSupportedVersionCode < 1 ||
      policy.minSupportedVersionCode > policy.versionCode
    ) {
      throw new ServiceUnavailableException(
        'The Android release policy could not be verified. Please retry.',
      );
    }

    let updateAction: UpdateAction = 'none';

    const hasRuntimeMismatch =
      Boolean(clientOtaVersion) &&
      Boolean(policy.otaRuntimeVersion) &&
      clientOtaVersion !== policy.otaRuntimeVersion;
    const isBehindLatestVersion = clientVersionCode < policy.versionCode;

    // Evaluate binary / APK update requirements:
    // 1. Forced APK update if clientVersionCode < minSupportedVersionCode
    if (
      clientVersionCode > 0 &&
      clientVersionCode < policy.minSupportedVersionCode
    ) {
      updateAction = 'binary_forced';
    }
    // 2. Optional APK update only when a newer binary exists and either the
    //    release requires a full APK or the client's OTA runtime is incompatible.
    else if (
      isBehindLatestVersion &&
      (policy.requiresFullApk || platform === 'ios' || hasRuntimeMismatch)
    ) {
      updateAction = 'binary_optional';
    }

    const isForceUpdate = updateAction === 'binary_forced';
    const updateType: UpdateType =
      platform !== 'android'
        ? 'none'
        : updateAction === 'binary_forced'
          ? 'apk_forced'
          : updateAction === 'binary_optional'
            ? 'apk_optional'
            : 'none';
    const artifactKind =
      policy.artifactKind ?? (platform === 'ios' ? 'ipa' : 'apk');
    const artifactDownloadUrl =
      policy.artifactDownloadUrl ?? policy.apkDownloadUrl ?? '';
    const artifactSha256 = policy.artifactSha256 ?? policy.apkSha256 ?? null;
    const artifactSizeBytes =
      policy.artifactSizeBytes ?? policy.apkSizeBytes ?? null;

    return {
      platform: policy.platform,
      latestVersionCode: policy.versionCode,
      minSupportedVersionCode: policy.minSupportedVersionCode,
      latestNativeVersion: policy.nativeVersion,
      otaRuntimeVersion: policy.otaRuntimeVersion,
      artifactKind,
      artifactDownloadUrl,
      artifactSha256,
      artifactSizeBytes,
      sourceRevision: policy.sourceRevision ?? null,
      distributionChannel:
        policy.distributionChannel ??
        (platform === 'ios' ? 'sidestore' : 'website'),
      apkDownloadUrl: platform === 'android' ? artifactDownloadUrl : '',
      apkSha256: platform === 'android' ? artifactSha256 : null,
      apkSizeBytes: platform === 'android' ? artifactSizeBytes : null,
      isForceUpdate,
      requiresFullApk: policy.requiresFullApk,
      releaseNotes: policy.releaseNotes,
      updateAction,
      updateType,
    };
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateAppVersionDto {
  @ApiProperty({
    example: 'android',
    enum: ['android', 'ios'],
    description: 'Target mobile platform',
  })
  @IsString()
  @IsIn(['android', 'ios'])
  platform: string;

  @ApiProperty({
    example: 8,
    description:
      'Integer version code for the new release (must be greater than current latest)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionCode: number;

  @ApiProperty({
    example: 6,
    description:
      'Minimum version code that clients must have; anything below triggers a forced update',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minSupportedVersionCode: number;

  @ApiProperty({
    example: '0.1.7',
    description: 'Human-readable native version string',
  })
  @IsString()
  @IsNotEmpty()
  nativeVersion: string;

  @ApiPropertyOptional({
    example: '1',
    description:
      'OTA runtime version boundary; mismatches trigger optional APK update',
  })
  @IsOptional()
  @IsString()
  otaRuntimeVersion?: string;

  @ApiProperty({
    example:
      'https://your-site.com/downloads/nexora-student-mobile-release.apk',
    description: 'Direct download URL for the APK or store link',
  })
  @IsOptional()
  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'apkDownloadUrl must be a valid URL' },
  )
  apkDownloadUrl?: string;

  @ApiPropertyOptional({
    example: 'ipa',
    enum: ['apk', 'ipa', 'store_link'],
    description: 'Platform-neutral release artifact kind',
  })
  @IsOptional()
  @IsString()
  @IsIn(['apk', 'ipa', 'store_link'])
  artifactKind?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/Nexora-iOS.ipa',
    description: 'HTTPS artifact or controlled distribution URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'artifactDownloadUrl must be a valid URL' },
  )
  artifactDownloadUrl?: string;

  @ApiPropertyOptional({
    example: 'sidestore',
    enum: ['website', 'sidestore', 'store'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['website', 'sidestore', 'store'])
  distributionChannel?: string;

  @ApiPropertyOptional({
    example: '0ea3122212cdd14053fba70d4e50b2d1f6b7a9a9',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{40}$/i, {
    message: 'sourceRevision must be a 40-character hexadecimal Git SHA',
  })
  sourceRevision?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Whether this release mandates a full native binary upgrade (not just OTA)',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  requiresFullApk?: boolean;

  @ApiPropertyOptional({
    example: 'Added PH phone hyper-validation & bug fixes',
    description: 'Release notes shown to users in the update dialog',
  })
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'SHA-256 hash of the APK file for integrity verification',
  })
  @ValidateIf(
    (dto: CreateAppVersionDto, value: unknown) =>
      (dto.requiresFullApk === true && !dto.artifactSha256) ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'apkSha256 must be a 64-character hexadecimal SHA-256 digest',
  })
  apkSha256?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Platform-neutral SHA-256 digest of the release artifact',
  })
  @ValidateIf(
    (dto: CreateAppVersionDto, value: unknown) =>
      (dto.requiresFullApk === true && !dto.apkSha256) ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'artifactSha256 must be a 64-character hexadecimal SHA-256 digest',
  })
  artifactSha256?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Size of the APK file in bytes for integrity verification',
  })
  @ValidateIf(
    (dto: CreateAppVersionDto, value: unknown) =>
      (dto.requiresFullApk === true && !dto.artifactSizeBytes) ||
      (value !== undefined && value !== null),
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  apkSizeBytes?: number;

  @ApiPropertyOptional({
    example: null,
    description: 'Platform-neutral release artifact size in bytes',
  })
  @ValidateIf(
    (dto: CreateAppVersionDto, value: unknown) =>
      (dto.requiresFullApk === true && !dto.apkSizeBytes) ||
      (value !== undefined && value !== null),
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  artifactSizeBytes?: number;
}

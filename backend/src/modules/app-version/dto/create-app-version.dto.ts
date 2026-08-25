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
  Min,
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
  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'apkDownloadUrl must be a valid URL' },
  )
  apkDownloadUrl: string;

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
  @IsOptional()
  @IsString()
  apkSha256?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Size of the APK file in bytes for integrity verification',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  apkSizeBytes?: number;
}

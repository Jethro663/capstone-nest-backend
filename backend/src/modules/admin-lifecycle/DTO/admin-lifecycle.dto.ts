import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const ADMIN_LIFECYCLE_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
export const ADMIN_LIFECYCLE_MODES = [
  'CURRENT_CLOSURE',
  'HISTORICAL_RETIREMENT',
] as const;
export const STUDENT_LIFECYCLE_RESOLUTIONS = [
  'CORRECT_ENROLLMENT',
  'CORRECT_CLASS_ENROLLMENT',
  'WITHDRAW',
  'TRANSFER_SECTION',
  'TRANSFER_CLASS',
] as const;
export const CLASS_LIFECYCLE_RESOLUTIONS = [
  'ARCHIVE_EMPTY',
  'COMPLETE',
  'DROP',
  'TRANSFER',
] as const;
export const SECTION_STUDENT_RESOLUTIONS = [
  'WITHDRAW',
  'TRANSFER_SECTION',
  'COMPLETE',
] as const;
export const ADMIN_LIFECYCLE_REASON_CODES = [
  'ERRONEOUS_ENROLLMENT',
  'TRANSFERRED_SECTION',
  'TRANSFERRED_CLASS',
  'TRANSFERRED_SCHOOL',
  'WITHDREW',
  'COMPLETED',
  'DUPLICATE_CLASS',
  'CURRICULUM_CORRECTION',
  'TEST_OR_EMPTY_RECORD',
  'OTHER',
] as const;
export const PURGE_TARGET_TYPES = ['CLASS', 'SECTION', 'USER'] as const;
export const PURGE_MODES = ['EMPTY_ONLY', 'CASCADE_ERASE'] as const;

export type AdminLifecyclePeriod = (typeof ADMIN_LIFECYCLE_PERIODS)[number];
export type AdminLifecycleMode = (typeof ADMIN_LIFECYCLE_MODES)[number];
export type StudentLifecycleResolution =
  (typeof STUDENT_LIFECYCLE_RESOLUTIONS)[number];
export type ClassLifecycleResolution =
  (typeof CLASS_LIFECYCLE_RESOLUTIONS)[number];
export type SectionStudentResolution =
  (typeof SECTION_STUDENT_RESOLUTIONS)[number];
export type AdminLifecycleReasonCode =
  (typeof ADMIN_LIFECYCLE_REASON_CODES)[number];
export type PurgeTargetType = (typeof PURGE_TARGET_TYPES)[number];
export type PurgeMode = (typeof PURGE_MODES)[number];

export class PreviewStudentLifecycleDto {
  @IsUUID('4') studentId: string;
  @IsUUID('4') sectionId: string;
  @IsIn(STUDENT_LIFECYCLE_RESOLUTIONS)
  resolution: StudentLifecycleResolution;
  @IsOptional() @IsUUID('4') classId?: string;
  @IsOptional() @IsUUID('4') destinationSectionId?: string;
  @IsOptional() @IsUUID('4') destinationClassId?: string;
  @IsIn(ADMIN_LIFECYCLE_PERIODS) effectivePeriod: AdminLifecyclePeriod;
}

export class PreviewClassLifecycleDto {
  @IsUUID('4') classId: string;
  @IsOptional()
  @IsIn(ADMIN_LIFECYCLE_MODES)
  lifecycleMode?: AdminLifecycleMode;
  @ValidateIf(
    (input: PreviewClassLifecycleDto) =>
      input.lifecycleMode !== 'HISTORICAL_RETIREMENT' ||
      input.resolution !== undefined,
  )
  @IsIn(CLASS_LIFECYCLE_RESOLUTIONS)
  resolution?: ClassLifecycleResolution;
  @IsOptional() @IsUUID('4') replacementClassId?: string;
  @ValidateIf(
    (input: PreviewClassLifecycleDto) =>
      input.lifecycleMode !== 'HISTORICAL_RETIREMENT' ||
      input.effectivePeriod !== undefined,
  )
  @IsIn(ADMIN_LIFECYCLE_PERIODS)
  effectivePeriod?: AdminLifecyclePeriod;
}

export class SectionStudentResolutionDto {
  @IsUUID('4') studentId: string;
  @IsIn(SECTION_STUDENT_RESOLUTIONS) resolution: SectionStudentResolution;
  @IsOptional() @IsUUID('4') destinationSectionId?: string;
}

export class PreviewSectionLifecycleDto {
  @IsUUID('4') sectionId: string;
  @IsOptional()
  @IsIn(ADMIN_LIFECYCLE_MODES)
  lifecycleMode?: AdminLifecycleMode;
  @ValidateIf(
    (input: PreviewSectionLifecycleDto) =>
      input.lifecycleMode !== 'HISTORICAL_RETIREMENT' ||
      input.effectivePeriod !== undefined,
  )
  @IsIn(ADMIN_LIFECYCLE_PERIODS)
  effectivePeriod?: AdminLifecyclePeriod;
  @ValidateIf(
    (input: PreviewSectionLifecycleDto) =>
      input.lifecycleMode !== 'HISTORICAL_RETIREMENT' ||
      input.studentResolutions !== undefined,
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionStudentResolutionDto)
  studentResolutions?: SectionStudentResolutionDto[];
}

export class PreviewPurgeLifecycleDto {
  @IsIn(PURGE_TARGET_TYPES) targetType: PurgeTargetType;
  @IsUUID('4') targetId: string;
  @IsOptional() @IsIn(PURGE_MODES) purgeMode?: PurgeMode;
}

export class PreviewPurgeBatchDto {
  @IsIn(PURGE_TARGET_TYPES) targetType: PurgeTargetType;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  targetIds: string[];
  @IsIn(PURGE_MODES) purgeMode: PurgeMode;
}

export class AdminLifecycleExecutionEvidenceDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

export class ExecuteStudentLifecycleDto extends PreviewStudentLifecycleDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword?: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

export class ExecuteClassLifecycleDto extends PreviewClassLifecycleDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword?: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

export class ExecuteSectionLifecycleDto extends PreviewSectionLifecycleDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword?: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

export class ExecutePurgeLifecycleDto extends PreviewPurgeLifecycleDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword?: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

export class ExecutePurgeBatchDto extends PreviewPurgeBatchDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsString() @MinLength(1) @MaxLength(128) confirmation: string;
  @IsUUID('4') idempotencyKey: string;
}

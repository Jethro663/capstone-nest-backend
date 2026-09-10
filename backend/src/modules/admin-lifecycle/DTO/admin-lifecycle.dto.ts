import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const ADMIN_LIFECYCLE_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
export const STUDENT_LIFECYCLE_RESOLUTIONS = [
  'CORRECT_ENROLLMENT',
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
export const PURGE_TARGET_TYPES = ['CLASS', 'SECTION'] as const;

export type AdminLifecyclePeriod = (typeof ADMIN_LIFECYCLE_PERIODS)[number];
export type StudentLifecycleResolution =
  (typeof STUDENT_LIFECYCLE_RESOLUTIONS)[number];
export type ClassLifecycleResolution =
  (typeof CLASS_LIFECYCLE_RESOLUTIONS)[number];
export type SectionStudentResolution =
  (typeof SECTION_STUDENT_RESOLUTIONS)[number];
export type AdminLifecycleReasonCode =
  (typeof ADMIN_LIFECYCLE_REASON_CODES)[number];
export type PurgeTargetType = (typeof PURGE_TARGET_TYPES)[number];

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
  @IsIn(CLASS_LIFECYCLE_RESOLUTIONS)
  resolution: ClassLifecycleResolution;
  @IsOptional() @IsUUID('4') replacementClassId?: string;
  @IsIn(ADMIN_LIFECYCLE_PERIODS) effectivePeriod: AdminLifecyclePeriod;
}

export class SectionStudentResolutionDto {
  @IsUUID('4') studentId: string;
  @IsIn(SECTION_STUDENT_RESOLUTIONS) resolution: SectionStudentResolution;
  @IsOptional() @IsUUID('4') destinationSectionId?: string;
}

export class PreviewSectionLifecycleDto {
  @IsUUID('4') sectionId: string;
  @IsIn(ADMIN_LIFECYCLE_PERIODS) effectivePeriod: AdminLifecyclePeriod;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionStudentResolutionDto)
  studentResolutions: SectionStudentResolutionDto[];
}

export class PreviewPurgeLifecycleDto {
  @IsIn(PURGE_TARGET_TYPES) targetType: PurgeTargetType;
  @IsUUID('4') targetId: string;
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
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

export class ExecuteClassLifecycleDto extends PreviewClassLifecycleDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

export class ExecuteSectionLifecycleDto extends PreviewSectionLifecycleDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

export class ExecutePurgeLifecycleDto extends PreviewPurgeLifecycleDto {
  @Matches(/^[a-f0-9]{64}$/) manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsIn(ADMIN_LIFECYCLE_REASON_CODES) reasonCode: AdminLifecycleReasonCode;
  @IsString() @MinLength(5) @MaxLength(2000) notes: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) confirmations: string[];
  @IsUUID('4') idempotencyKey: string;
}

import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Shared sub-types ─────────────────────────────────────────────────────────

export class ParsedNameDto {
  lastName: string;
  firstName: string;
  middleInitial: string | null;
}

// ─── Preview response ─────────────────────────────────────────────────────────

export class SectionMatchDto {
  /** The raw header text found in the file (e.g. "GRADE_7 HUMSS-A"). */
  fileHeader: string;
  foundSection: {
    id: string;
    name: string;
    gradeLevel: string;
  };
}

export class PreviewStudentRowDto {
  rowNumber: number;
  name: ParsedNameDto;
  lrn: string;
  email: string;
  /** UUID of the matched LMS user (present only when email was found in users table). */
  userId: string;
  /** True if this student is already enrolled in the section. */
  alreadyEnrolled: boolean;
}

export class PreviewPendingRowDto {
  rowNumber: number;
  name: ParsedNameDto;
  lrn: string;
  email: string;
}

export class RowErrorDto {
  rowNumber: number;
  rawData: string[];
  issues: string[];
}

export class PreviewSummaryDto {
  totalDataRows: number;
  validRows: number;
  registeredCount: number;
  alreadyEnrolledCount: number;
  pendingCount: number;
  errorCount: number;
}

export class RosterImportPreviewResponseDto {
  sectionMatch: SectionMatchDto;
  registered: PreviewStudentRowDto[];
  pending: PreviewPendingRowDto[];
  errors: RowErrorDto[];
  summary: PreviewSummaryDto;
}

// ─── Commit request ───────────────────────────────────────────────────────────

export class CommitStudentRowDto {
  @IsUUID('4')
  userId: string;

  @ValidateNested()
  @Type(() => ParsedNameDto)
  name: ParsedNameDto;

  @IsString()
  @Matches(/^\d{12}$/, { message: 'LRN must be exactly 12 numeric digits' })
  lrn: string;

  @IsEmail()
  email: string;
}

export class CommitPendingRowDto {
  @ValidateNested()
  @Type(() => ParsedNameDto)
  name: ParsedNameDto;

  @IsString()
  @Matches(/^\d{12}$/, { message: 'LRN must be exactly 12 numeric digits' })
  lrn: string;

  @IsEmail()
  email: string;
}

export class RosterImportCommitDto {
  @IsUUID('4')
  sectionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitStudentRowDto)
  enrolledRows: CommitStudentRowDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitPendingRowDto)
  pendingRows: CommitPendingRowDto[];
}

// ─── Commit response ──────────────────────────────────────────────────────────

export class RosterImportCommitResponseDto {
  enrolledUserIds: string[];
  pendingRosterIds: string[];
  alreadyEnrolledSkipped: number;
  summary: {
    enrolled: number;
    pending: number;
    total: number;
  };
}

// ─── Pending roster list response ─────────────────────────────────────────────

export class PendingRosterRowDto {
  id: string;
  sectionId: string;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  lrn: string;
  rosterEmail: string;
  resolvedAt: Date | null;
  resolvedUserId: string | null;
  importedAt: Date;
}

// ─── Resolve pending row request ──────────────────────────────────────────────

export class ResolvePendingRowDto {
  @IsOptional()
  @IsUUID('4')
  resolvedUserId?: string;
}

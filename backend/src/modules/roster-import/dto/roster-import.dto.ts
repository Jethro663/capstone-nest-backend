import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ParsedNameDto {
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;
}

export class SectionMatchDto {
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
  userId: string;
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

export class ResolvePendingRowDto {
  @IsOptional()
  @IsUUID('4')
  resolvedUserId?: string;
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  and,
  countDistinct,
  eq,
  inArray,
} from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import {
  sections,
  users,
  enrollments,
  userRoles,
  roles,
  pendingRoster,
} from '../../drizzle/schema';

import { parseXlsx } from './parsers/xlsx.parser';
import { parseCsv } from './parsers/csv.parser';
import {
  findSectionHeaderRow,
  findColumnHeaderRow,
  parseNameCell,
  validateLrn,
  validateEmail,
} from './parsers/roster-row.parser';

import {
  RosterImportPreviewResponseDto,
  RosterImportCommitDto,
  RosterImportCommitResponseDto,
  PendingRosterRowDto,
  PreviewStudentRowDto,
  PreviewPendingRowDto,
  RowErrorDto,
} from './dto/roster-import.dto';

export interface RosterRequestingUser {
  id: string;
  email: string;
  roles: string[];
}

@Injectable()
export class RosterImportService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // ─── parseAndPreview ──────────────────────────────────────────────────────

  /**
   * Accepts a temporarily uploaded file (CSV or XLSX), parses it, validates each
   * row, matches students to existing LMS accounts by email, and returns a full
   * preview payload for the frontend to display before committing.
   *
   * The temp file is always deleted from disk before this method returns.
   */
  async parseAndPreview(
    sectionId: string,
    file: Express.Multer.File,
    requestingUser: RosterRequestingUser,
  ): Promise<RosterImportPreviewResponseDto> {
    // ── 1. Verify section exists ───────────────────────────────────────────
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });

    if (!section) {
      await this.cleanupFile(file.path);
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    }

    if (!section.isActive) {
      await this.cleanupFile(file.path);
      throw new BadRequestException(`Section "${section.name}" is inactive and cannot receive new enrollments`);
    }

    // ── 2. Access control: teachers can only import into their own sections ─
    const isTeacherOnly =
      requestingUser.roles.includes('teacher') &&
      !requestingUser.roles.includes('admin');

    if (isTeacherOnly && section.adviserId !== requestingUser.id) {
      await this.cleanupFile(file.path);
      throw new ForbiddenException('You can only import rosters into sections you advise');
    }

    // ── 3. Parse the file ──────────────────────────────────────────────────
    let rows: string[][];
    try {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.xlsx' || ext === '.xls') {
        rows = await parseXlsx(file.path);
      } else {
        rows = parseCsv(file.path);
      }
    } catch (err) {
      await this.cleanupFile(file.path);
      throw new BadRequestException(
        `Could not parse the uploaded file: ${(err as Error).message}`,
      );
    } finally {
      await this.cleanupFile(file.path);
    }

    if (rows.length === 0) {
      throw new BadRequestException('The uploaded file is empty or contains no readable rows');
    }

    // ── 4. Find section-header row ─────────────────────────────────────────
    const headerInfo = findSectionHeaderRow(rows);
    if (!headerInfo) {
      throw new BadRequestException(
        'Could not find a section-header row in the file. ' +
        'Expected a row like "GRADE_7 HUMSS-A" or "GRADE 10 Science 1".',
      );
    }

    // ── 5. Validate section header matches route param ─────────────────────
    const fileGradeLevel = headerInfo.gradeLevel;        // e.g. "7"
    const fileSectionName = headerInfo.sectionName;      // e.g. "HUMSS-A"

    const gradeMatch = fileGradeLevel === String(section.gradeLevel);
    const nameMatch =
      fileSectionName.trim().toLowerCase() === section.name.trim().toLowerCase();

    if (!gradeMatch || !nameMatch) {
      throw new BadRequestException(
        `File header "${headerInfo.rawHeader}" does not match the target section ` +
        `(Grade ${section.gradeLevel} – ${section.name}). ` +
        `Please verify you are uploading the correct file.`,
      );
    }

    // ── 6. Find column-header row ──────────────────────────────────────────
    const colHeader = findColumnHeaderRow(rows, headerInfo.rowIndex + 1);
    if (!colHeader) {
      throw new BadRequestException(
        'Could not find a column header row with "Name", "LRN", and "Email" columns after the section header.',
      );
    }

    // ── 7. Parse data rows ─────────────────────────────────────────────────
    const registeredRows: PreviewStudentRowDto[] = [];
    const pendingRows: PreviewPendingRowDto[] = [];
    const errorRows: RowErrorDto[] = [];
    const emailsCollected: string[] = [];

    type ParsedRow = {
      rowNumber: number;
      name: ReturnType<typeof parseNameCell>;
      lrn: string;
      email: string;
    };
    const validParsedRows: ParsedRow[] = [];

    const dataStartIndex = colHeader.rowIndex + 1;

    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1; // 1-based for human readability
      const issues: string[] = [];

      const nameRaw = (row[colHeader.nameCol] ?? '').trim();
      const lrnRaw  = (row[colHeader.lrnCol]  ?? '').trim();
      const emailRaw = (row[colHeader.emailCol] ?? '').trim();

      // Skip completely empty rows
      if (!nameRaw && !lrnRaw && !emailRaw) continue;

      if (!nameRaw) issues.push('Name is empty');
      if (!validateLrn(lrnRaw)) {
        issues.push(
          lrnRaw
            ? `LRN "${lrnRaw}" is invalid — must be exactly 12 numeric digits`
            : 'LRN is empty',
        );
      }
      if (!emailRaw) {
        issues.push('Email is empty');
      } else if (!validateEmail(emailRaw)) {
        issues.push(`Email "${emailRaw}" is not a valid email address`);
      }

      if (issues.length > 0) {
        errorRows.push({ rowNumber, rawData: row, issues });
        continue;
      }

      const parsedName = parseNameCell(nameRaw);
      validParsedRows.push({
        rowNumber,
        name: parsedName,
        lrn: lrnRaw,
        email: emailRaw.toLowerCase(),
      });
      emailsCollected.push(emailRaw.toLowerCase());
    }

    // ── 8. Batch-look up users by email ────────────────────────────────────
    const emailToUser = new Map<string, { id: string; email: string }>();
    if (emailsCollected.length > 0) {
      const found = await this.db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.email, emailsCollected));

      for (const u of found) {
        emailToUser.set(u.email.toLowerCase(), u);
      }
    }

    // ── 9. Check existing enrollments in this section ──────────────────────
    const foundUserIds = [...emailToUser.values()].map((u) => u.id);
    const alreadyEnrolledIds = new Set<string>();

    if (foundUserIds.length > 0) {
      const enrolled = await this.db
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, sectionId),
            eq(enrollments.status, 'enrolled'),
            inArray(enrollments.studentId, foundUserIds),
          ),
        );
      for (const e of enrolled) {
        if (e.studentId) alreadyEnrolledIds.add(e.studentId);
      }
    }

    // ── 10. Split into registered vs pending ──────────────────────────────
    for (const parsed of validParsedRows) {
      const matchedUser = emailToUser.get(parsed.email);

      if (matchedUser) {
        registeredRows.push({
          rowNumber: parsed.rowNumber,
          name: parsed.name,
          lrn: parsed.lrn,
          email: parsed.email,
          userId: matchedUser.id,
          alreadyEnrolled: alreadyEnrolledIds.has(matchedUser.id),
        });
      } else {
        pendingRows.push({
          rowNumber: parsed.rowNumber,
          name: parsed.name,
          lrn: parsed.lrn,
          email: parsed.email,
        });
      }
    }

    const alreadyEnrolledCount = registeredRows.filter((r) => r.alreadyEnrolled).length;

    return {
      sectionMatch: {
        fileHeader: headerInfo.rawHeader,
        foundSection: {
          id: section.id,
          name: section.name,
          gradeLevel: section.gradeLevel ?? '',
        },
      },
      registered: registeredRows,
      pending: pendingRows,
      errors: errorRows,
      summary: {
        totalDataRows: validParsedRows.length + errorRows.length,
        validRows: validParsedRows.length,
        registeredCount: registeredRows.length,
        alreadyEnrolledCount,
        pendingCount: pendingRows.length,
        errorCount: errorRows.length,
      },
    };
  }

  // ─── commitRoster ─────────────────────────────────────────────────────────

  /**
   * Commits the approved roster:
   *  - Enrolls registered students into the section (skips already-enrolled ones).
   *  - Inserts unregistered students into pending_roster.
   */
  async commitRoster(
    sectionId: string,
    dto: RosterImportCommitDto,
    requestingUser: RosterRequestingUser,
  ): Promise<RosterImportCommitResponseDto> {
    // ── 1. Verify section ──────────────────────────────────────────────────
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });

    if (!section) throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    if (!section.isActive) {
      throw new BadRequestException(`Section "${section.name}" is inactive`);
    }

    const isTeacherOnly =
      requestingUser.roles.includes('teacher') &&
      !requestingUser.roles.includes('admin');

    if (isTeacherOnly && section.adviserId !== requestingUser.id) {
      throw new ForbiddenException('You can only commit rosters into sections you advise');
    }

    // ── 2. Validate dto.sectionId matches route param ──────────────────────
    if (dto.sectionId !== sectionId) {
      throw new BadRequestException(
        `Payload sectionId "${dto.sectionId}" does not match route parameter "${sectionId}"`,
      );
    }

    const enrolledUserIds: string[] = [];
    let alreadyEnrolledSkipped = 0;
    const pendingRosterIds: string[] = [];

    await this.db.transaction(async (tx) => {
      // ── 3. Enroll registered students ────────────────────────────────────
      if (dto.enrolledRows.length > 0) {
        const toEnrollIds = dto.enrolledRows.map((r) => r.userId);

        // Capacity check
        const [cap] = await tx
          .select({ count: countDistinct(enrollments.studentId) })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.sectionId, sectionId),
              eq(enrollments.status, 'enrolled'),
            ),
          );

        const currentCount = Number(cap?.count ?? 0);

        // Find already-enrolled in one query
        const alreadyEnrolled = await tx
          .select({ studentId: enrollments.studentId })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.sectionId, sectionId),
              eq(enrollments.status, 'enrolled'),
              inArray(enrollments.studentId, toEnrollIds),
            ),
          );

        const alreadyEnrolledSet = new Set(alreadyEnrolled.map((e) => e.studentId));
        const newIds = toEnrollIds.filter((id) => !alreadyEnrolledSet.has(id));
        alreadyEnrolledSkipped = alreadyEnrolledSet.size;

        if (newIds.length > 0) {
          if (currentCount + newIds.length > section.capacity) {
            throw new BadRequestException(
              `Adding ${newIds.length} student(s) would exceed the section capacity of ${section.capacity} ` +
              `(currently ${currentCount} enrolled)`,
            );
          }

          // Verify all IDs are valid registered students with the student role
          const studentRoleRows = await tx
            .select({ userId: userRoles.userId })
            .from(userRoles)
            .innerJoin(roles, eq(roles.id, userRoles.roleId))
            .where(
              and(
                inArray(userRoles.userId, newIds),
                eq(roles.name, 'student'),
              ),
            );

          const confirmedStudentIds = new Set(studentRoleRows.map((r) => r.userId));
          const nonStudentIds = newIds.filter((id) => !confirmedStudentIds.has(id));
          if (nonStudentIds.length > 0) {
            throw new BadRequestException(
              `The following users do not have the student role: ${nonStudentIds.join(', ')}`,
            );
          }

          const inserted = await tx
            .insert(enrollments)
            .values(
              newIds.map((studentId) => ({
                studentId,
                classId: null as string | null,
                sectionId,
                status: 'enrolled' as const,
                enrolledAt: new Date(),
              })),
            )
            .returning({ studentId: enrollments.studentId });

          enrolledUserIds.push(...inserted.map((r) => r.studentId!));
        }
      }

      // ── 4. Insert pending roster rows ─────────────────────────────────────
      if (dto.pendingRows.length > 0) {
        const pendingValues = dto.pendingRows.map((r) => ({
          sectionId,
          lastName: r.name.lastName,
          firstName: r.name.firstName,
          middleInitial: r.name.middleInitial ?? null,
          lrn: r.lrn,
          rosterEmail: r.email.toLowerCase(),
          importedAt: new Date(),
        }));

        const insertedPending = await tx
          .insert(pendingRoster)
          .values(pendingValues)
          .onConflictDoNothing()
          .returning({ id: pendingRoster.id });

        pendingRosterIds.push(...insertedPending.map((r) => r.id));
      }
    });

    return {
      enrolledUserIds,
      pendingRosterIds,
      alreadyEnrolledSkipped,
      summary: {
        enrolled: enrolledUserIds.length,
        pending: pendingRosterIds.length,
        total: enrolledUserIds.length + pendingRosterIds.length,
      },
    };
  }

  // ─── getPendingRoster ─────────────────────────────────────────────────────

  /**
   * Returns all pending (unregistered) roster rows for a given section.
   */
  async getPendingRoster(
    sectionId: string,
    requestingUser: RosterRequestingUser,
  ): Promise<PendingRosterRowDto[]> {
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });

    if (!section) throw new NotFoundException(`Section with ID "${sectionId}" not found`);

    const isTeacherOnly =
      requestingUser.roles.includes('teacher') &&
      !requestingUser.roles.includes('admin');

    if (isTeacherOnly && section.adviserId !== requestingUser.id) {
      throw new ForbiddenException('You do not have access to this section');
    }

    const rows = await this.db
      .select()
      .from(pendingRoster)
      .where(eq(pendingRoster.sectionId, sectionId))
      .orderBy(pendingRoster.importedAt);

    return rows.map((r) => ({
      id: r.id,
      sectionId: r.sectionId,
      lastName: r.lastName,
      firstName: r.firstName,
      middleInitial: r.middleInitial,
      lrn: r.lrn,
      rosterEmail: r.rosterEmail,
      resolvedAt: r.resolvedAt,
      resolvedUserId: r.resolvedUserId,
      importedAt: r.importedAt,
    }));
  }

  // ─── resolvePendingRow ────────────────────────────────────────────────────

  /**
   * Marks a pending roster row as resolved by linking it to a registered user.
   * If resolvedUserId is provided, the user must exist in the DB.
   * If omitted, any existing resolution is cleared (un-resolve).
   */
  async resolvePendingRow(
    pendingRowId: string,
    resolvedUserId: string | undefined,
    requestingUser: RosterRequestingUser,
  ): Promise<PendingRosterRowDto> {
    const row = await this.db.query.pendingRoster.findFirst({
      where: eq(pendingRoster.id, pendingRowId),
    });

    if (!row) throw new NotFoundException(`Pending roster row "${pendingRowId}" not found`);

    // Access check — load section
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, row.sectionId),
    });

    const isTeacherOnly =
      requestingUser.roles.includes('teacher') &&
      !requestingUser.roles.includes('admin');

    if (isTeacherOnly && section?.adviserId !== requestingUser.id) {
      throw new ForbiddenException('You do not have access to this section');
    }

    if (resolvedUserId) {
      const user = await this.db.query.users.findFirst({
        where: eq(users.id, resolvedUserId),
      });
      if (!user) {
        throw new BadRequestException(`User with ID "${resolvedUserId}" not found`);
      }
    }

    const [updated] = await this.db
      .update(pendingRoster)
      .set({
        resolvedUserId: resolvedUserId ?? null,
        resolvedAt: resolvedUserId ? new Date() : null,
      })
      .where(eq(pendingRoster.id, pendingRowId))
      .returning();

    return {
      id: updated.id,
      sectionId: updated.sectionId,
      lastName: updated.lastName,
      firstName: updated.firstName,
      middleInitial: updated.middleInitial,
      lrn: updated.lrn,
      rosterEmail: updated.rosterEmail,
      resolvedAt: updated.resolvedAt,
      resolvedUserId: updated.resolvedUserId,
      importedAt: updated.importedAt,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Best-effort
    }
  }
}

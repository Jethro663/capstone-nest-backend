import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { and, countDistinct, desc, eq, inArray } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import {
  sections,
  users,
  enrollments,
  userRoles,
  roles,
  pendingRoster,
  studentProfiles,
} from '../../drizzle/schema';

import { parseXlsx } from './parsers/xlsx.parser';
import { parseCsv } from './parsers/csv.parser';
import {
  findSectionHeaderRow,
  findColumnHeaderRow,
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
  private static readonly BULK_STUDENT_PASSWORD = 'Student123!';
  private static readonly PASSWORD_HASH_ROUNDS = 10;

  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private toMiddleInitial(
    middleName: string | null | undefined,
  ): string | null {
    if (!middleName) return null;
    const trimmed = middleName.trim();
    if (!trimmed) return null;
    return trimmed.charAt(0).toUpperCase();
  }

  // parseAndPreview

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
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });

    if (!section) {
      await this.cleanupFile(file.path);
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    }

    if (!section.isActive) {
      await this.cleanupFile(file.path);
      throw new BadRequestException(
        `Section "${section.name}" is inactive and cannot receive new enrollments`,
      );
    }

    const isTeacherOnly =
      requestingUser.roles.includes('teacher') &&
      !requestingUser.roles.includes('admin');

    if (isTeacherOnly && section.adviserId !== requestingUser.id) {
      await this.cleanupFile(file.path);
      throw new ForbiddenException(
        'You can only import rosters into sections you advise',
      );
    }

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
      throw new BadRequestException(
        'The uploaded file is empty or contains no readable rows',
      );
    }

    const headerInfo = findSectionHeaderRow(rows);
    if (!headerInfo) {
      throw new BadRequestException(
        'Could not find a section-header row in the file. ' +
          'Expected a row like "GRADE_7 HUMSS-A" or "GRADE 10 Science 1".',
      );
    }

    const fileGradeLevel = headerInfo.gradeLevel;
    const fileSectionName = headerInfo.sectionName;

    const gradeMatch = fileGradeLevel === String(section.gradeLevel);
    const nameMatch =
      fileSectionName.trim().toLowerCase() ===
      section.name.trim().toLowerCase();

    if (!gradeMatch || !nameMatch) {
      throw new BadRequestException(
        `File header "${headerInfo.rawHeader}" does not match the target section ` +
          `(Grade ${section.gradeLevel} - ${section.name}). ` +
          'Please verify you are uploading the correct file.',
      );
    }

    const colHeader = findColumnHeaderRow(rows, headerInfo.rowIndex + 1);
    if (!colHeader) {
      throw new BadRequestException(
        'Could not find a column header row with "Last Name", "First Name", "Middle Name", "LRN", and "Email" columns after the section header.',
      );
    }

    const registeredRows: PreviewStudentRowDto[] = [];
    const pendingRows: PreviewPendingRowDto[] = [];
    const errorRows: RowErrorDto[] = [];
    const emailsCollected: string[] = [];
    const lrnsCollected: string[] = [];

    type ParsedRow = {
      rowNumber: number;
      name: {
        lastName: string;
        firstName: string;
        middleName: string;
      };
      lrn: string;
      email: string;
    };

    const validParsedRows: ParsedRow[] = [];
    const seenEmails = new Set<string>();
    const seenLrns = new Set<string>();
    const dataStartIndex = colHeader.rowIndex + 1;

    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const issues: string[] = [];

      const lastNameRaw = (row[colHeader.lastNameCol] ?? '').trim();
      const firstNameRaw = (row[colHeader.firstNameCol] ?? '').trim();
      const middleNameRaw = (row[colHeader.middleNameCol] ?? '').trim();
      const lrnRaw = (row[colHeader.lrnCol] ?? '').trim();
      const emailRaw = (row[colHeader.emailCol] ?? '').trim();

      if (
        !lastNameRaw &&
        !firstNameRaw &&
        !middleNameRaw &&
        !lrnRaw &&
        !emailRaw
      ) {
        continue;
      }

      if (!lastNameRaw) issues.push('Last Name is empty');
      if (!firstNameRaw) issues.push('First Name is empty');
      if (!validateLrn(lrnRaw)) {
        issues.push(
          lrnRaw
            ? `LRN "${lrnRaw}" is invalid - must be exactly 12 numeric digits`
            : 'LRN is empty',
        );
      }

      if (!emailRaw) {
        issues.push('Email is empty');
      } else if (!validateEmail(emailRaw)) {
        issues.push(`Email "${emailRaw}" is not a valid email address`);
      }

      const normalizedEmail = emailRaw.toLowerCase();
      if (normalizedEmail && seenEmails.has(normalizedEmail)) {
        issues.push(`Duplicate email "${normalizedEmail}" in file`);
      }
      if (lrnRaw && seenLrns.has(lrnRaw)) {
        issues.push(`Duplicate LRN "${lrnRaw}" in file`);
      }

      if (issues.length > 0) {
        errorRows.push({ rowNumber, rawData: row, issues });
        continue;
      }

      seenEmails.add(normalizedEmail);
      seenLrns.add(lrnRaw);

      validParsedRows.push({
        rowNumber,
        name: {
          lastName: lastNameRaw,
          firstName: firstNameRaw,
          middleName: middleNameRaw,
        },
        lrn: lrnRaw,
        email: normalizedEmail,
      });
      emailsCollected.push(normalizedEmail);
      lrnsCollected.push(lrnRaw);
    }

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

    const lrnToUserId = new Map<string, string>();
    if (lrnsCollected.length > 0) {
      const existingProfiles = await this.db
        .select({ lrn: studentProfiles.lrn, userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(inArray(studentProfiles.lrn, lrnsCollected));

      for (const profile of existingProfiles) {
        if (profile.lrn) lrnToUserId.set(profile.lrn, profile.userId);
      }
    }

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

    for (const parsed of validParsedRows) {
      const matchedUser = emailToUser.get(parsed.email);
      const lrnOwnerId = lrnToUserId.get(parsed.lrn);

      if (!matchedUser && lrnOwnerId) {
        errorRows.push({
          rowNumber: parsed.rowNumber,
          rawData: [],
          issues: [
            `LRN "${parsed.lrn}" is already registered to another account`,
          ],
        });
        continue;
      }

      if (matchedUser && lrnOwnerId && lrnOwnerId !== matchedUser.id) {
        errorRows.push({
          rowNumber: parsed.rowNumber,
          rawData: [],
          issues: [
            `LRN "${parsed.lrn}" is already linked to a different user account`,
          ],
        });
        continue;
      }

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

    const alreadyEnrolledCount = registeredRows.filter(
      (r) => r.alreadyEnrolled,
    ).length;

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
        validRows: registeredRows.length + pendingRows.length,
        registeredCount: registeredRows.length,
        alreadyEnrolledCount,
        pendingCount: pendingRows.length,
        errorCount: errorRows.length,
      },
    };
  }

  // commitRoster

  /**
   * Commits the approved roster:
   *  - Enrolls registered students into the section (skips already-enrolled ones).
   *  - Auto-creates active student accounts for unmatched rows and enrolls them.
   */
  async commitRoster(
    sectionId: string,
    dto: RosterImportCommitDto,
    requestingUser: RosterRequestingUser,
  ): Promise<RosterImportCommitResponseDto> {
    // 1. Verify section
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });

    if (!section)
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    if (!section.isActive) {
      throw new BadRequestException(`Section "${section.name}" is inactive`);
    }

    const isTeacherOnly =
      requestingUser.roles.includes('teacher') &&
      !requestingUser.roles.includes('admin');

    if (isTeacherOnly && section.adviserId !== requestingUser.id) {
      throw new ForbiddenException(
        'You can only commit rosters into sections you advise',
      );
    }

    // 2. Validate dto.sectionId matches route param
    if (dto.sectionId !== sectionId) {
      throw new BadRequestException(
        `Payload sectionId "${dto.sectionId}" does not match route parameter "${sectionId}"`,
      );
    }

    const enrolledUserIds: string[] = [];
    let alreadyEnrolledSkipped = 0;
    const pendingRosterIds: string[] = [];
    const importHistoryRows: Array<typeof pendingRoster.$inferInsert> = [];

    await this.db.transaction(async (tx) => {
      // 3. Enroll registered students
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

        const alreadyEnrolledSet = new Set(
          alreadyEnrolled.map((e) => e.studentId),
        );
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
              and(inArray(userRoles.userId, newIds), eq(roles.name, 'student')),
            );

          const confirmedStudentIds = new Set(
            studentRoleRows.map((r) => r.userId),
          );
          const nonStudentIds = newIds.filter(
            (id) => !confirmedStudentIds.has(id),
          );
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

          enrolledUserIds.push(...inserted.map((r) => r.studentId));
        }

        importHistoryRows.push(
          ...dto.enrolledRows.map((row) => ({
            sectionId,
            lastName: row.name.lastName,
            firstName: row.name.firstName,
            middleInitial: this.toMiddleInitial(row.name.middleName),
            lrn: row.lrn,
            rosterEmail: row.email.toLowerCase(),
            resolvedUserId: row.userId,
            resolvedAt: new Date(),
            importedAt: new Date(),
          })),
        );
      }

      // 4. Auto-create accounts from pending rows and enroll them
      if (dto.pendingRows.length > 0) {
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
        if (currentCount + dto.pendingRows.length > section.capacity) {
          throw new BadRequestException(
            `Adding ${dto.pendingRows.length} new student(s) would exceed the section capacity of ${section.capacity} ` +
              `(currently ${currentCount} enrolled)`,
          );
        }

        const pendingEmails = dto.pendingRows.map((r) => r.email.toLowerCase());
        const pendingLrns = dto.pendingRows.map((r) => r.lrn);

        const existingUsersByEmail = await tx
          .select({ email: users.email })
          .from(users)
          .where(inArray(users.email, pendingEmails));
        if (existingUsersByEmail.length > 0) {
          throw new BadRequestException(
            `These emails are already registered: ${existingUsersByEmail.map((u) => u.email).join(', ')}`,
          );
        }

        const existingProfilesByLrn = await tx
          .select({ lrn: studentProfiles.lrn })
          .from(studentProfiles)
          .where(inArray(studentProfiles.lrn, pendingLrns));
        const conflictLrns = existingProfilesByLrn
          .map((p) => p.lrn)
          .filter((lrn): lrn is string => Boolean(lrn));

        if (conflictLrns.length > 0) {
          throw new BadRequestException(
            `These LRNs are already registered: ${conflictLrns.join(', ')}`,
          );
        }

        let studentRole = tx.query?.roles
          ? await tx.query.roles.findFirst({
              where: eq(roles.name, 'student'),
            })
          : (
              await tx
                .select({ id: roles.id })
                .from(roles)
                .where(eq(roles.name, 'student'))
            )[0];

        if (!studentRole) {
          try {
            const createdRoles = await tx
              .insert(roles)
              .values({
                name: 'student',
                description: 'Auto-created for roster import',
              })
              .returning({ id: roles.id });
            studentRole = createdRoles[0] ?? null;
          } catch {
            studentRole = tx.query?.roles
              ? await tx.query.roles.findFirst({
                  where: eq(roles.name, 'student'),
                })
              : (
                  await tx
                    .select({ id: roles.id })
                    .from(roles)
                    .where(eq(roles.name, 'student'))
                )[0];
          }
        }

        if (!studentRole) {
          throw new BadRequestException(
            'Student role is not configured. Run seed-database.js once, then retry roster import.',
          );
        }

        const hashedPassword = await bcrypt.hash(
          RosterImportService.BULK_STUDENT_PASSWORD,
          RosterImportService.PASSWORD_HASH_ROUNDS,
        );

        const createdUsers = await tx
          .insert(users)
          .values(
            dto.pendingRows.map((row) => ({
              email: row.email.toLowerCase(),
              password: hashedPassword,
              firstName: row.name.firstName,
              middleName: row.name.middleName,
              lastName: row.name.lastName,
              status: 'ACTIVE' as const,
              isEmailVerified: true,
            })),
          )
          .returning({ id: users.id, email: users.email });
        pendingRosterIds.push(...createdUsers.map((user) => user.id));

        await tx.insert(userRoles).values(
          createdUsers.map((user) => ({
            userId: user.id,
            roleId: studentRole.id,
            assignedBy: 'SYSTEM',
          })),
        );

        const pendingByEmail = new Map(
          dto.pendingRows.map((row) => [row.email.toLowerCase(), row]),
        );

        await tx.insert(studentProfiles).values(
          createdUsers.map((user) => {
            const row = pendingByEmail.get(user.email.toLowerCase());
            return {
              userId: user.id,
              lrn: row?.lrn ?? null,
              gradeLevel:
                (section.gradeLevel as '7' | '8' | '9' | '10' | undefined) ??
                null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
        );

        const insertedEnrollments = await tx
          .insert(enrollments)
          .values(
            createdUsers.map((user) => ({
              studentId: user.id,
              classId: null as string | null,
              sectionId,
              status: 'enrolled' as const,
              enrolledAt: new Date(),
            })),
          )
          .returning({ studentId: enrollments.studentId });

        enrolledUserIds.push(...insertedEnrollments.map((e) => e.studentId));

        importHistoryRows.push(
          ...createdUsers.map((user) => {
            const row = pendingByEmail.get(user.email.toLowerCase());
            return {
              sectionId,
              lastName: row?.name.lastName ?? '',
              firstName: row?.name.firstName ?? '',
              middleInitial: this.toMiddleInitial(row?.name.middleName),
              lrn: row?.lrn ?? '',
              rosterEmail: user.email.toLowerCase(),
              resolvedUserId: user.id,
              resolvedAt: new Date(),
              importedAt: new Date(),
            };
          }),
        );
      }

      if (importHistoryRows.length > 0) {
        await tx.insert(pendingRoster).values(importHistoryRows);
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

  // getPendingRoster

  /**
   * Returns recent roster import history rows for a given section.
   */
  async getPendingRoster(
    sectionId: string,
    requestingUser: RosterRequestingUser,
  ): Promise<PendingRosterRowDto[]> {
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });

    if (!section)
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);

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
      .orderBy(desc(pendingRoster.importedAt));

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

  // resolvePendingRow

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

    if (!row)
      throw new NotFoundException(
        `Pending roster row "${pendingRowId}" not found`,
      );

    // Access check - load section
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
        throw new BadRequestException(
          `User with ID "${resolvedUserId}" not found`,
        );
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

  // Helpers

  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Best-effort
    }
  }
}

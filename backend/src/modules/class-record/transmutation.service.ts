import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { AcademicMutation } from '../../database/academic-transaction';
import {
  transmutationTables,
  TransmutationBand,
} from '../../drizzle/schema/transmutation.schema';
import { AuditService } from '../audit/audit.service';
import { AnnualGradesService } from '../academic-state/annual-grades.service';
import {
  DEFAULT_DEPED_TRANSMUTATION_BANDS,
  SYSTEM_DEFAULT_TRANSMUTATION_TITLE,
  validateAnnualTransmutationBands,
} from '../academic-state/annual-transmutation';

export { DEFAULT_DEPED_TRANSMUTATION_BANDS };

export interface TransmutationPreviewResult {
  title: string;
  filename?: string;
  bandCount: number;
  isValid: boolean;
  validationMessage: string;
  bands: TransmutationBand[];
}

@Injectable()
export class TransmutationService {
  private readonly logger = new Logger(TransmutationService.name);
  private cachedActiveBands: TransmutationBand[] | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly annualGradesService: AnnualGradesService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Clears in-memory active band cache
   */
  clearCache() {
    this.cachedActiveBands = null;
  }

  /**
   * Retrieves active transmutation bands from DB, or seeds default if none exists
   */
  async getActiveBands(): Promise<TransmutationBand[]> {
    if (this.cachedActiveBands) {
      return this.cachedActiveBands;
    }

    try {
      const activeRows = await this.db
        .select()
        .from(transmutationTables)
        .where(eq(transmutationTables.isActive, true))
        .orderBy(desc(transmutationTables.updatedAt))
        .limit(1);

      if (
        activeRows.length > 0 &&
        Array.isArray(activeRows[0].bands) &&
        activeRows[0].bands.length > 0
      ) {
        this.cachedActiveBands = activeRows[0].bands;
        return this.cachedActiveBands;
      }
    } catch (error) {
      this.logger.warn(
        `Could not query transmutation_tables from DB, using default bands: ${error}`,
      );
    }

    this.cachedActiveBands = DEFAULT_DEPED_TRANSMUTATION_BANDS;
    return this.cachedActiveBands;
  }

  /**
   * Fetches full active table record or list of historical tables
   */
  async getActiveTableRecord() {
    const activeRows = await this.db
      .select()
      .from(transmutationTables)
      .where(eq(transmutationTables.isActive, true))
      .orderBy(desc(transmutationTables.updatedAt))
      .limit(1);

    if (activeRows.length > 0) {
      return activeRows[0];
    }

    return {
      id: 'system-default',
      title: SYSTEM_DEFAULT_TRANSMUTATION_TITLE,
      description:
        'Official default Department of Education K to 12 grading transmutation table.',
      isSystemDefault: true,
      isActive: true,
      bands: DEFAULT_DEPED_TRANSMUTATION_BANDS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Fetches all transmutation tables for history
   */
  async getAllTables() {
    const rows = await this.db
      .select()
      .from(transmutationTables)
      .orderBy(desc(transmutationTables.createdAt));
    return rows;
  }

  /**
   * Parses uploaded file (PDF, CSV, or Text) into a validated preview payload
   */
  async parseAndPreview(file: {
    buffer: Buffer;
    originalname?: string;
  }): Promise<TransmutationPreviewResult> {
    const filename = file.originalname || 'uploaded_transmutation_table.pdf';
    let textContent = '';

    if (filename.endsWith('.pdf')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
        const pdfModule = require('pdf-parse');
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        let parsedText = '';

        if (typeof pdfModule === 'function') {
          try {
            const res = await pdfModule(file.buffer);
            parsedText = typeof res === 'string' ? res : res?.text || '';
          } catch {
            /* fallback: direct-call strategy failed */
          }
        }

        if (
          !parsedText &&
          pdfModule?.default &&
          typeof pdfModule.default === 'function'
        ) {
          try {
            const res = await pdfModule.default(file.buffer);
            parsedText = typeof res === 'string' ? res : res?.text || '';
          } catch {
            /* fallback: default-export strategy failed */
          }
        }

        if (!parsedText) {
          const PDFClass =
            pdfModule?.PDFParse ||
            (typeof pdfModule === 'function' ? pdfModule : null);
          if (PDFClass) {
            try {
              const instance = new PDFClass({ data: file.buffer });
              if (instance.load && typeof instance.load === 'function') {
                await instance.load();
              }
              const res = instance.getText
                ? await instance.getText()
                : await instance;
              parsedText = typeof res === 'string' ? res : res?.text || '';
            } catch {
              /* fallback: class-constructor strategy failed */
            }
          }
        }

        if (
          !parsedText &&
          pdfModule?.pdfParse &&
          typeof pdfModule.pdfParse === 'function'
        ) {
          try {
            const res = await pdfModule.pdfParse(file.buffer);
            parsedText = typeof res === 'string' ? res : res?.text || '';
          } catch {
            /* fallback: named-export pdfParse strategy failed */
          }
        }

        textContent = parsedText;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      } catch (error) {
        const err = error as Error;
        throw new BadRequestException(
          `Failed to parse PDF text: ${err.message}`,
        );
      }
    } else {
      textContent = file.buffer.toString('utf-8');
    }

    if (!textContent || textContent.trim().length === 0) {
      throw new BadRequestException(
        'The uploaded file contains no extractable text content.',
      );
    }

    const rawBands = this.extractBandsFromText(textContent);

    if (rawBands.length === 0) {
      throw new BadRequestException(
        'Could not detect any valid Initial Grade range pairs in the uploaded document.',
      );
    }

    // Sort bands by minInitialGrade descending
    const sortedBands = [...rawBands].sort(
      (a, b) => b.minInitialGrade - a.minInitialGrade,
    );

    let isValid = true;
    let validationMessage = 'Valid Transmutation Table structure detected.';
    try {
      validateAnnualTransmutationBands(sortedBands);
    } catch (error) {
      isValid = false;
      validationMessage =
        error instanceof Error
          ? error.message
          : 'Transmutation table ranges are invalid.';
    }

    const title = filename
      .replace(/\.[^/.]+$/, '')
      .replace(/_/g, ' ')
      .toUpperCase();

    return {
      title: title || 'CUSTOM TRANSMUTATION TABLE',
      filename,
      bandCount: sortedBands.length,
      isValid,
      validationMessage,
      bands: sortedBands,
    };
  }

  /**
   * Parses text lines looking for range pairs: (Min - Max -> Transmuted) or (Single -> Transmuted)
   */
  private extractBandsFromText(text: string): TransmutationBand[] {
    const lines = text.split(/\r?\n/);
    const bands: TransmutationBand[] = [];
    const seen = new Set<string>();

    for (const rawLine of lines) {
      const line = rawLine.replace(/%/g, '').trim();
      if (!line) continue;

      // Pattern 1: Range format: "98.40 - 99.99 99" or "98.40 - 99.99 -> 99" or "98.40 to 99.99: 99"
      const rangeMatch = line.match(
        /^(\d+(?:\.\d+)?)\s*[-–—to]+\s*(\d+(?:\.\d+)?)\s+(?:(?:->|=>|:|=)\s*)?(\d+)$/i,
      );
      if (rangeMatch) {
        const val1 = parseFloat(rangeMatch[1]);
        const val2 = parseFloat(rangeMatch[2]);
        const transmuted = parseInt(rangeMatch[3], 10);

        const minVal = Math.min(val1, val2);
        const maxVal = Math.max(val1, val2);

        const key = `${minVal}-${maxVal}-${transmuted}`;
        if (
          !seen.has(key) &&
          Number.isFinite(minVal) &&
          Number.isFinite(transmuted) &&
          transmuted <= 100
        ) {
          seen.add(key);
          bands.push({
            minInitialGrade: minVal,
            maxInitialGrade: maxVal,
            transmutedGrade: transmuted,
          });
        }
        continue;
      }

      // Pattern 2: Single value format: "100.00 100" or "100 -> 100"
      const singleMatch = line.match(
        /^(\d+(?:\.\d+)?)\s+(?:(?:->|=>|:|=)\s*)?(\d+)$/,
      );
      if (singleMatch) {
        const initial = parseFloat(singleMatch[1]);
        const transmuted = parseInt(singleMatch[2], 10);

        const key = `${initial}-${initial}-${transmuted}`;
        if (
          !seen.has(key) &&
          Number.isFinite(initial) &&
          Number.isFinite(transmuted) &&
          transmuted <= 100
        ) {
          seen.add(key);
          bands.push({
            minInitialGrade: initial,
            maxInitialGrade: initial,
            transmutedGrade: transmuted,
          });
        }
      }
    }

    return bands;
  }

  /**
   * Applies confirmed transmutation table system-wide
   */
  @AcademicMutation()
  async applyTable(
    title: string,
    description: string | undefined,
    bands: TransmutationBand[],
    userId: string,
  ) {
    let validatedBands: TransmutationBand[];
    try {
      validatedBands = validateAnnualTransmutationBands(bands ?? []);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid transmutation table',
      );
    }

    const previous = await this.getActiveTableRecord();

    // Deactivate all active tables
    await this.db
      .update(transmutationTables)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(transmutationTables.isActive, true));

    // Create and activate new table
    const [inserted] = await this.db
      .insert(transmutationTables)
      .values({
        title,
        description: description || 'Uploaded and activated by Administrator',
        isSystemDefault: false,
        isActive: true,
        bands: validatedBands,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    this.clearCache();
    this.logger.log(
      `Activated new transmutation table: ${inserted.title} (${inserted.id}) system-wide`,
    );
    const annualRefresh =
      await this.annualGradesService.refreshActiveSchoolYear(userId);
    await this.auditService.log({
      actorId: userId,
      action: 'academic.transmutation_table.activated',
      targetType: 'transmutation_table',
      targetId: inserted.id,
      metadata: { previousTableId: previous.id, annualRefresh },
    });

    return { ...inserted, annualRefresh };
  }

  /**
   * Activates an existing table by ID
   */
  @AcademicMutation()
  async activateTableById(id: string, userId: string) {
    const existing = await this.db
      .select()
      .from(transmutationTables)
      .where(eq(transmutationTables.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(
        `Transmutation table with ID ${id} not found.`,
      );
    }
    try {
      validateAnnualTransmutationBands(existing[0].bands);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid transmutation table',
      );
    }

    const previous = await this.getActiveTableRecord();

    await this.db
      .update(transmutationTables)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(transmutationTables.isActive, true));

    const [updated] = await this.db
      .update(transmutationTables)
      .set({ isActive: true, updatedBy: userId, updatedAt: new Date() })
      .where(eq(transmutationTables.id, id))
      .returning();

    this.clearCache();
    const annualRefresh =
      await this.annualGradesService.refreshActiveSchoolYear(userId);
    await this.auditService.log({
      actorId: userId,
      action: 'academic.transmutation_table.activated',
      targetType: 'transmutation_table',
      targetId: updated.id,
      metadata: { previousTableId: previous.id, annualRefresh },
    });
    return { ...updated, annualRefresh };
  }
}

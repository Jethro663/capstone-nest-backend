import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import {
  transmutationTables,
  TransmutationBand,
} from '../../drizzle/schema/transmutation.schema';

export interface TransmutationPreviewResult {
  title: string;
  filename?: string;
  bandCount: number;
  isValid: boolean;
  validationMessage: string;
  bands: TransmutationBand[];
}

export const DEFAULT_DEPED_TRANSMUTATION_BANDS: TransmutationBand[] = [
  { minInitialGrade: 100, maxInitialGrade: 100, transmutedGrade: 100 },
  { minInitialGrade: 98.4, maxInitialGrade: 99.99, transmutedGrade: 99 },
  { minInitialGrade: 96.8, maxInitialGrade: 98.39, transmutedGrade: 98 },
  { minInitialGrade: 95.2, maxInitialGrade: 96.79, transmutedGrade: 97 },
  { minInitialGrade: 93.6, maxInitialGrade: 95.19, transmutedGrade: 96 },
  { minInitialGrade: 92, maxInitialGrade: 93.59, transmutedGrade: 95 },
  { minInitialGrade: 90.4, maxInitialGrade: 91.99, transmutedGrade: 94 },
  { minInitialGrade: 88.8, maxInitialGrade: 90.3, transmutedGrade: 93 },
  { minInitialGrade: 87.2, maxInitialGrade: 88.79, transmutedGrade: 92 },
  { minInitialGrade: 85.6, maxInitialGrade: 87.19, transmutedGrade: 91 },
  { minInitialGrade: 84, maxInitialGrade: 85.59, transmutedGrade: 90 },
  { minInitialGrade: 82.4, maxInitialGrade: 83.99, transmutedGrade: 89 },
  { minInitialGrade: 80.8, maxInitialGrade: 82.39, transmutedGrade: 88 },
  { minInitialGrade: 79.2, maxInitialGrade: 80.79, transmutedGrade: 87 },
  { minInitialGrade: 77.6, maxInitialGrade: 79.19, transmutedGrade: 86 },
  { minInitialGrade: 76, maxInitialGrade: 77.59, transmutedGrade: 85 },
  { minInitialGrade: 74.4, maxInitialGrade: 75.99, transmutedGrade: 84 },
  { minInitialGrade: 72.8, maxInitialGrade: 74.39, transmutedGrade: 83 },
  { minInitialGrade: 71.2, maxInitialGrade: 72.79, transmutedGrade: 82 },
  { minInitialGrade: 69.6, maxInitialGrade: 71.19, transmutedGrade: 81 },
  { minInitialGrade: 68, maxInitialGrade: 69.59, transmutedGrade: 80 },
  { minInitialGrade: 66.4, maxInitialGrade: 67.99, transmutedGrade: 79 },
  { minInitialGrade: 64.8, maxInitialGrade: 66.39, transmutedGrade: 78 },
  { minInitialGrade: 63.2, maxInitialGrade: 64.79, transmutedGrade: 77 },
  { minInitialGrade: 61.6, maxInitialGrade: 63.19, transmutedGrade: 76 },
  { minInitialGrade: 60, maxInitialGrade: 61.59, transmutedGrade: 75 },
  { minInitialGrade: 56, maxInitialGrade: 59.99, transmutedGrade: 74 },
  { minInitialGrade: 52, maxInitialGrade: 55.99, transmutedGrade: 73 },
  { minInitialGrade: 48, maxInitialGrade: 51.99, transmutedGrade: 72 },
  { minInitialGrade: 44, maxInitialGrade: 47.99, transmutedGrade: 71 },
  { minInitialGrade: 40, maxInitialGrade: 43.99, transmutedGrade: 70 },
  { minInitialGrade: 36, maxInitialGrade: 39.99, transmutedGrade: 69 },
  { minInitialGrade: 32, maxInitialGrade: 35.99, transmutedGrade: 68 },
  { minInitialGrade: 28, maxInitialGrade: 31.99, transmutedGrade: 67 },
  { minInitialGrade: 24, maxInitialGrade: 27.99, transmutedGrade: 66 },
  { minInitialGrade: 20, maxInitialGrade: 23.99, transmutedGrade: 65 },
  { minInitialGrade: 16, maxInitialGrade: 19.99, transmutedGrade: 64 },
  { minInitialGrade: 12, maxInitialGrade: 15.99, transmutedGrade: 63 },
  { minInitialGrade: 8, maxInitialGrade: 11.99, transmutedGrade: 62 },
  { minInitialGrade: 4, maxInitialGrade: 7.99, transmutedGrade: 61 },
  { minInitialGrade: 0, maxInitialGrade: 3.99, transmutedGrade: 60 },
];

@Injectable()
export class TransmutationService {
  private readonly logger = new Logger(TransmutationService.name);
  private cachedActiveBands: TransmutationBand[] | null = null;

  constructor(private readonly databaseService: DatabaseService) {}

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
      title: 'DepEd Order No. 8 s. 2015 Transmutation Table (System Default)',
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

    // Validate coverage
    const hasTop = sortedBands.some((b) => b.maxInitialGrade >= 99);
    const hasBottom = sortedBands.some(
      (b) => b.minInitialGrade <= 0 || b.minInitialGrade <= 25,
    );
    const isValid = hasTop && hasBottom && sortedBands.length >= 10;

    let validationMessage = 'Valid Transmutation Table structure detected.';
    if (!isValid) {
      validationMessage =
        'Warning: Table ranges may be incomplete or missing upper/lower thresholds.';
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
  async applyTable(
    title: string,
    description: string | undefined,
    bands: TransmutationBand[],
    userId?: string,
  ) {
    if (!bands || bands.length === 0) {
      throw new BadRequestException(
        'Cannot apply an empty transmutation table.',
      );
    }

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
        bands,
        updatedBy: userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    this.clearCache();
    this.logger.log(
      `Activated new transmutation table: ${inserted.title} (${inserted.id}) system-wide`,
    );

    return inserted;
  }

  /**
   * Activates an existing table by ID
   */
  async activateTableById(id: string, userId?: string) {
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

    await this.db
      .update(transmutationTables)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(transmutationTables.isActive, true));

    const [updated] = await this.db
      .update(transmutationTables)
      .set({ isActive: true, updatedBy: userId || null, updatedAt: new Date() })
      .where(eq(transmutationTables.id, id))
      .returning();

    this.clearCache();
    return updated;
  }
}

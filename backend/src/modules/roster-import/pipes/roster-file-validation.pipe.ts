import {
  Injectable,
  PipeTransform,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  MAX_ROSTER_FILE_SIZE_BYTES,
  ALLOWED_ROSTER_MIME_TYPES,
} from '../constants/roster-import.constants';

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

/**
 * Validates a roster file upload:
 *  1. File must be present.
 *  2. Size must not exceed MAX_ROSTER_FILE_SIZE_BYTES.
 *  3. Magic-byte check for xlsx (ZIP signature PK\x03\x04).
 *     CSV has no magic bytes — extension + declared MIME are used as fallback.
 *  4. File extension must be .csv, .xlsx, or .xls.
 *
 * On rejection the uploaded temp file is deleted from disk.
 */
@Injectable()
export class RosterFileValidationPipe implements PipeTransform {
  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) {
      throw new UnsupportedMediaTypeException(
        'A CSV or XLSX file is required. Ensure the uploaded file is a valid roster file.',
      );
    }

    // ── 1. Size guard ─────────────────────────────────────────────────────────
    if (file.size > MAX_ROSTER_FILE_SIZE_BYTES) {
      await this.cleanup(file.path);
      throw new PayloadTooLargeException(
        `File exceeds the 10 MB limit (received ${(file.size / 1_048_576).toFixed(2)} MB)`,
      );
    }

    // ── 2. Extension guard ────────────────────────────────────────────────────
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      await this.cleanup(file.path);
      throw new UnsupportedMediaTypeException(
        `Only .csv, .xlsx, and .xls files are permitted. Received: "${ext || 'no extension'}"`,
      );
    }

    // ── 3. Magic-byte / content check ─────────────────────────────────────────
    try {
      if (ext === '.xlsx' || ext === '.xls') {
        // XLSX files are ZIP archives — first 4 bytes must be PK\x03\x04
        const fd = fs.openSync(file.path, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);

        const isZip =
          buf[0] === 0x50 && // P
          buf[1] === 0x4b && // K
          buf[2] === 0x03 &&
          buf[3] === 0x04;

        if (!isZip) {
          await this.cleanup(file.path);
          throw new UnsupportedMediaTypeException(
            'The uploaded file does not appear to be a valid Excel (.xlsx/.xls) file.',
          );
        }
      } else {
        // CSV: verify first kb is valid UTF-8 text (no binary null bytes)
        const fd = fs.openSync(file.path, 'r');
        const buf = Buffer.alloc(1024);
        const bytesRead = fs.readSync(fd, buf, 0, 1024, 0);
        fs.closeSync(fd);

        const slice = buf.subarray(0, bytesRead);
        if (slice.includes(0x00)) {
          await this.cleanup(file.path);
          throw new UnsupportedMediaTypeException(
            'The uploaded CSV file contains binary data and is not a valid text file.',
          );
        }
      }
    } catch (err) {
      if (
        err instanceof UnsupportedMediaTypeException ||
        err instanceof PayloadTooLargeException
      ) {
        throw err;
      }
      await this.cleanup(file.path);
      throw new BadRequestException('Could not read uploaded file for validation.');
    }

    return file;
  }

  private async cleanup(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Best-effort cleanup — ignore ENOENT
    }
  }
}

import {
  Injectable,
  PipeTransform,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { MAX_FILE_SIZE_BYTES } from '../constants/file-upload.constants';

@Injectable()
export class PdfValidationPipe implements PipeTransform {
  async transform(file: Express.Multer.File) {
    if (!file) {
      // file is undefined either when no file was sent OR when multer's coarse
      // fileFilter silently rejected it (wrong MIME type pre-check).
      throw new UnsupportedMediaTypeException(
        'A PDF file is required. Ensure the uploaded file is a valid PDF (application/pdf).',
      );
    }

    // Size guard (multer already enforces this, but double-check in pipe)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      await this.cleanup(file.path);
      throw new PayloadTooLargeException(
        `File exceeds the 100 MB limit (received ${(file.size / 1_048_576).toFixed(2)} MB)`,
      );
    }

    // Magic-bytes check: PDF files always start with %PDF (0x25 0x50 0x44 0x46)
    const absolutePath = path.resolve(file.path);
    let isPdf = false;
    try {
      const fd = fs.openSync(absolutePath, 'r');
      const header = Buffer.alloc(4);
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);
      isPdf =
        header[0] === 0x25 && // %
        header[1] === 0x50 && // P
        header[2] === 0x44 && // D
        header[3] === 0x46; // F
    } catch (err: unknown) {
      await this.cleanup(absolutePath);
      const detail = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Could not read uploaded file for validation: ${detail}`,
      );
    }

    if (!isPdf) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'Only PDF files are permitted. The uploaded file is not a valid PDF.',
      );
    }

    return file;
  }

  private async cleanup(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Best-effort cleanup
    }
  }
}

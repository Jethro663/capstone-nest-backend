import {
  Injectable,
  PipeTransform,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '../constants/file-upload.constants';

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

    // Magic-bytes check: read first 4 100 bytes and let file-type detect the real MIME
    let detected: { mime: string } | undefined;
    try {
      // file-type@16 is CommonJS; require() avoids ESM interop issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { fileTypeFromBuffer } = require('file-type');
      const fd = fs.openSync(file.path, 'r');
      const buf = Buffer.alloc(4100);
      const bytesRead = fs.readSync(fd, buf, 0, 4100, 0);
      fs.closeSync(fd);
      detected = await fileTypeFromBuffer(buf.subarray(0, bytesRead));
    } catch {
      await this.cleanup(file.path);
      throw new BadRequestException('Could not read uploaded file for validation');
    }

    if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime as typeof ALLOWED_MIME_TYPES[number])) {
      await this.cleanup(file.path);
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

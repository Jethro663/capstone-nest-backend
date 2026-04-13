import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  PipeTransform,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  ALLOWED_MIME_TYPES,
  LIBRARY_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from '../constants/file-upload.constants';

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export type LibraryFileKind = 'pdf' | 'txt' | 'pptx';

export function getLibraryFileKind(file: Express.Multer.File): LibraryFileKind {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.mimetype === 'application/pdf' && ext === '.pdf') return 'pdf';
  if (file.mimetype === 'text/plain' && ext === '.txt') return 'txt';
  if (file.mimetype === PPTX_MIME && ext === '.pptx') return 'pptx';

  throw new UnsupportedMediaTypeException(
    'Only PDF, TXT, and PPTX library files are supported. Legacy PPT requires a configured converter and is not enabled.',
  );
}

@Injectable()
export class LibraryFileValidationPipe implements PipeTransform {
  async transform(file: Express.Multer.File) {
    if (!file) {
      throw new UnsupportedMediaTypeException(
        'A PDF, TXT, or PPTX file is required.',
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      await this.cleanup(file.path);
      throw new PayloadTooLargeException(
        `File exceeds the 100 MB limit (received ${(file.size / 1_048_576).toFixed(2)} MB)`,
      );
    }

    this.assertSafeOriginalName(file);
    const kind = getLibraryFileKind(file);
    await this.assertMagicBytes(file, kind);

    return file;
  }

  private assertSafeOriginalName(file: Express.Multer.File) {
    const baseName = path.basename(file.originalname);
    const ext = path.extname(baseName).toLowerCase();
    if (
      baseName !== file.originalname ||
      file.originalname.includes('..') ||
      file.originalname.includes('/') ||
      file.originalname.includes('\\')
    ) {
      throw new BadRequestException('File name contains an unsafe path segment.');
    }

    if (!LIBRARY_FILE_EXTENSIONS.includes(ext as (typeof LIBRARY_FILE_EXTENSIONS)[number])) {
      throw new UnsupportedMediaTypeException(
        'Only .pdf, .txt, and .pptx files are supported.',
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new UnsupportedMediaTypeException(
        'Unsupported file type. Upload PDF, TXT, or PPTX files only.',
      );
    }
  }

  private async assertMagicBytes(
    file: Express.Multer.File,
    kind: LibraryFileKind,
  ) {
    const absolutePath = path.resolve(file.path);
    let header: Buffer;

    try {
      const fd = fs.openSync(absolutePath, 'r');
      header = Buffer.alloc(8);
      fs.readSync(fd, header, 0, 8, 0);
      fs.closeSync(fd);
    } catch (err: unknown) {
      await this.cleanup(absolutePath);
      const detail = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Could not read uploaded file for validation: ${detail}`,
      );
    }

    const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
    const isZip = header[0] === 0x50 && header[1] === 0x4b;
    const looksBinary = header.includes(0x00);

    if (kind === 'pdf' && !isPdf) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'The uploaded PDF failed file signature validation.',
      );
    }

    if (kind === 'pptx' && !isZip) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'The uploaded PPTX failed file signature validation.',
      );
    }

    if (kind === 'txt' && looksBinary) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'The uploaded TXT file appears to contain binary data.',
      );
    }
  }

  private async cleanup(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Best-effort cleanup.
    }
  }
}

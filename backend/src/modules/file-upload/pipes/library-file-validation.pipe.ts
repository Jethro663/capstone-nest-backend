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

export type LibraryFileKind = 'pdf' | 'txt' | 'pptx' | 'document' | 'image' | 'file';

export function getLibraryFileKind(file: Express.Multer.File): LibraryFileKind {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') return 'pdf';
  if (['.txt', '.csv'].includes(ext)) return 'txt';
  if (['.pptx', '.ppt'].includes(ext)) return 'pptx';
  if (['.doc', '.docx', '.xls', '.xlsx'].includes(ext)) return 'document';
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return 'image';

  return 'file';
}

@Injectable()
export class LibraryFileValidationPipe implements PipeTransform {
  async transform(file: Express.Multer.File) {
    if (!file) {
      throw new UnsupportedMediaTypeException(
        'A supported document or image file is required.',
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
      throw new BadRequestException(
        'File name contains an unsafe path segment.',
      );
    }

    if (
      !LIBRARY_FILE_EXTENSIONS.includes(
        ext as (typeof LIBRARY_FILE_EXTENSIONS)[number],
      )
    ) {
      throw new UnsupportedMediaTypeException(
        'Only .pdf, .txt, .csv, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .jpg, .jpeg, .png, and .webp files are supported.',
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

    const isPdf =
      header[0] === 0x25 &&
      header[1] === 0x50 &&
      header[2] === 0x44 &&
      header[3] === 0x46;
    const isJpeg =
      header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPng =
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a;
    const riffHeader = header.subarray(0, 4).toString('ascii');
    const webpHeader = await this.readBytes(file, 8, 4);
    const isWebp =
      riffHeader === 'RIFF' && webpHeader.toString('ascii') === 'WEBP';
    const isZip = header[0] === 0x50 && header[1] === 0x4b;
    const isOleDoc =
      header[0] === 0xd0 &&
      header[1] === 0xcf &&
      header[2] === 0x11 &&
      header[3] === 0xe0;
    const looksBinary = header.includes(0x00);

    if (kind === 'pdf' && !isPdf) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'The uploaded PDF failed file signature validation.',
      );
    }

    if (kind === 'pptx' && !isZip && !isOleDoc) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'The uploaded presentation failed file signature validation.',
      );
    }

    if (kind === 'document' && !isZip && !isOleDoc) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'The uploaded document failed file signature validation.',
      );
    }

    if (kind === 'txt' && looksBinary) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'The uploaded text file appears to contain invalid binary data.',
      );
    }

    if (kind === 'image' && !isJpeg && !isPng && !isWebp) {
      await this.cleanup(absolutePath);
      throw new UnsupportedMediaTypeException(
        'The uploaded image failed file signature validation.',
      );
    }
  }

  private async readBytes(
    file: Express.Multer.File,
    position: number,
    length: number,
  ) {
    const absolutePath = path.resolve(file.path);
    const fd = fs.openSync(absolutePath, 'r');
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, position);
    fs.closeSync(fd);
    return buffer;
  }

  private async cleanup(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Best-effort cleanup.
    }
  }
}

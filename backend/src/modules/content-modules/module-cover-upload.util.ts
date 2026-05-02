import {
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const MODULE_COVER_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MODULE_COVER_ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]);

export const MODULE_COVER_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function normalizeExtension(extension: string) {
  const lower = extension.toLowerCase();
  return lower === '.jpeg' ? '.jpg' : lower;
}

function detectImageExtension(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return '.png';
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return '.jpg';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return '.webp';
  }

  return null;
}

export function persistValidatedModuleCover(
  file: Express.Multer.File,
  destination: string,
) {
  if (!file?.buffer?.length) {
    throw new BadRequestException('Image upload is required');
  }

  if (file.size <= 0) {
    throw new BadRequestException('Image upload is empty');
  }

  if (file.size > MODULE_COVER_MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException('Image must be 5 MB or smaller');
  }

  const originalExtension = normalizeExtension(
    path.extname(file.originalname || ''),
  );
  if (!MODULE_COVER_ALLOWED_EXTENSIONS.has(originalExtension)) {
    throw new UnsupportedMediaTypeException(
      'Only PNG, JPG, JPEG, and WebP images are allowed',
    );
  }

  const mimeType = file.mimetype.toLowerCase();
  if (!MODULE_COVER_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new UnsupportedMediaTypeException(
      'Only PNG, JPG, JPEG, and WebP images are allowed',
    );
  }

  const detectedExtension = detectImageExtension(file.buffer);
  if (!detectedExtension) {
    throw new UnsupportedMediaTypeException(
      'Uploaded file is not a valid PNG, JPG, JPEG, or WebP image',
    );
  }

  fs.mkdirSync(destination, { recursive: true });
  const filename = `${uuidv4()}_${Date.now()}${detectedExtension}`;
  const storedPath = path.join(destination, filename);
  fs.writeFileSync(storedPath, file.buffer);
  return { filename, storedPath };
}

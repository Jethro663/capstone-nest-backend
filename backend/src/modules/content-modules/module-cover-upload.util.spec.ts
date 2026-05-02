import {
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as fs from 'fs';
import {
  MODULE_COVER_MAX_FILE_SIZE_BYTES,
  persistValidatedModuleCover,
} from './module-cover-upload.util';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn7sN8AAAAASUVORK5CYII=';
const WEBP_BASE64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAAAfQ//73v/+BiOh/AAA=';

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

const mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;
const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<
  typeof fs.writeFileSync
>;

function makeFile(overrides: Partial<Express.Multer.File> = {}) {
  const buffer = overrides.buffer ?? Buffer.from(PNG_BASE64, 'base64');
  return {
    fieldname: 'image',
    originalname: 'cover.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: buffer.length,
    buffer,
    stream: undefined as unknown as NodeJS.ReadableStream,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  } as Express.Multer.File;
}

describe('persistValidatedModuleCover', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stores a verified png using a server-generated filename', () => {
    const result = persistValidatedModuleCover(
      makeFile(),
      './uploads/module-covers',
    );

    expect(mockMkdirSync).toHaveBeenCalledWith('./uploads/module-covers', {
      recursive: true,
    });
    expect(mockWriteFileSync).toHaveBeenCalled();
    expect(result.filename).toMatch(/\.png$/);
  });

  it('rejects a disallowed extension even when mime says image', () => {
    expect(() =>
      persistValidatedModuleCover(
        makeFile({ originalname: 'cover.gif', mimetype: 'image/gif' }),
        './uploads/module-covers',
      ),
    ).toThrow(UnsupportedMediaTypeException);
  });

  it('rejects a spoofed image mime when signature is not an image', () => {
    expect(() =>
      persistValidatedModuleCover(
        makeFile({
          originalname: 'cover.png',
          mimetype: 'image/png',
          buffer: Buffer.from("print('nope')"),
          size: Buffer.byteLength("print('nope')"),
        }),
        './uploads/module-covers',
      ),
    ).toThrow(UnsupportedMediaTypeException);
  });

  it('rejects files larger than 5 mb', () => {
    expect(() =>
      persistValidatedModuleCover(
        makeFile({
          size: MODULE_COVER_MAX_FILE_SIZE_BYTES + 1,
          buffer: Buffer.alloc(MODULE_COVER_MAX_FILE_SIZE_BYTES + 1, 1),
        }),
        './uploads/module-covers',
      ),
    ).toThrow(BadRequestException);
  });

  it('accepts verified webp files', () => {
    const result = persistValidatedModuleCover(
      makeFile({
        originalname: 'cover.webp',
        mimetype: 'image/webp',
        buffer: Buffer.from(WEBP_BASE64, 'base64'),
        size: Buffer.from(WEBP_BASE64, 'base64').length,
      }),
      './uploads/module-covers',
    );

    expect(result.filename).toMatch(/\.webp$/);
  });
});

import { UnsupportedMediaTypeException } from '@nestjs/common';
import * as path from 'path';
import {
  getLibraryFileKind,
  LibraryFileValidationPipe,
} from './library-file-validation.pipe';

const mockOpenSync = jest.fn().mockReturnValue(3);
const mockReadSync = jest.fn();
const mockCloseSync = jest.fn();
const mockUnlink = jest.fn().mockResolvedValue(undefined);

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  openSync: (...args: unknown[]) => mockOpenSync(...args),
  readSync: (...args: unknown[]) => mockReadSync(...args),
  closeSync: (...args: unknown[]) => mockCloseSync(...args),
  promises: {
    ...jest.requireActual<typeof import('fs')>('fs').promises,
    unlink: (...args: unknown[]) => mockUnlink(...args),
  },
}));

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const WEBP_RIFF = Buffer.from('RIFFxxxx', 'ascii');
const WEBP_TAG = Buffer.from('WEBP', 'ascii');

const makeFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'diagram.png',
    encoding: '7bit',
    mimetype: 'image/png',
    path: '/tmp/uploads/library/diagram.png',
    filename: 'diagram.png',
    size: 2048,
    destination: '/tmp/uploads/library',
    buffer: Buffer.alloc(0),
    stream: null as any,
    ...overrides,
  }) as Express.Multer.File;

describe('LibraryFileValidationPipe image support', () => {
  let pipe: LibraryFileValidationPipe;
  let header = PNG_MAGIC;
  let webpTag = Buffer.alloc(4);

  beforeEach(() => {
    jest.clearAllMocks();
    pipe = new LibraryFileValidationPipe();
    header = PNG_MAGIC;
    webpTag = Buffer.alloc(4);
    mockReadSync.mockImplementation(
      (
        _fd: number,
        buffer: Buffer,
        _offset: number,
        length: number,
        position: number,
      ) => {
        const source = position === 8 ? webpTag : header;
        source.copy(buffer);
        return Math.min(length, source.length);
      },
    );
  });

  it('classifies supported image extensions as image library files', () => {
    expect(
      getLibraryFileKind(
        makeFile({ originalname: 'photo.jpg', mimetype: 'image/jpeg' }),
      ),
    ).toBe('image');
    expect(
      getLibraryFileKind(
        makeFile({ originalname: 'photo.jpeg', mimetype: 'image/jpeg' }),
      ),
    ).toBe('image');
    expect(
      getLibraryFileKind(
        makeFile({ originalname: 'diagram.png', mimetype: 'image/png' }),
      ),
    ).toBe('image');
    expect(
      getLibraryFileKind(
        makeFile({ originalname: 'graphic.webp', mimetype: 'image/webp' }),
      ),
    ).toBe('image');
  });

  it('accepts a PNG upload with a valid image signature', async () => {
    const file = makeFile();

    await expect(pipe.transform(file)).resolves.toBe(file);
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('accepts a WEBP upload with a valid RIFF WEBP signature', async () => {
    header = WEBP_RIFF;
    webpTag = WEBP_TAG;
    const file = makeFile({
      originalname: 'graphic.webp',
      mimetype: 'image/webp',
    });

    await expect(pipe.transform(file)).resolves.toBe(file);
  });

  it('rejects spoofed images and removes the temporary file', async () => {
    header = PDF_MAGIC;
    const file = makeFile({
      originalname: 'diagram.png',
      mimetype: 'image/png',
    });

    await expect(pipe.transform(file)).rejects.toThrow(
      UnsupportedMediaTypeException,
    );
    expect(mockUnlink).toHaveBeenCalledWith(path.resolve(file.path));
  });

  it('rejects unsupported image types such as GIF', async () => {
    expect(() =>
      getLibraryFileKind(
        makeFile({ originalname: 'animation.gif', mimetype: 'image/gif' }),
      ),
    ).toThrow(UnsupportedMediaTypeException);
  });
});

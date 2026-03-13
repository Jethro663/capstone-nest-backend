import {
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { RosterFileValidationPipe } from './roster-file-validation.pipe';
import { MAX_ROSTER_FILE_SIZE_BYTES } from '../constants/roster-import.constants';

// -----------------------------------------------------------------------------
// Mocks for filesystem operations
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK.. zip signature
const TXT_SAMPLE = Buffer.from('name,lrn,email\n');

const makeFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'roster.xlsx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    path: '/tmp/roster/fake.xlsx',
    filename: 'fake.xlsx',
    size: 1024,
    destination: '/tmp/roster',
    buffer: Buffer.alloc(0),
    stream: null as any,
    ...overrides,
  }) as any;

// -----------------------------------------------------------------------------
// Test suite
// -----------------------------------------------------------------------------

describe('RosterFileValidationPipe', () => {
  let pipe: RosterFileValidationPipe;

  beforeEach(() => {
    jest.clearAllMocks();
    pipe = new RosterFileValidationPipe();

    // default readSync returns ZIP header for xlsx
    mockReadSync.mockImplementation((_fd, buf: Buffer) => {
      XLSX_MAGIC.copy(buf);
      return XLSX_MAGIC.length;
    });
  });

  // -------------------------------------------------------------------------
  it('accepts a valid .xlsx file', async () => {
    const file = makeFile();
    await expect(pipe.transform(file)).resolves.toBe(file);
  });

  it('rejects files larger than the configured maximum', async () => {
    const file = makeFile({ size: MAX_ROSTER_FILE_SIZE_BYTES + 1 });
    await expect(pipe.transform(file)).rejects.toThrow(
      PayloadTooLargeException,
    );
    expect(mockUnlink).toHaveBeenCalledWith(file.path);
  });

  it('rejects unsupported extensions', async () => {
    const file = makeFile({
      originalname: 'evil.exe',
      mimetype: 'application/vnd.microsoft.portable-executable',
    });
    await expect(pipe.transform(file)).rejects.toThrow(
      UnsupportedMediaTypeException,
    );
    expect(mockUnlink).toHaveBeenCalledWith(file.path);
  });

  it('rejects a .xlsx whose magic bytes are not ZIP', async () => {
    mockReadSync.mockImplementation((_fd, buf: Buffer) => {
      TXT_SAMPLE.copy(buf);
      return TXT_SAMPLE.length;
    });
    const file = makeFile();
    await expect(pipe.transform(file)).rejects.toThrow(
      UnsupportedMediaTypeException,
    );
    expect(mockUnlink).toHaveBeenCalledWith(file.path);
  });

  it('accepts a plain CSV text file', async () => {
    const csvFile = makeFile({
      originalname: 'class.csv',
      mimetype: 'text/csv',
    });
    // override readSync so pipe treats it as text (no null bytes)
    mockReadSync.mockImplementation((_fd, buf: Buffer) => {
      TXT_SAMPLE.copy(buf);
      return TXT_SAMPLE.length;
    });

    await expect(pipe.transform(csvFile)).resolves.toBe(csvFile);
  });

  it('throws when file is undefined', async () => {
    await expect(pipe.transform(undefined as any)).rejects.toThrow(
      UnsupportedMediaTypeException,
    );
  });

  it('throws BadRequestException when file cannot be read', async () => {
    mockOpenSync.mockImplementation(() => {
      throw new Error('EACCES');
    });

    const file = makeFile();
    await expect(pipe.transform(file)).rejects.toThrow(
      'Could not read uploaded file for validation.',
    );
    expect(mockUnlink).toHaveBeenCalledWith(file.path);
  });
});

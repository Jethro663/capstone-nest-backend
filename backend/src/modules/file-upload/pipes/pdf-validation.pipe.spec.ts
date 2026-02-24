import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PdfValidationPipe } from './pdf-validation.pipe';
import { MAX_FILE_SIZE_BYTES } from '../constants/file-upload.constants';

// ---------------------------------------------------------------------------
// Mock 'fs' with a factory so all properties are writable jest.fn() instances
// ---------------------------------------------------------------------------

const mockOpenSync  = jest.fn().mockReturnValue(3);
const mockReadSync  = jest.fn();
const mockCloseSync = jest.fn();
const mockUnlink    = jest.fn().mockResolvedValue(undefined);

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  openSync:  (...args: unknown[]) => mockOpenSync(...args),
  readSync:  (...args: unknown[]) => mockReadSync(...args),
  closeSync: (...args: unknown[]) => mockCloseSync(...args),
  promises: {
    ...jest.requireActual<typeof import('fs')>('fs').promises,
    unlink: (...args: unknown[]) => mockUnlink(...args),
  },
}));

// ---------------------------------------------------------------------------
// Mock file-type (CJS require inside the pipe)
// ---------------------------------------------------------------------------

let mockFileTypeResult: { mime: string } | undefined = { mime: 'application/pdf' };

jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(async () => mockFileTypeResult),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]); // PNG header
const EMPTY_BUF = Buffer.alloc(10);

// Default readSync: copy PDF magic bytes into the caller's buffer
const defaultReadSync = (_fd: number, buf: Buffer, _off: number, _len: number, _pos: number) => {
  PDF_MAGIC.copy(buf);
  return PDF_MAGIC.length;
};

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    fieldname:    'file',
    originalname: 'lecture.pdf',
    encoding:     '7bit',
    mimetype:     'application/pdf',
    path:         '/tmp/uploads/pdfs/test-uuid.pdf',
    filename:     'test-uuid.pdf',
    size:         1_048_576,
    destination:  '/tmp/uploads/pdfs',
    buffer:       Buffer.alloc(0),
    stream:       null as any,
    ...overrides,
  }) as Express.Multer.File;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PdfValidationPipe', () => {
  let pipe: PdfValidationPipe;

  beforeEach(() => {
    jest.clearAllMocks();
    pipe = new PdfValidationPipe();
    mockFileTypeResult = { mime: 'application/pdf' };

    // Default: behave as if fs returns a real PDF header
    mockOpenSync.mockReturnValue(3);
    mockReadSync.mockImplementation(defaultReadSync);
    mockUnlink.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('valid PDF upload', () => {
    it('returns the file unchanged when it is a real PDF', async () => {
      const file = makeFile();
      const result = await pipe.transform(file);
      expect(result).toBe(file);
    });

    it('opens, reads, and closes the file descriptor', async () => {
      await pipe.transform(makeFile());

      expect(mockOpenSync).toHaveBeenCalledWith(
        expect.stringContaining('test-uuid.pdf'),
        'r',
      );
      expect(mockReadSync).toHaveBeenCalledTimes(1);
      expect(mockCloseSync).toHaveBeenCalledTimes(1);
    });

    it('does NOT call unlink on a valid PDF', async () => {
      await pipe.transform(makeFile());
      expect(mockUnlink).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // No file supplied (multer rejected silently or field missing)
  // -------------------------------------------------------------------------

  describe('no file provided', () => {
    it('throws UnsupportedMediaTypeException when file is undefined', async () => {
      await expect(pipe.transform(undefined as any)).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
    });

    it('throws UnsupportedMediaTypeException when file is null', async () => {
      await expect(pipe.transform(null as any)).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
    });

    it('throws with a message that guides the user toward PDF requirement', async () => {
      await expect(pipe.transform(undefined as any)).rejects.toThrow(
        /PDF file is required/i,
      );
    });
  });

  // -------------------------------------------------------------------------
  // File exceeds 100 MB
  // -------------------------------------------------------------------------

  describe('oversized file', () => {
    it('throws PayloadTooLargeException for a file over 100 MB', async () => {
      const file = makeFile({ size: MAX_FILE_SIZE_BYTES + 1 });

      await expect(pipe.transform(file)).rejects.toThrow(
        PayloadTooLargeException,
      );
    });

    it('cleans up the temp file when size exceeds limit', async () => {
      const file = makeFile({ size: MAX_FILE_SIZE_BYTES + 1 });

      await expect(pipe.transform(file)).rejects.toThrow(PayloadTooLargeException);

      expect(mockUnlink).toHaveBeenCalledWith(file.path);
    });

    it('does NOT throw for a file exactly at the 100 MB limit', async () => {
      const file = makeFile({ size: MAX_FILE_SIZE_BYTES });

      await expect(pipe.transform(file)).resolves.toBe(file);
    });

    it('error message includes the actual received size in MB', async () => {
      const size = MAX_FILE_SIZE_BYTES + 1_048_576; // 101 MB
      const file  = makeFile({ size });

      await expect(pipe.transform(file)).rejects.toThrow(/101\.00 MB/);
    });
  });

  // -------------------------------------------------------------------------
  // Magic-bytes mismatch (real file is not a PDF)
  // -------------------------------------------------------------------------

  describe('non-PDF magic bytes', () => {
    it('throws UnsupportedMediaTypeException when file-type detects a non-PDF MIME', async () => {
      mockFileTypeResult = { mime: 'image/png' };
      mockReadSync.mockImplementation((_fd: number, buf: Buffer, _off: number, _len: number, _pos: number) => {
        PNG_MAGIC.copy(buf);
        return PNG_MAGIC.length;
      });

      const file = makeFile({ mimetype: 'application/pdf' }); // MIME header spoofed as PDF

      await expect(pipe.transform(file)).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
    });

    it('cleans up the temp file on MIME mismatch', async () => {
      mockFileTypeResult = { mime: 'image/png' };
      const file = makeFile();

      await expect(pipe.transform(file)).rejects.toThrow(UnsupportedMediaTypeException);

      expect(mockUnlink).toHaveBeenCalledWith(file.path);
    });

    it('throws UnsupportedMediaTypeException when file-type returns undefined (unrecognised bytes)', async () => {
      mockFileTypeResult = undefined;
      mockReadSync.mockImplementation((_fd: number, buf: Buffer, _off: number, _len: number, _pos: number) => {
        EMPTY_BUF.copy(buf);
        return EMPTY_BUF.length;
      });

      await expect(pipe.transform(makeFile())).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
    });

    it('error message mentions PDF', async () => {
      mockFileTypeResult = { mime: 'application/zip' };

      await expect(pipe.transform(makeFile())).rejects.toThrow(/PDF/i);
    });
  });

  // -------------------------------------------------------------------------
  // File I/O failure (disk error during validation)
  // -------------------------------------------------------------------------

  describe('I/O error during validation', () => {
    it('throws BadRequestException when fs.openSync throws', async () => {
      mockOpenSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });

      await expect(pipe.transform(makeFile())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cleans up the temp file on I/O error', async () => {
      mockOpenSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });

      await expect(pipe.transform(makeFile())).rejects.toThrow(BadRequestException);

      expect(mockUnlink).toHaveBeenCalled();
    });

    it('throws BadRequestException when fs.readSync throws', async () => {
      mockReadSync.mockImplementation(() => {
        throw new Error('EIO: i/o error');
      });

      await expect(pipe.transform(makeFile())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup resilience (unlink itself fails — should not mask the original error)
  // -------------------------------------------------------------------------

  describe('cleanup resilience', () => {
    it('does not throw a secondary error when unlink fails during size-limit rejection', async () => {
      mockUnlink.mockRejectedValue(new Error('unlink failed'));
      const file = makeFile({ size: MAX_FILE_SIZE_BYTES + 1 });

      // Should still throw PayloadTooLargeException, not the unlink error
      await expect(pipe.transform(file)).rejects.toThrow(PayloadTooLargeException);
    });

    it('does not throw a secondary error when unlink fails during MIME rejection', async () => {
      mockUnlink.mockRejectedValue(new Error('unlink failed'));
      mockFileTypeResult = { mime: 'image/jpeg' };

      await expect(pipe.transform(makeFile())).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
    });
  });
});

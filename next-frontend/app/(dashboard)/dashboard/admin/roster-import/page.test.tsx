'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';
import RosterImportPage from './page';
import { sectionService } from '@/services/section-service';
import { rosterImportService } from '@/services/roster-import-service';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/services/section-service', () => ({
  sectionService: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/services/roster-import-service', () => ({
  rosterImportService: {
    getPending: jest.fn(),
    preview: jest.fn(),
    commit: jest.fn(),
  },
}));

const mockedSectionService = sectionService as jest.Mocked<typeof sectionService>;
const mockedRosterImportService = rosterImportService as jest.Mocked<typeof rosterImportService>;
const mockedToast = toast as unknown as { success: jest.Mock; error: jest.Mock };
type SectionListResponse = Awaited<ReturnType<typeof sectionService.getAll>>;
type PendingResponse = Awaited<ReturnType<typeof rosterImportService.getPending>>;
type PreviewResponse = Awaited<ReturnType<typeof rosterImportService.preview>>;

function readBlobAsArrayBuffer(blob: Blob) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function readBlobAsText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('RosterImportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSectionService.getAll.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'section-1',
          name: 'Grade 7 - Rizal',
          gradeLevel: '7',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    } as SectionListResponse);
    mockedRosterImportService.getPending.mockResolvedValue({
      success: true,
      data: [],
    } as PendingResponse);
    mockedRosterImportService.preview.mockResolvedValue({
      success: true,
      data: {
        sectionMatch: {
          fileHeader: 'Grade 7 - Rizal',
          foundSection: {
            id: 'section-1',
            name: 'Grade 7 - Rizal',
            gradeLevel: '7',
          },
        },
        registered: [
          {
            rowNumber: 2,
            email: 'liam@nexora.edu',
            name: {
              firstName: 'Liam',
              lastName: 'Navarro',
              middleName: 'Reyes',
            },
            lrn: '202407000001',
            userId: 'student-1',
            alreadyEnrolled: false,
            status: 'matched_existing_user',
          },
        ],
        pending: [
          {
            rowNumber: 3,
            email: 'mia@nexora.edu',
            name: {
              firstName: 'Mia',
              lastName: 'Villanueva',
              middleName: 'Santos',
            },
            lrn: '202407000002',
            reason: 'No existing account matched this row',
          },
        ],
        errors: [
          {
            rowNumber: 4,
            email: 'broken@nexora.edu',
            issues: ['LRN is required'],
          },
        ],
        summary: {
          totalDataRows: 3,
          validRows: 2,
          registeredCount: 1,
          alreadyEnrolledCount: 0,
          pendingCount: 1,
          errorCount: 1,
        },
      },
    } as PreviewResponse);
  });

  it('validates the edited roster draft without committing it', async () => {
    const { container } = render(<RosterImportPage />);

    const sectionSelect = await screen.findByLabelText('Target Section');
    fireEvent.change(sectionSelect, { target: { value: 'section-1' } });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(
      ['Last Name,First Name,Middle Name,LRN,Email\nDela Cruz,Ana,Santos,202407000010,ana@nexora.edu'],
      'roster.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    const lastNameInput = await screen.findByRole('textbox', { name: /row 2, column A/i });
    fireEvent.change(lastNameInput, { target: { value: 'Santiago' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate roster' }));

    await waitFor(() => expect(mockedRosterImportService.preview).toHaveBeenCalledTimes(1));
    const validatedFile = mockedRosterImportService.preview.mock.calls[0][1];
    await expect(readBlobAsText(validatedFile)).resolves.toContain(
      'Santiago,Ana,Santos,202407000010,ana@nexora.edu',
    );
    expect(mockedRosterImportService.commit).not.toHaveBeenCalled();
  });

  it('shows a file attachment notification and local spreadsheet preview when a CSV is attached', async () => {
    const { container } = render(<RosterImportPage />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(
      ['Last Name,First Name,Middle Name,LRN,Email\nDela Cruz,Ana,Santos,202407000010,ana@nexora.edu'],
      'roster.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(await screen.findByText('Attached file preview')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /row 2, column A/i })).toHaveValue('Dela Cruz');
    expect(screen.getByRole('textbox', { name: /row 2, column D/i })).toHaveValue('202407000010');
    expect(screen.getByRole('textbox', { name: /row 2, column E/i })).toHaveValue('ana@nexora.edu');
    expect(screen.getByText('Import source')).toBeInTheDocument();
    expect(mockedToast.success).toHaveBeenCalledWith(expect.stringContaining('attached and ready for preview'));
  });

  it('confirms before discarding an edited roster draft', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(<RosterImportPage />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(
            ['Last Name,First Name\nDela Cruz,Ana'],
            'roster.csv',
            { type: 'text/csv' },
          ),
        ],
      },
    });
    const lastNameInput = await screen.findByRole('textbox', { name: /row 2, column A/i });
    fireEvent.change(lastNameInput, { target: { value: 'Santiago' } });

    fireEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(confirmSpy).toHaveBeenCalledWith('Discard your roster edits and remove this file?');
    expect(lastNameInput).toHaveValue('Santiago');

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(screen.queryByText('Attached file preview')).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('downloads a protected Excel template for the selected section', async () => {
    let exportedBlob: Blob | null = null;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement('a') as HTMLAnchorElement;
    const clickSpy = jest.spyOn(anchor, 'click').mockImplementation();
    const createElementSpy = jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName, options) => {
        if (tagName.toLowerCase() === 'a') return anchor;
        return originalCreateElement(tagName, options);
      });
    URL.createObjectURL = jest.fn((blob) => {
      exportedBlob = blob as Blob;
      return 'blob:roster-template';
    });
    URL.revokeObjectURL = jest.fn();

    try {
      render(<RosterImportPage />);

      const templateButton = await screen.findByRole('button', { name: /download excel template/i });
      expect(templateButton).toBeDisabled();

      fireEvent.change(await screen.findByLabelText('Target Section'), {
        target: { value: 'section-1' },
      });
      fireEvent.click(templateButton);

      await waitFor(() => expect(clickSpy).toHaveBeenCalled());
      expect(anchor.download).toMatch(/roster-template.*\.xlsx$/);
      expect(exportedBlob).not.toBeNull();

      const zip = await JSZip.loadAsync(await readBlobAsArrayBuffer(exportedBlob!));
      const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
      const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
      const sheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');

      expect(workbookXml).toContain('name="Roster Import"');
      expect(sharedStringsXml).toContain('GRADE 7 Grade 7 - Rizal');
      expect(sharedStringsXml).toContain('Last Name');
      expect(sharedStringsXml).toContain('First Name');
      expect(sharedStringsXml).toContain('Middle Name');
      expect(sharedStringsXml).toContain('LRN');
      expect(sharedStringsXml).toContain('Email');
      expect(sheetXml).toContain('r="A1"');
      expect(sheetXml).toContain('r="A3"');
      expect(sheetXml).toContain('r="B3"');
      expect(sheetXml).toContain('r="C3"');
      expect(sheetXml).toContain('r="D3"');
      expect(sheetXml).toContain('r="E3"');
      expect(sheetXml).toContain('<sheetProtection');
      expect(sheetXml).toContain('sqref="D4:D203"');
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      createElementSpy.mockRestore();
      clickSpy.mockRestore();
    }
  }, 30000);

  it('commits using the backend roster contract only after explicit confirmation', async () => {
    const { container } = render(<RosterImportPage />);

    fireEvent.change(await screen.findByLabelText('Target Section'), {
      target: { value: 'section-1' },
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(
            ['Last Name,First Name,Middle Name,LRN,Email\nDela Cruz,Ana,Santos,202407000010,ana@nexora.edu'],
            'roster.csv',
            { type: 'text/csv' },
          ),
        ],
      },
    });
    await screen.findByRole('textbox', { name: /row 2, column A/i });
    fireEvent.click(screen.getByRole('button', { name: 'Validate roster' }));

    expect(await screen.findByRole('button', { name: 'Commit Import' })).toBeInTheDocument();
    expect(mockedRosterImportService.commit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Commit Import' }));

    await waitFor(() =>
      expect(mockedRosterImportService.commit).toHaveBeenCalledWith('section-1', {
        sectionId: 'section-1',
        skipVerification: false,
        enrolledRows: [
          {
            userId: 'student-1',
            name: {
              firstName: 'Liam',
              lastName: 'Navarro',
              middleName: 'Reyes',
            },
            lrn: '202407000001',
            email: 'liam@nexora.edu',
          },
        ],
        pendingRows: [
          {
            name: {
              firstName: 'Mia',
              lastName: 'Villanueva',
              middleName: 'Santos',
            },
            lrn: '202407000002',
            email: 'mia@nexora.edu',
          },
        ],
      }),
    );
  });

  it('requires explicit acknowledgement before activating new imported accounts without OTP', async () => {
    const { container } = render(<RosterImportPage />);
    fireEvent.change(await screen.findByLabelText('Target Section'), {
      target: { value: 'section-1' },
    });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [new File(
          ['Last Name,First Name,Middle Name,LRN,Email\nDela Cruz,Ana,Santos,202407000010,ana@nexora.edu'],
          'roster.csv',
          { type: 'text/csv' },
        )],
      },
    });
    await screen.findByRole('textbox', { name: /row 2, column A/i });
    fireEvent.click(screen.getByRole('button', { name: 'Validate roster' }));
    const activationButton = await screen.findByRole('button', { name: 'Enable skip verification' });
    fireEvent.click(activationButton);
    expect(screen.getByRole('button', { name: 'Commit Import' })).toBeDisabled();
    expect(mockedRosterImportService.commit).not.toHaveBeenCalled();

    expect(screen.getByText('Active after import')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this new account/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit Import' }));
    await waitFor(() => expect(mockedRosterImportService.commit).toHaveBeenCalledWith(
      'section-1',
      expect.objectContaining({ skipVerification: true }),
    ));
  });

  it('invalidates the server preview when an edited cell changes again', async () => {
    const { container } = render(<RosterImportPage />);
    fireEvent.change(await screen.findByLabelText('Target Section'), {
      target: { value: 'section-1' },
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(
            ['Last Name,First Name,Middle Name,LRN,Email\nDela Cruz,Ana,Santos,202407000010,ana@nexora.edu'],
            'roster.csv',
            { type: 'text/csv' },
          ),
        ],
      },
    });
    const lastNameInput = await screen.findByRole('textbox', { name: /row 2, column A/i });
    fireEvent.click(screen.getByRole('button', { name: 'Validate roster' }));
    expect(await screen.findByRole('button', { name: 'Commit Import' })).toBeInTheDocument();

    fireEvent.change(lastNameInput, { target: { value: 'Santiago' } });

    expect(screen.queryByRole('button', { name: 'Commit Import' })).not.toBeInTheDocument();
    expect(lastNameInput).toHaveValue('Santiago');
  });

  it('retains edited cells when server validation fails', async () => {
    mockedRosterImportService.preview.mockRejectedValueOnce(new Error('Preview unavailable'));
    const { container } = render(<RosterImportPage />);
    fireEvent.change(await screen.findByLabelText('Target Section'), {
      target: { value: 'section-1' },
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(
            ['Last Name,First Name,Middle Name,LRN,Email\nDela Cruz,Ana,Santos,202407000010,ana@nexora.edu'],
            'roster.csv',
            { type: 'text/csv' },
          ),
        ],
      },
    });
    const lastNameInput = await screen.findByRole('textbox', { name: /row 2, column A/i });
    fireEvent.change(lastNameInput, { target: { value: 'Santiago' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate roster' }));

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Preview unavailable'));
    expect(lastNameInput).toHaveValue('Santiago');
    expect(screen.queryByRole('button', { name: 'Commit Import' })).not.toBeInTheDocument();
  });
});

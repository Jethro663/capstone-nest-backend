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

  it('uploads a selected roster file for the selected section', async () => {
    const { container } = render(<RosterImportPage />);

    const sectionSelect = await screen.findByLabelText('Target Section');
    fireEvent.change(sectionSelect, { target: { value: 'section-1' } });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['csv-data'], 'roster.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload & Import' }));

    await waitFor(() =>
      expect(mockedRosterImportService.preview).toHaveBeenCalledWith('section-1', file),
    );
    await waitFor(() => expect(mockedRosterImportService.commit).toHaveBeenCalledTimes(1));
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
    expect(screen.getByText('Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('202407000010')).toBeInTheDocument();
    expect(screen.getByText('ana@nexora.edu')).toBeInTheDocument();
    expect(mockedToast.success).toHaveBeenCalledWith(expect.stringContaining('attached and ready for preview'));
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

  it('auto-commits using the backend roster contract after preview', async () => {
    const { container } = render(<RosterImportPage />);

    fireEvent.change(await screen.findByLabelText('Target Section'), {
      target: { value: 'section-1' },
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['csv-data'], 'roster.csv', { type: 'text/csv' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload & Import' }));

    await waitFor(() =>
      expect(mockedRosterImportService.commit).toHaveBeenCalledWith('section-1', {
        sectionId: 'section-1',
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
});

'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RosterImportPage from './page';
import { sectionService } from '@/services/section-service';
import { rosterImportService } from '@/services/roster-import-service';

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
type SectionListResponse = Awaited<ReturnType<typeof sectionService.getAll>>;
type PendingResponse = Awaited<ReturnType<typeof rosterImportService.getPending>>;
type PreviewResponse = Awaited<ReturnType<typeof rosterImportService.preview>>;

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
              middleInitial: null,
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
              middleInitial: null,
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

    fireEvent.click(screen.getByRole('button', { name: 'Upload & Preview' }));

    await waitFor(() =>
      expect(mockedRosterImportService.preview).toHaveBeenCalledWith('section-1', file),
    );
  });

  it('renders backend preview rows and commits using the backend roster contract', async () => {
    const { container } = render(<RosterImportPage />);

    fireEvent.change(await screen.findByLabelText('Target Section'), {
      target: { value: 'section-1' },
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['csv-data'], 'roster.csv', { type: 'text/csv' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload & Preview' }));

    expect(await screen.findByText('Liam Navarro')).toBeInTheDocument();
    expect(screen.getByText('Mia Villanueva')).toBeInTheDocument();
    expect(screen.getByText('LRN is required')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Commit Import' }));

    await waitFor(() =>
      expect(mockedRosterImportService.commit).toHaveBeenCalledWith('section-1', {
        sectionId: 'section-1',
        enrolledRows: [
          {
            userId: 'student-1',
            name: {
              firstName: 'Liam',
              lastName: 'Navarro',
              middleInitial: null,
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
              middleInitial: null,
            },
            lrn: '202407000002',
            email: 'mia@nexora.edu',
          },
        ],
      }),
    );
  });
});

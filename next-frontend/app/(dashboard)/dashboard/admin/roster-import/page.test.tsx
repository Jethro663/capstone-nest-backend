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
          id: 'section-1',
          name: 'Grade 7 - Rizal',
          gradeLevel: '7',
        },
        registered: [],
        pending: [],
        errors: [],
        summary: { total: 0, registered: 0, pending: 0, errors: 0 },
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
});

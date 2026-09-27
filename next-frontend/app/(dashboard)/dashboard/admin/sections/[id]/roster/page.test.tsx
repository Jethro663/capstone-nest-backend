'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import AdminSectionRosterPage from './page';
import { sectionService } from '@/services/section-service';
import { academicStateService } from '@/services/academic-state-service';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'section-1' }),
  useRouter: () => ({ push }),
}));

jest.mock('@/services/section-service', () => ({
  sectionService: {
    getById: jest.fn(),
    getRoster: jest.fn(),
    getAll: jest.fn(),
  },
}));

jest.mock('@/services/academic-state-service', () => ({
  academicStateService: { getCurrent: jest.fn() },
}));

jest.mock('@/components/shared/SectionScheduleViewer', () => ({
  SectionScheduleViewer: () => <div>Schedule viewer</div>,
}));

jest.mock('@/components/admin/AdminLifecycleDialog', () => ({
  AdminLifecycleDialog: () => null,
}));

const mockedSectionService = jest.mocked(sectionService);
const mockedAcademicStateService = jest.mocked(academicStateService);

describe('AdminSectionRosterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSectionService.getById.mockResolvedValue({
      success: true,
      data: {
        id: 'section-1',
        name: 'Rizal',
        gradeLevel: '7',
        schoolYear: '2026-2027',
        capacity: 40,
        isActive: true,
      },
    });
    mockedSectionService.getRoster.mockResolvedValue({
      success: true,
      data: [],
      count: 0,
    });
    mockedSectionService.getAll.mockResolvedValue({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
    });
    mockedAcademicStateService.getCurrent.mockResolvedValue({
      success: true,
      data: {
        schoolYear: '2026-2027',
        quarter: 'Q1',
      },
    } as Awaited<ReturnType<typeof academicStateService.getCurrent>>);
  });

  it('sections roster data and explains page-level admin actions', async () => {
    render(<AdminSectionRosterPage />);

    expect(await screen.findByRole('heading', { name: 'Rizal Roster' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Students' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Actions' }), {
      button: 0,
    });

    fireEvent.click(await screen.findByRole('button', { name: /Edit section/i }));
    expect(push).toHaveBeenCalledWith('/dashboard/admin/sections/section-1/edit');

    fireEvent.click(screen.getByRole('button', { name: /Add students/i }));
    expect(push).toHaveBeenCalledWith('/dashboard/admin/sections/section-1/students/add');
  });
});

'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherAddSectionStudentsPage from './page';
import { sectionService } from '@/services/section-service';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();
let searchParamsMock = new URLSearchParams('gradeLevel=10');

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'section-1' }),
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsMock,
}));

jest.mock('@/services/section-service', () => ({
  sectionService: {
    getById: jest.fn(),
    getAll: jest.fn(),
    getCandidates: jest.fn(),
    addStudents: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const mockedSectionService = sectionService as jest.Mocked<
  typeof sectionService
>;

function buildCandidates() {
  const available = Array.from({ length: 14 }).map((_, index) => {
    const num = index + 1;
    const padded = String(num).padStart(2, '0');
    return {
      id: `available-${padded}`,
      firstName: `A${padded}`,
      lastName: 'Student',
      email: `a${padded}@nexora.edu`,
      gradeLevel: '10',
      profilePicture: null,
      isEligible: true,
      eligibilityReason: null,
      hasActiveSectionEnrollment: false,
      enrolledSectionId: null,
      enrolledSectionName: null,
    };
  });

  return [
    ...available,
    {
      id: 'unavailable-section',
      firstName: 'Carlos',
      lastName: 'Reyes',
      email: 'creyes@nexora.edu',
      gradeLevel: '10',
      profilePicture: null,
      isEligible: false,
      eligibilityReason: 'Already in section Grade 10 - Rizal B',
      hasActiveSectionEnrollment: true,
      enrolledSectionId: 'section-2',
      enrolledSectionName: 'Grade 10 - Rizal B',
    },
    {
      id: 'unavailable-grade',
      firstName: 'Lia',
      lastName: 'Torres',
      email: 'ltorres@nexora.edu',
      gradeLevel: '9',
      profilePicture: null,
      isEligible: false,
      eligibilityReason: 'Grade mismatch (9 vs 10)',
      hasActiveSectionEnrollment: false,
      enrolledSectionId: null,
      enrolledSectionName: null,
    },
  ];
}

describe('Teacher Add Section Students Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParamsMock = new URLSearchParams('gradeLevel=10');

    mockedSectionService.getById.mockResolvedValue({
      success: true,
      data: {
        id: 'section-1',
        name: 'Grade 10 - Rizal',
        gradeLevel: '10',
        schoolYear: '2025-2026',
        capacity: 45,
        isActive: true,
      },
    });
    mockedSectionService.getAll.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'section-1',
          name: 'Grade 10 - Rizal',
          gradeLevel: '10',
          schoolYear: '2025-2026',
          capacity: 45,
          isActive: true,
        },
      ],
      count: 1,
    } as never);

    mockedSectionService.getCandidates.mockResolvedValue({
      success: true,
      data: buildCandidates(),
      page: 1,
      limit: 20,
      count: 16,
      total: 16,
      totalPages: 1,
    });

    mockedSectionService.addStudents.mockResolvedValue({
      success: true,
      message: 'Added',
      data: { createdCount: 1 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the masterlist with disabled reasons for ineligible rows', async () => {
    render(<TeacherAddSectionStudentsPage />);

    await screen.findByText('A01 Student');

    expect(screen.getByText('Modern Masterlist')).toBeInTheDocument();
    expect(screen.getByText('16 total')).toBeInTheDocument();
    expect(screen.getByText('Carlos Reyes')).toBeInTheDocument();
    expect(screen.getByText('Lia Torres')).toBeInTheDocument();
    expect(
      screen.getByText('Already in section Grade 10 - Rizal B'),
    ).toBeInTheDocument();
    expect(screen.getByText('Grade mismatch (9 vs 10)')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Carlos Reyes')).toBeDisabled();
    expect(screen.getByLabelText('Select Lia Torres')).toBeDisabled();
  });

  it('updates query filters from the masterlist controls', async () => {
    render(<TeacherAddSectionStudentsPage />);

    await screen.findByText('A01 Student');
    fireEvent.change(screen.getByDisplayValue('All eligibility'), {
      target: { value: 'eligible' },
    });

    expect(replaceMock).toHaveBeenCalledWith(
      expect.stringContaining('eligibility=eligible'),
      { scroll: false },
    );
    expect(replaceMock).toHaveBeenCalledWith(
      expect.stringContaining('page=1'),
      { scroll: false },
    );
  });

  it('selects only eligible students on the current page', async () => {
    render(<TeacherAddSectionStudentsPage />);
    await screen.findByText('A01 Student');

    fireEvent.click(
      screen.getByRole('button', { name: /Select Eligible on Page/i }),
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /Add 14 Student\(s\)/i }).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getByLabelText('Select Carlos Reyes')).toBeDisabled();
    expect(screen.getByLabelText('Select Lia Torres')).toBeDisabled();
  });

  it('navigates to profile only through the student name button', async () => {
    render(<TeacherAddSectionStudentsPage />);
    await screen.findByText('A01 Student');

    fireEvent.click(screen.getByRole('button', { name: 'A01 Student' }));
    expect(pushMock).toHaveBeenCalledWith(
      '/dashboard/teacher/sections/section-1/students/available-01',
    );

    fireEvent.click(screen.getByText('a02@nexora.edu'));
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('retries 429 on add and succeeds on the next attempt', async () => {
    mockedSectionService.addStudents
      .mockRejectedValueOnce({ response: { status: 429 } } as never)
      .mockResolvedValueOnce({
        success: true,
        message: 'Added',
        data: { createdCount: 1 },
      });

    render(<TeacherAddSectionStudentsPage />);
    await screen.findByText('A01 Student');

    fireEvent.click(screen.getByLabelText('Select A01 Student'));
    fireEvent.click(
      screen.getAllByRole('button', { name: /Add 1 Student\(s\)/i })[0],
    );

    await waitFor(() => {
      expect(mockedSectionService.addStudents).toHaveBeenCalledTimes(2);
    });

    expect(pushMock).toHaveBeenCalledWith(
      '/dashboard/teacher/sections/section-1/roster',
    );
  });

  it('stops after 3 attempts when add keeps returning 429', async () => {
    mockedSectionService.addStudents
      .mockRejectedValueOnce({ response: { status: 429 } } as never)
      .mockRejectedValueOnce({ response: { status: 429 } } as never)
      .mockRejectedValueOnce({ response: { status: 429 } } as never);

    render(<TeacherAddSectionStudentsPage />);
    await screen.findByText('A01 Student');

    fireEvent.click(screen.getByLabelText('Select A01 Student'));
    fireEvent.click(
      screen.getAllByRole('button', { name: /Add 1 Student\(s\)/i })[0],
    );

    await waitFor(
      () => {
        expect(mockedSectionService.addStudents).toHaveBeenCalledTimes(3);
      },
      { timeout: 3000 },
    );

    expect(pushMock).not.toHaveBeenCalledWith(
      '/dashboard/teacher/sections/section-1/roster',
    );
    expect(toastErrorMock).toHaveBeenCalled();
  });
});

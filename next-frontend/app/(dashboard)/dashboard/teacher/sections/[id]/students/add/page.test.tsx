'use client';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TeacherAddSectionStudentsPage from './page';
import { sectionService } from '@/services/section-service';

const pushMock = jest.fn();
const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'section-1' }),
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/services/section-service', () => ({
  sectionService: {
    getById: jest.fn(),
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

const mockedSectionService = sectionService as jest.Mocked<typeof sectionService>;

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
      hasActiveSectionEnrollment: false,
      enrolledSectionId: null,
      enrolledSectionName: null,
    },
  ];
}

describe('Teacher Add Section Students Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

    mockedSectionService.getCandidates.mockResolvedValue({
      success: true,
      data: buildCandidates(),
      count: 16,
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

  it('defaults to Available segment and hides unavailable rows', async () => {
    render(<TeacherAddSectionStudentsPage />);

    await screen.findByRole('tab', { name: /^Available\b/i });
    await screen.findByText('A01 Student');

    expect(screen.getByRole('tab', { name: /^Available\b/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /^Unavailable\b/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByText('Carlos Reyes')).not.toBeInTheDocument();
    expect(screen.queryByText('Lia Torres')).not.toBeInTheDocument();
  });

  it('renders both unavailable categories as disabled when switching segment', async () => {
    render(<TeacherAddSectionStudentsPage />);

    await screen.findByRole('tab', { name: /^Available\b/i });
    await screen.findByText('A01 Student');
    fireEvent.click(screen.getByRole('tab', { name: /^Unavailable\b/i }));

    expect(screen.getByText('Carlos Reyes')).toBeInTheDocument();
    expect(screen.getByText('Lia Torres')).toBeInTheDocument();
    expect(screen.getByText('Already in section Grade 10 - Rizal B')).toBeInTheDocument();
    expect(screen.getByText('Grade mismatch (9 vs 10)')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Carlos Reyes')).toBeDisabled();
    expect(screen.getByLabelText('Select Lia Torres')).toBeDisabled();
  });

  it('uses 12-row pagination, page-only select all, and keeps selections across view changes', async () => {
    render(<TeacherAddSectionStudentsPage />);
    await screen.findByRole('tab', { name: /^Available\b/i });
    await screen.findByText('A01 Student');

    fireEvent.click(screen.getByLabelText('Select all visible students'));
    expect(screen.getByRole('button', { name: /Add Selected \(12\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Selected \(12\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select all visible students'));
    expect(screen.getByRole('button', { name: /Add Selected \(14\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^Unavailable\b/i }));
    fireEvent.click(screen.getByRole('tab', { name: /^Available\b/i }));
    expect(screen.getByRole('button', { name: /Add Selected \(14\)/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search by name, email, or LRN...'), {
      target: { value: 'A14' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Selected \(14\)/i })).toBeInTheDocument();
    });
  });

  it('navigates to profile only through the student name link', async () => {
    render(<TeacherAddSectionStudentsPage />);
    await screen.findByRole('tab', { name: /^Available\b/i });
    await screen.findByText('A01 Student');

    fireEvent.click(screen.getByRole('button', { name: 'Open A01 Student profile' }));
    expect(pushMock).toHaveBeenCalledWith(
      '/dashboard/teacher/sections/section-1/students/available-01',
    );

    fireEvent.click(screen.getByText('a02@nexora.edu'));
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('opens and closes basic profile modal from right-side action without profile navigation', async () => {
    render(<TeacherAddSectionStudentsPage />);
    await screen.findByRole('tab', { name: /^Available\b/i });
    await screen.findByText('A01 Student');

    fireEvent.click(screen.getByRole('button', { name: 'View profile for A01 Student' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Student Profile')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Basic profile details for this section candidate.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('A01 Student')).toBeInTheDocument();
    expect(within(dialog).getByText('a01@nexora.edu')).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledTimes(0);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close Profile' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(pushMock).toHaveBeenCalledTimes(0);
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
    await screen.findByRole('tab', { name: /^Available\b/i });
    await screen.findByText('A01 Student');

    fireEvent.click(screen.getByLabelText('Select A01 Student'));
    fireEvent.click(screen.getByRole('button', { name: /Add Selected \(1\)/i }));

    await waitFor(() => {
      expect(mockedSectionService.addStudents).toHaveBeenCalledTimes(2);
    });

    expect(pushMock).toHaveBeenCalledWith('/dashboard/teacher/sections/section-1/roster');
  });

  it('stops after 3 attempts when add keeps returning 429', async () => {
    mockedSectionService.addStudents
      .mockRejectedValueOnce({ response: { status: 429 } } as never)
      .mockRejectedValueOnce({ response: { status: 429 } } as never)
      .mockRejectedValueOnce({ response: { status: 429 } } as never);

    render(<TeacherAddSectionStudentsPage />);
    await screen.findByRole('tab', { name: /^Available\b/i });
    await screen.findByText('A01 Student');

    fireEvent.click(screen.getByLabelText('Select A01 Student'));
    fireEvent.click(screen.getByRole('button', { name: /Add Selected \(1\)/i }));

    await waitFor(
      () => {
        expect(mockedSectionService.addStudents).toHaveBeenCalledTimes(3);
      },
      { timeout: 3000 },
    );

    expect(pushMock).not.toHaveBeenCalledWith('/dashboard/teacher/sections/section-1/roster');
    expect(toastErrorMock).toHaveBeenCalled();
  });
});

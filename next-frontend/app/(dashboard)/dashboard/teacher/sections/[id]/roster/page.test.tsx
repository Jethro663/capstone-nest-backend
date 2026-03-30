'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SectionRosterPage from './page';
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
    getRoster: jest.fn(),
    getSchedule: jest.fn(),
    removeStudent: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

jest.mock('@/components/shared/SectionScheduleViewer', () => ({
  SectionScheduleViewer: () => <div data-testid="section-schedule-viewer">Section Schedule</div>,
}));

const mockedSectionService = sectionService as jest.Mocked<typeof sectionService>;

describe('Teacher Section Roster Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedSectionService.getById.mockResolvedValue({
      success: true,
      data: {
        id: 'section-1',
        name: 'Grade 10 - Rizal',
        gradeLevel: '10',
        schoolYear: '2024-2025',
        capacity: 45,
        isActive: true,
        adviser: { id: 'teacher-1', firstName: 'Maria', lastName: 'Santos' },
      },
    });

    mockedSectionService.getRoster.mockResolvedValue({
      success: true,
      count: 2,
      data: [
        {
          id: 'student-1',
          firstName: 'Jamie',
          lastName: 'Cruz',
          email: 'jcruz@nexora.edu',
          lrn: '123456789012',
          gradeLevel: '10',
        },
        {
          id: 'student-2',
          firstName: 'John',
          lastName: 'Rivera',
          email: 'jrivera@nexora.edu',
          lrn: '123456789013',
          gradeLevel: '10',
        },
      ],
    });

    mockedSectionService.getSchedule.mockResolvedValue({
      success: true,
      data: {
        section: {
          id: 'section-1',
          name: 'Grade 10 - Rizal',
          gradeLevel: '10',
          schoolYear: '2024-2025',
        },
        classes: [
          {
            classId: 'class-1',
            subjectName: 'Mathematics',
            subjectCode: 'MATH-10',
            room: '101',
            isActive: true,
            teacher: { id: 'teacher-1', firstName: 'Maria', lastName: 'Santos' },
            schedules: [
              {
                id: 'sched-1',
                days: ['M'],
                daysExpanded: ['Monday'],
                startTime: '07:30',
                endTime: '08:30',
                startHour: 7,
                startMinute: 30,
                endHour: 8,
                endMinute: 30,
              },
            ],
          },
        ],
      },
    });
  });

  it('renders compact roster layout and removes explicit View Profile action', async () => {
    render(<SectionRosterPage />);

    await screen.findByRole('heading', { name: 'Grade 10 - Rizal' });
    expect(screen.getByRole('heading', { name: /Student Roster/i })).toBeInTheDocument();
    expect(screen.getByTestId('section-schedule-viewer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View Profile/i })).not.toBeInTheDocument();
  });

  it('navigates to student profile when clicking a roster row', async () => {
    render(<SectionRosterPage />);
    await screen.findByText('Jamie Cruz');

    const row = screen.getByText('Jamie Cruz').closest('tr');
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    expect(pushMock).toHaveBeenCalledWith(
      '/dashboard/teacher/sections/section-1/students/student-1',
    );
  });

  it('supports quick-select with partial success bulk removal', async () => {
    mockedSectionService.removeStudent
      .mockResolvedValueOnce({ success: true, data: { removed: true } as never })
      .mockRejectedValueOnce(new Error('blocked'));

    render(<SectionRosterPage />);
    await screen.findByText('Jamie Cruz');

    const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);
    fireEvent.click(rowCheckboxes[0]);
    fireEvent.click(rowCheckboxes[1]);

    expect(screen.getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Remove Selected/i }));

    await waitFor(() => {
      expect(mockedSectionService.removeStudent).toHaveBeenCalledTimes(2);
    });

    expect(screen.queryByText('Jamie Cruz')).not.toBeInTheDocument();
    expect(screen.getByText('John Rivera')).toBeInTheDocument();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});

'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherStudentProfilePage from './page';
import { classService } from '@/services/class-service';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
let mockStudentId = 'student-1';

jest.mock('next/navigation', () => ({
  useParams: () => ({
    id: 'class-1',
    studentId: mockStudentId,
  }),
  usePathname: () => '/dashboard/teacher/classes/class-1/students/student-1',
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getStudentOverviewForClass: jest.fn(),
    getEnrollments: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;

describe('TeacherStudentProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockStudentId = 'student-1';
    mockedClassService.getEnrollments.mockResolvedValue({
      success: true,
      message: 'ok',
      count: 3,
      data: [
        { id: 'enrollment-0', studentId: 'student-0', classId: 'class-1' },
        { id: 'enrollment-1', studentId: 'student-1', classId: 'class-1' },
        { id: 'enrollment-2', studentId: 'student-2', classId: 'class-1' },
      ],
    });
  });

  it('renders required redesigned sections from overview payload', async () => {
    mockedClassService.getStudentOverviewForClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        classInfo: {
          id: 'class-1',
          subjectName: 'Math',
          subjectCode: 'MATH-10',
          sectionLabel: 'Grade 10 - Rizal',
        },
        student: {
          id: 'student-1',
          firstName: 'Jamie',
          middleName: null,
          lastName: 'Cruz',
          email: 'jcruz@nexora.edu',
          status: 'ACTIVE',
          profile: {
            lrn: '789012',
            dateOfBirth: null,
            gender: null,
            phone: null,
            address: null,
            gradeLevel: '10',
            familyName: null,
            familyRelationship: null,
            familyContact: null,
            profilePicture: null,
          },
        },
        section: null,
        standing: {
          gradingPeriod: 'q1',
          overallGradePercent: 90.5,
          components: {
            writtenWorkPercent: 85,
            performanceTaskPercent: 93,
            quarterlyExamPercent: 88,
          },
        },
        history: {
          finished: [
            {
              assessmentId: 'a1',
              title: 'Algebra Quiz 1',
              type: 'quiz',
              dueDate: '2026-03-25T00:00:00.000Z',
              status: 'finished',
              statusLabel: 'Submitted',
              submittedAt: '2026-03-24T00:00:00.000Z',
              returnedAt: null,
              isLate: false,
              lateByMinutes: 0,
              score: 90,
              directScore: null,
              totalPoints: 100,
              passed: true,
              isReturned: false,
            },
          ],
          late: [],
          pending: [
            {
              assessmentId: 'a2',
              title: 'Group Project',
              type: 'project',
              dueDate: '2026-04-10T00:00:00.000Z',
              status: 'not_started',
              statusLabel: 'Not Started',
              submittedAt: null,
              returnedAt: null,
              isLate: false,
              lateByMinutes: 0,
              score: null,
              directScore: null,
              totalPoints: 100,
              passed: null,
              isReturned: false,
            },
          ],
        },
      },
    });

    render(<TeacherStudentProfilePage />);

    await screen.findByRole('heading', { name: 'Jamie Cruz' });
    expect(screen.getByRole('heading', { name: 'Assessment History' })).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Overall Grade')).toBeInTheDocument();
    expect(screen.getAllByText('90.5%')).toHaveLength(1);
    expect(screen.queryByText('Algebra Quiz 1')).not.toBeInTheDocument();
    expect(screen.getByText('Group Project')).toBeInTheDocument();
    expect(screen.getByText('Student 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Previous student' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes/class-1/students/student-0?history=attention&page=1',
    );
    expect(screen.getByRole('link', { name: 'Next student' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes/class-1/students/student-2?history=attention&page=1',
    );
    fireEvent.click(screen.getByRole('tab', { name: /Finished/ }));
    expect(mockPush).toHaveBeenCalledWith(
      '/dashboard/teacher/classes/class-1/students/student-1?history=finished&page=1',
      { scroll: false },
    );
    expect(mockedClassService.getEnrollments).toHaveBeenCalledWith('class-1');
  });

  it('preserves the selected history view in roster navigation', async () => {
    mockSearchParams = new URLSearchParams('history=finished&page=3');
    mockedClassService.getStudentOverviewForClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        classInfo: {
          id: 'class-1',
          subjectName: 'Math',
          subjectCode: 'MATH-10',
          sectionLabel: 'Grade 10 - Rizal',
        },
        student: {
          id: 'student-1',
          firstName: 'Jamie',
          lastName: 'Cruz',
          email: 'jcruz@nexora.edu',
          status: 'ACTIVE',
          profile: null,
        },
        section: null,
        standing: {
          gradingPeriod: 'q1',
          overallGradePercent: null,
          components: {
            writtenWorkPercent: null,
            performanceTaskPercent: null,
            quarterlyExamPercent: null,
          },
        },
        history: { finished: [], late: [], pending: [] },
      },
    });

    render(<TeacherStudentProfilePage />);

    await screen.findByRole('heading', { name: 'Jamie Cruz' });
    expect(screen.getByRole('link', { name: 'Next student' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes/class-1/students/student-2?history=finished&page=1',
    );
  });

  it('disables roster navigation at the first and last student boundaries', async () => {
    mockedClassService.getStudentOverviewForClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        classInfo: {
          id: 'class-1',
          subjectName: 'Math',
          subjectCode: 'MATH-10',
          sectionLabel: 'Grade 10 - Rizal',
        },
        student: {
          id: 'student-1',
          firstName: 'Jamie',
          lastName: 'Cruz',
          email: 'jcruz@nexora.edu',
          status: 'ACTIVE',
          profile: null,
        },
        section: null,
        standing: {
          gradingPeriod: 'q1',
          overallGradePercent: null,
          components: {
            writtenWorkPercent: null,
            performanceTaskPercent: null,
            quarterlyExamPercent: null,
          },
        },
        history: { finished: [], late: [], pending: [] },
      },
    });

    mockStudentId = 'student-0';
    const firstStudent = render(<TeacherStudentProfilePage />);

    await screen.findByText('Student 1 of 3');
    expect(screen.queryByRole('link', { name: 'Previous student' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Previous student')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Next student' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes/class-1/students/student-1?history=attention&page=1',
    );

    firstStudent.unmount();
    mockStudentId = 'student-2';
    render(<TeacherStudentProfilePage />);

    await screen.findByText('Student 3 of 3');
    expect(screen.queryByRole('link', { name: 'Next student' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Next student')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Previous student' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes/class-1/students/student-1?history=attention&page=1',
    );
  });

  it('keeps the overview available when roster navigation fails', async () => {
    mockSearchParams = new URLSearchParams('history=unknown&page=2oops&source=roster');
    mockedClassService.getStudentOverviewForClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        classInfo: {
          id: 'class-1',
          subjectName: 'Math',
          subjectCode: 'MATH-10',
          sectionLabel: 'Grade 10 - Rizal',
        },
        student: {
          id: 'student-1',
          firstName: 'Jamie',
          lastName: 'Cruz',
          email: 'jcruz@nexora.edu',
          status: 'ACTIVE',
          profile: null,
        },
        section: null,
        standing: {
          gradingPeriod: null,
          overallGradePercent: null,
          components: {
            writtenWorkPercent: null,
            performanceTaskPercent: null,
            quarterlyExamPercent: null,
          },
        },
        history: { finished: [], late: [], pending: [] },
      },
    });
    mockedClassService.getEnrollments.mockRejectedValue(new Error('failed'));

    render(<TeacherStudentProfilePage />);

    await screen.findByRole('heading', { name: 'Jamie Cruz' });
    expect(screen.queryByText(/Student \d+ of \d+/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Class' })).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith(
      '/dashboard/teacher/classes/class-1/students/student-1?history=attention&page=1&source=roster',
      { scroll: false },
    );
  });

  it('shows fallback error card when fetch fails', async () => {
    mockedClassService.getStudentOverviewForClass.mockRejectedValue(
      new Error('failed'),
    );

    render(<TeacherStudentProfilePage />);

    await waitFor(() =>
      expect(
        screen.getByText('Student overview is unavailable'),
      ).toBeInTheDocument(),
    );
  });
});

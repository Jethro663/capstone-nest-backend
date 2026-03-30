'use client';

import { render, screen, waitFor } from '@testing-library/react';
import TeacherStudentProfilePage from './page';
import { classService } from '@/services/class-service';

jest.mock('next/navigation', () => ({
  useParams: () => ({
    id: 'class-1',
    studentId: 'student-1',
  }),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getStudentOverviewForClass: jest.fn(),
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
    expect(screen.getByRole('heading', { name: 'Student Information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Academic Standing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assessment History' })).toBeInTheDocument();
    expect(screen.getAllByText('90.5%').length).toBeGreaterThan(0);
    expect(screen.getByText('Algebra Quiz 1')).toBeInTheDocument();
    expect(screen.getByText('Group Project')).toBeInTheDocument();
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

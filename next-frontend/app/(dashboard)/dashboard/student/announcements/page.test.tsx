import { render, screen } from '@testing-library/react';
import StudentAnnouncementsPage from './page';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/components/shared/rich-text/RichTextRenderer', () => ({
  RichTextRenderer: ({ html, className }: { html: string; className?: string }) => (
    <div className={className}>{html}</div>
  ),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getByStudent: jest.fn(),
  },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;

describe('StudentAnnouncementsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'student-1',
        roles: ['student'],
      },
    } as ReturnType<typeof useAuth>);
    mockedClassService.getByStudent.mockResolvedValue({
      data: [
        {
          id: 'class-1',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
        },
      ],
    } as Awaited<ReturnType<typeof classService.getByStudent>>);
    mockedAnnouncementService.getByClass.mockResolvedValue({
      data: [
        {
          id: 'announcement-1',
          classId: 'class-1',
          title: 'Quiz schedule',
          content: '<p>Quiz is on Friday.</p>',
          isPinned: false,
          createdAt: '2026-04-24T08:00:00.000Z',
          author: {
            id: 'teacher-1',
            firstName: 'Ana',
            lastName: 'Reyes',
          },
        },
      ],
    } as Awaited<ReturnType<typeof announcementService.getByClass>>);
  });

  it('matches the teacher announcements shell while keeping the announcement list usable', async () => {
    const { container } = render(<StudentAnnouncementsPage />);

    expect(await screen.findByText('Quiz schedule')).toBeInTheDocument();
    expect(container.querySelector('.student-announcements-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Announcements' })).toBeInTheDocument();
    expect(screen.getByText('Total posts')).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      success: true,
      message: 'ok',
      data: [
        {
          id: 'announcement-1',
          classId: 'class-1',
          title: 'Quiz schedule',
          content: '<p>Quiz is on Friday.</p>',
          isPinned: false,
          isArchived: false,
          createdAt: '2026-04-24T08:00:00.000Z',
          author: {
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

  it('shows a safe retryable owner error instead of a no-posts state', async () => {
    mockedClassService.getByStudent.mockRejectedValueOnce(new Error('class sql detail'));

    render(<StudentAnnouncementsPage />);

    expect(
      await screen.findByText("Announcements couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText('No posts yet')).not.toBeInTheDocument();
    expect(screen.queryByText('class sql detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Quiz schedule')).toBeInTheDocument();
    expect(mockedClassService.getByStudent).toHaveBeenCalledTimes(2);
  });

  it('shows no posts only after all announcement requests succeed', async () => {
    mockedAnnouncementService.getByClass.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: [],
    });

    render(<StudentAnnouncementsPage />);

    expect(
      await screen.findByRole('heading', { name: 'No posts yet' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Announcements couldn't be loaded"),
    ).not.toBeInTheDocument();
  });

  it('keeps fulfilled class announcements visible during a partial outage', async () => {
    mockedClassService.getByStudent.mockResolvedValueOnce({
      data: [
        { id: 'class-1', subjectName: 'Mathematics 7', subjectCode: 'MATH-7' },
        { id: 'class-2', subjectName: 'Science 7', subjectCode: 'SCI-7' },
      ],
    } as Awaited<ReturnType<typeof classService.getByStudent>>);
    mockedAnnouncementService.getByClass.mockImplementation(async (classId) => {
      if (classId === 'class-2') throw new Error('science feed detail');
      return {
        data: [
          {
            id: 'announcement-1',
            classId: 'class-1',
            title: 'Quiz schedule',
            content: '<p>Quiz is on Friday.</p>',
            isPinned: false,
            isArchived: false,
            createdAt: '2026-04-24T08:00:00.000Z',
          },
        ],
      } as Awaited<ReturnType<typeof announcementService.getByClass>>;
    });

    render(<StudentAnnouncementsPage />);

    expect(await screen.findByText('Quiz schedule')).toBeInTheDocument();
    expect(
      screen.getByText("Some announcements couldn't be loaded"),
    ).toBeInTheDocument();
    expect(screen.queryByText('science feed detail')).not.toBeInTheDocument();
  });

  it('distinguishes filtered results from a successful no-posts response', async () => {
    render(<StudentAnnouncementsPage />);

    await screen.findByText('Quiz schedule');
    fireEvent.click(screen.getByRole('button', { name: 'Pinned' }));

    await waitFor(() => {
      expect(
        screen.getByText('No announcements match these filters'),
      ).toBeInTheDocument();
    });
  });
});

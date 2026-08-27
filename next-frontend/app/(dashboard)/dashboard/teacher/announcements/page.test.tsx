import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherAnnouncementsPage from './page';
import { announcementService } from '@/services/announcement-service';
import { classService } from '@/services/class-service';

const toastError = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'teacher-1', firstName: 'Tina', lastName: 'Teacher' },
  }),
}));

jest.mock('@/services/class-service', () => ({
  classService: { getByTeacher: jest.fn() },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getTeacherFeed: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

jest.mock('@/components/shared/rich-text/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="Announcement content" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

jest.mock('@/components/shared/rich-text/RichTextRenderer', () => ({
  RichTextRenderer: ({ html }: { html: string }) => <div>{html.replace(/<[^>]+>/g, '')}</div>,
}));

jest.mock('@/components/shared/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ config }: { config: { onConfirm?: () => void } | null }) =>
    config ? <button onClick={() => void config.onConfirm?.()}>Confirm delete</button> : null,
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedAnnouncementService = announcementService as jest.Mocked<
  typeof announcementService
> & { getTeacherFeed: jest.Mock };

const classes = [
  { id: 'class-1', subjectCode: 'MATH-7', subjectName: 'Mathematics', section: { id: 'section-1', name: 'Rizal' } },
  { id: 'class-2', subjectCode: 'SCI-7', subjectName: 'Science', section: { id: 'section-2', name: 'Bonifacio' } },
];

function announcement(
  id: string,
  classIndex: number,
  overrides: Record<string, unknown> = {},
) {
  const course = classes[classIndex];
  return {
    id,
    classId: course.id,
    title: `Announcement ${id}`,
    content: '<p>Class update</p>',
    isPinned: false,
    isArchived: false,
    authorId: 'teacher-1',
    author: { id: 'teacher-1', firstName: 'Tina', lastName: 'Teacher' },
    class: course,
    canEdit: true,
    canDelete: true,
    restrictionReason: null,
    createdAt: '2026-08-28T04:00:00.000Z',
    ...overrides,
  };
}

function feed(items: ReturnType<typeof announcement>[], page = 1, totalPages = 1) {
  return {
    success: true,
    message: 'ok',
    data: {
      items,
      page,
      limit: 20,
      total: totalPages > 1 ? 21 : items.length,
      totalPages,
      pinnedTotal: items.filter((item) => item.isPinned).length,
      latestCreatedAt: items[0]?.createdAt ?? null,
    },
  };
}

describe('TeacherAnnouncementsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClassService.getByTeacher.mockResolvedValue({ data: classes } as Awaited<
      ReturnType<typeof classService.getByTeacher>
    >);
    mockedAnnouncementService.getTeacherFeed.mockResolvedValue(
      feed([
        announcement('pinned', 1, { isPinned: true }),
        announcement('regular', 0),
      ]),
    );
  });

  it('loads all owned classes by default and uses API summary totals', async () => {
    render(<TeacherAnnouncementsPage />);

    expect(await screen.findByText('Announcement pinned')).toBeInTheDocument();
    expect(screen.getByText('Announcement regular')).toBeInTheDocument();
    expect(screen.getByText('SCI-7')).toBeInTheDocument();
    expect(screen.getByText('MATH-7')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Announcement pinned',
      'Announcement regular',
    ]);
    expect(mockedAnnouncementService.getTeacherFeed).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
    expect(screen.getByRole('button', { name: /create announcement/i })).toBeDisabled();
  });

  it('resets the feed when a class filter is selected', async () => {
    render(<TeacherAnnouncementsPage />);
    await screen.findByText('Announcement pinned');

    mockedAnnouncementService.getTeacherFeed.mockResolvedValueOnce(
      feed([announcement('science-only', 1)]),
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'class-2' } });

    expect(await screen.findByText('Announcement science-only')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedAnnouncementService.getTeacherFeed).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        classId: 'class-2',
      }),
    );
    expect(screen.queryByText('Announcement regular')).not.toBeInTheDocument();
  });

  it('appends and deduplicates later pages', async () => {
    mockedAnnouncementService.getTeacherFeed.mockResolvedValueOnce(
      feed([announcement('first', 0)], 1, 2),
    );
    render(<TeacherAnnouncementsPage />);
    await screen.findByText('Announcement first');

    mockedAnnouncementService.getTeacherFeed.mockResolvedValueOnce(
      feed([announcement('first', 0), announcement('second', 1)], 2, 2),
    );
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    expect(await screen.findByText('Announcement second')).toBeInTheDocument();
    expect(screen.getAllByText('Announcement first')).toHaveLength(1);
    expect(mockedAnnouncementService.getTeacherFeed).toHaveBeenLastCalledWith({
      page: 2,
      limit: 20,
    });
  });

  it('blocks protected actions without calling a mutation service', async () => {
    mockedAnnouncementService.getTeacherFeed.mockResolvedValueOnce(
      feed([
        announcement('protected', 0, {
          authorId: 'admin-1',
          canEdit: false,
          canDelete: false,
          restrictionReason: 'core_template',
        }),
      ]),
    );
    render(<TeacherAnnouncementsPage />);
    await screen.findByText('Announcement protected');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/administrator-managed/i));
    expect(mockedAnnouncementService.update).not.toHaveBeenCalled();
    expect(mockedAnnouncementService.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the announcement class ID for aggregate mutations', async () => {
    render(<TeacherAnnouncementsPage />);
    await screen.findByText('Announcement pinned');

    fireEvent.click(screen.getAllByRole('button', { name: 'Unpin' })[0]);

    await waitFor(() =>
      expect(mockedAnnouncementService.update).toHaveBeenCalledWith(
        'class-2',
        'pinned',
        { isPinned: false },
      ),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() =>
      expect(mockedAnnouncementService.delete).toHaveBeenCalledWith(
        'class-1',
        'regular',
      ),
    );
  });
});

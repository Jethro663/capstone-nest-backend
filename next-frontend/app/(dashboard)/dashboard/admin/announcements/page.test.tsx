import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminAnnouncementsPage from './page';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';

jest.mock('next/dynamic', () => {
  let call = 0;
  return () => {
    call += 1;
    if (call === 1) {
      return function MockEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
        return <textarea aria-label="Announcement content" value={value} onChange={(event) => onChange(event.target.value)} />;
      };
    }
    return function MockRenderer() {
      return null;
    };
  };
});

jest.mock('@/services/class-service', () => ({
  classService: { getAll: jest.fn() },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/components/admin/AdminPageShell', () => ({
  AdminPageShell: ({ actions, meta, children }: { actions: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode }) => <div>{actions}{meta}{children}</div>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminEmptyState: ({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) => <div><h3>{title}</h3><p>{description}</p>{action}</div>,
  AdminStatCard: () => <div>Legacy announcement stat card</div>,
}));

jest.mock('@/components/shared/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('AdminAnnouncementsPage dialog theme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (announcementService.getByClass as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('keeps the admin Create button visible in disabled and enabled states', async () => {
    (classService.getAll as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'class-1',
          subjectCode: 'MATH-7',
          subjectName: 'Mathematics',
          section: { name: 'Rizal' },
        }],
      },
    });

    render(<AdminAnnouncementsPage />);
    expect(screen.queryByText('Legacy announcement stat card')).not.toBeInTheDocument();
    expect(await screen.findByText('Classes available')).toBeInTheDocument();
    fireEvent.change(await screen.findByRole('combobox'), {
      target: { value: 'class-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'New Announcement' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveClass('admin-dialog');
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toHaveClass('admin-button-solid');
    expect(create).toBeDisabled();

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'Exam schedule' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Announcement content' }), {
      target: { value: '<p>Friday at 8 AM</p>' },
    });

    await waitFor(() => expect(create).toBeEnabled());
    expect(create).toHaveClass('admin-button-solid');
  });

  it('shows a retryable class-load error instead of zero available classes', async () => {
    (classService.getAll as jest.Mock).mockRejectedValueOnce(
      new Error('network unavailable'),
    );

    render(<AdminAnnouncementsPage />);

    expect(
      await screen.findByText('Class list unavailable'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Select a class to begin')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry class list' }),
    ).toBeInTheDocument();
  });

  it('shows a retryable announcement-load error instead of an empty bulletin', async () => {
    (classService.getAll as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'class-1',
          subjectCode: 'MATH-7',
          subjectName: 'Mathematics',
          section: { name: 'Rizal' },
        }],
      },
    });
    (announcementService.getByClass as jest.Mock).mockRejectedValueOnce(
      new Error('server unavailable'),
    );

    render(<AdminAnnouncementsPage />);
    fireEvent.change(await screen.findByRole('combobox'), {
      target: { value: 'class-1' },
    });

    expect(
      await screen.findByText('Announcements unavailable'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No announcements for this class yet'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry announcements' }),
    ).toBeInTheDocument();
  });
});

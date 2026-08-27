import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminAnnouncementsPage from './page';
import { classService } from '@/services/class-service';

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
  AdminPageShell: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => <div>{actions}{children}</div>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminEmptyState: ({ action }: { action?: React.ReactNode }) => <div>{action}</div>,
  AdminStatCard: () => null,
}));

jest.mock('@/components/shared/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('AdminAnnouncementsPage dialog theme', () => {
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
});

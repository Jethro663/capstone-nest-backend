import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { AdminPageShell, AdminStatCard } from './AdminPageShell';

describe('AdminPageShell', () => {
  it('leads with the title and keeps real actions without decorative shell chrome', () => {
    const { container } = render(
      <AdminPageShell
        title="User management"
        description="Manage active school accounts."
        actions={<button type="button">Add user</button>}
        stats={
          <AdminStatCard
            label="Active users"
            value="42"
            caption="Current accounts"
            icon={Activity}
          />
        }
      >
        <div>Account table</div>
      </AdminPageShell>,
    );

    const title = screen.getByRole('heading', { level: 1, name: 'User management' });
    const copy = container.querySelector('.admin-page-header__copy > div');

    expect(copy?.firstElementChild).toBe(title);
    expect(screen.queryByText('Admin Workspace')).not.toBeInTheDocument();
    expect(container.querySelector('.admin-page-header__icon')).not.toBeInTheDocument();
    expect(container.querySelector('.admin-stat-card__icon')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add user' })).toBeInTheDocument();
    expect(screen.getByText('Active users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

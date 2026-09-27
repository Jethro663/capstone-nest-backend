import { fireEvent, render, screen } from '@testing-library/react';
import { Activity, KeyRound } from 'lucide-react';
import {
  AdminActionCard,
  AdminPageShell,
  AdminPagination,
  AdminStatCard,
} from './AdminPageShell';

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

  it('describes the current result range and changes pages within bounds', () => {
    const onPageChange = jest.fn();

    const { rerender } = render(
      <AdminPagination
        page={1}
        totalPages={3}
        total={45}
        pageSize={20}
        itemLabel="users"
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('Showing 1–20 of 45 users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <AdminPagination
        page={3}
        totalPages={3}
        total={45}
        pageSize={20}
        itemLabel="users"
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('Showing 41–45 of 45 users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('renders an administrative action as one explanatory button', () => {
    const onClick = jest.fn();

    render(
      <AdminActionCard
        icon={KeyRound}
        title="Reset password"
        description="Generate a temporary password and notify this account."
        actionLabel="Review reset"
        onClick={onClick}
      />,
    );

    const action = screen.getByRole('button', { name: /Reset password/i });
    expect(action).toHaveTextContent('Generate a temporary password');
    expect(action).toHaveTextContent('Review reset');

    fireEvent.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

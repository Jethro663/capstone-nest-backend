'use client';

import { render, screen, waitFor } from '@testing-library/react';
import DashboardLibraryAliasPage from './page';

const replaceMock = jest.fn();
const authState = { role: 'teacher', loading: false } as { role: string | null; loading: boolean };

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => authState,
}));

describe('DashboardLibraryAliasPage', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    authState.loading = false;
    authState.role = 'teacher';
  });

  it('redirects teachers to /dashboard/teacher/library', async () => {
    render(<DashboardLibraryAliasPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/teacher/library'),
    );
  });

  it('redirects admins to /dashboard/admin/library', async () => {
    authState.role = 'admin';

    render(<DashboardLibraryAliasPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/dashboard/admin/library'),
    );
  });

  it('shows a safe fallback for non-teacher/admin roles', () => {
    authState.role = 'student';

    render(<DashboardLibraryAliasPage />);

    expect(
      screen.getByText('Nexora Library is available to teachers and admins only.'),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    role: 'student',
    user: {
      firstName: 'Liam',
      lastName: 'Navarro',
      email: 'student@example.test',
    },
  }),
}));

jest.mock('@/components/layout/StudentThemeSwitcher', () => ({
  StudentThemeSwitcher: () => <button type="button">Select theme</button>,
}));

jest.mock('./SystemInfoButton', () => ({
  SystemInfoButton: () => <button type="button">System info</button>,
}));

jest.mock('@/components/notifications/NotificationBellDropdown', () => ({
  NotificationBellDropdown: () => <button type="button">Notifications</button>,
}));

jest.mock('@/lib/auth-actions', () => ({
  logoutAction: jest.fn(),
}));

describe('TopBar', () => {
  it('exposes the theme selector only in the Student shell', () => {
    const { rerender } = render(
      <TopBar onMenuToggle={jest.fn()} shellRole="student" />,
    );

    expect(screen.getByRole('button', { name: 'Select theme' })).toBeInTheDocument();

    rerender(<TopBar onMenuToggle={jest.fn()} shellRole="teacher" />);

    expect(screen.queryByRole('button', { name: 'Select theme' })).not.toBeInTheDocument();
  });
});

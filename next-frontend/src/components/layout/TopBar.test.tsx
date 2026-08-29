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
  it.each(['student', 'teacher', 'admin'] as const)(
    'does not expose the legacy theme selector in the %s shell',
    (shellRole) => {
      render(<TopBar onMenuToggle={jest.fn()} shellRole={shellRole} />);

      expect(
        screen.queryByRole('button', { name: 'Select theme' }),
      ).not.toBeInTheDocument();
    },
  );
});

import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

const useAuthMock = jest.fn();
const usePublicSessionProbeMock = jest.fn();

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('@/hooks/usePublicSessionProbe', () => ({
  usePublicSessionProbe: () => usePublicSessionProbeMock(),
}));

describe('NotFound page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the JA-themed recovery page with sign-in recovery for anonymous users', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false });

    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('This page wandered off the map.')).toBeInTheDocument();
    expect(
      screen.getByAltText('JA looking dizzy while helping recover a missing page'),
    ).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: 'Back to sign in' });
    expect(cta).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it('shows the dashboard shortcut when the session is authenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true });

    render(<NotFound />);

    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});

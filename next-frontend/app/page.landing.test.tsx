import { render, screen } from '@testing-library/react';
import LandingPage, { metadata } from './page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
    role: null,
    refreshAuth: jest.fn(),
  }),
}));

describe('School-first public landing page', () => {
  it('leads with GABHS and keeps Nexora as a secondary destination', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /gat andres bonifacio high school/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/one lms front door/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore school life/i })).toHaveAttribute(
      'href',
      '#school-life',
    );
    expect(screen.getAllByRole('link', { name: /open nexora/i })[0]).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('presents the official direction and all four core values', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: /our direction/i })).toBeInTheDocument();
    expect(
      screen.getByText(/we dream of filipinos who passionately love their country/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/to protect and promote the right of every filipino/i),
    ).toBeInTheDocument();

    for (const value of ['Maka-Diyos', 'Maka-tao', 'Makakalikasan', 'Makabansa']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it('keeps portal and app access without stale demo or deployment copy', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', { name: /our school, connected online/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download student app/i })).toHaveAttribute(
      'href',
      '/downloads/nexora-student-mobile-release.apk',
    );
    expect(screen.queryByText(/hosted mobile api url/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /demo/i })).not.toBeInTheDocument();
  });

  it('publishes school-first page metadata', () => {
    expect(metadata.title).toBe('Gat Andres Bonifacio High School | Nexora Digital Campus');
    expect(metadata.icons).toEqual({
      icon: '/taguigpic.png',
      shortcut: '/taguigpic.png',
      apple: '/taguigpic.png',
    });
  });
});

import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

describe('NotFound page', () => {
  it('renders the JA-themed recovery page with both escape links', () => {
    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('This page wandered off the map.')).toBeInTheDocument();
    expect(
      screen.getByAltText('JA looking dizzy while helping recover a missing page'),
    ).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: 'Go to dashboard' });
    expect(cta).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });
});

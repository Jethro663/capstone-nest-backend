import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

describe('NotFound page', () => {
  it('renders 404 copy with dashboard CTA', () => {
    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Oops, this page took the wrong hallway.')).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: 'Go to dashboard' });
    expect(cta).toHaveAttribute('href', '/dashboard');
  });
});

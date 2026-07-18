import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardStatePanel } from './DashboardStatePanel';

describe('DashboardStatePanel', () => {
  it('announces errors and supports button and link actions', () => {
    const retry = jest.fn();

    render(
      <DashboardStatePanel
        kind="error"
        title="The page could not be loaded"
        description="Try again or return to the dashboard."
        primaryAction={{ label: 'Try again', onClick: retry }}
        secondaryAction={{ label: 'Return to dashboard', href: '/dashboard' }}
      />,
    );

    const panel = screen.getByRole('status');
    expect(panel).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Return to dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('announces unavailable content', () => {
    render(
      <DashboardStatePanel
        kind="unavailable"
        title="Diagnostics temporarily unavailable"
        description="Other class data is still available."
      />,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('does not announce a successful empty result as a failure', () => {
    render(
      <DashboardStatePanel
        kind="empty"
        title="No announcements yet"
        description="New posts will appear here."
      />,
    );

    const panel = screen.getByText('No announcements yet').closest('section');
    expect(panel).not.toHaveAttribute('role');
    expect(panel).not.toHaveAttribute('aria-live');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import DashboardError from './error';

describe('DashboardError', () => {
  it('uses safe fixed copy and offers retry and dashboard navigation', () => {
    const reset = jest.fn();

    render(
      <DashboardError
        error={new Error('relation student_concept_mastery does not exist')}
        reset={reset}
      />,
    );

    expect(screen.getByText("We couldn't load this page")).toBeInTheDocument();
    expect(
      screen.queryByText('relation student_concept_mastery does not exist'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Return to dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});

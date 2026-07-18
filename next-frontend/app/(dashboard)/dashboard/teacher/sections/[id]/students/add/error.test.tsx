import { fireEvent, render, screen } from '@testing-library/react';
import TeacherAddStudentsError from './error';

describe('TeacherAddStudentsError', () => {
  it('hides raw errors and offers route-safe recovery', () => {
    const reset = jest.fn();

    render(
      <TeacherAddStudentsError
        error={new Error('relation student_concept_mastery does not exist')}
        reset={reset}
      />,
    );

    expect(screen.getByText('Could not open Add Students')).toBeInTheDocument();
    expect(
      screen.queryByText('relation student_concept_mastery does not exist'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to classes' })).toHaveAttribute(
      'href',
      '/dashboard/teacher/classes',
    );
  });
});

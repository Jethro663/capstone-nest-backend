import { fireEvent, render, screen } from '@testing-library/react';
import { TableFilterSelect } from './table-filter-select';

const options = [
  { value: 'all', label: 'All classmates' },
  { value: 'with_photo', label: 'With profile photo' },
] as const;

describe('TableFilterSelect', () => {
  it.each(['student', 'teacher', 'admin'] as const)(
    'renders a themed %s filter trigger',
    (role) => {
      render(
        <TableFilterSelect
          ariaLabel="Filter classmates"
          value="all"
          onValueChange={jest.fn()}
          options={options}
          role={role}
        />,
      );

      const trigger = screen.getByRole('combobox', {
        name: 'Filter classmates',
      });
      expect(trigger).toHaveAttribute('data-filter-role', role);
      expect(trigger).toHaveClass('table-filter-select');
      expect(screen.getByTestId('table-filter-icon')).toBeInTheDocument();
    },
  );

  it('reports the selected option through onValueChange', () => {
    const onValueChange = jest.fn();
    render(
      <TableFilterSelect
        ariaLabel="Filter classmates"
        value="all"
        onValueChange={onValueChange}
        options={options}
        role="student"
      />,
    );

    fireEvent.click(
      screen.getByRole('combobox', { name: 'Filter classmates' }),
    );
    fireEvent.click(
      screen.getByRole('option', { name: 'With profile photo' }),
    );

    expect(onValueChange).toHaveBeenCalledWith('with_photo');
  });

  it('forwards disabled state to the trigger', () => {
    render(
      <TableFilterSelect
        ariaLabel="Filter classmates"
        value="all"
        onValueChange={jest.fn()}
        options={options}
        role="student"
        disabled
      />,
    );

    expect(
      screen.getByRole('combobox', { name: 'Filter classmates' }),
    ).toBeDisabled();
  });
});
